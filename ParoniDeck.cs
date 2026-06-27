using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Windows.Forms;
using System.Text.RegularExpressions;
using System.Threading;

namespace ParoniDeckLauncher
{
    static class Program
    {
        private static Mutex mutex = null;

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            
            // Garantir que apenas uma instância do launcher esteja rodando
            bool createdNew;
            mutex = new Mutex(true, "ParoniDeckLauncherMutexUniqueName", out createdNew);

            if (!createdNew)
            {
                MessageBox.Show("O ParoniDeck já está em execução na bandeja do sistema.", "ParoniDeck", MessageBoxButtons.OK, MessageBoxIcon.Information);
                return;
            }
            
            Application.Run(new ParoniDeckContext());
            
            // Manter a referência do mutex ativa até o encerramento do app
            GC.KeepAlive(mutex);
        }
    }

    public class LogWindow : Form
    {
        private TextBox logTextBox;

        public LogWindow()
        {
            this.Text = "ParoniDeck - Logs do Servidor";
            this.Size = new Size(800, 480);
            this.MinimumSize = new Size(500, 300);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.Icon = SystemIcons.Application;

            logTextBox = new TextBox();
            logTextBox.Multiline = true;
            logTextBox.ReadOnly = true;
            logTextBox.ScrollBars = ScrollBars.Vertical;
            logTextBox.Dock = DockStyle.Fill;
            logTextBox.BackColor = Color.FromArgb(17, 24, 39); // Fundo escuro (Tailwind gray-900)
            logTextBox.ForeColor = Color.FromArgb(243, 244, 246); // Texto claro (Tailwind gray-50)
            logTextBox.Font = new Font("Consolas", 10F, FontStyle.Regular);
            logTextBox.BorderStyle = BorderStyle.None;

            this.Controls.Add(logTextBox);

            // Em vez de fechar e destruir a janela, apenas ocultamos para manter o histórico de logs
            this.FormClosing += (sender, e) => {
                if (e.CloseReason == CloseReason.UserClosing)
                {
                    e.Cancel = true;
                    this.Hide();
                }
            };
        }

        public void AppendLog(string text)
        {
            try
            {
                string logFile = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "launcher.log");
                File.AppendAllText(logFile, text);
            }
            catch {}

            if (logTextBox.InvokeRequired)
            {
                logTextBox.BeginInvoke(new Action<string>(AppendLog), text);
            }
            else
            {
                logTextBox.AppendText(text);
                
                // Limitar o buffer de texto para evitar consumo excessivo de memória (limite de ~100k caracteres)
                if (logTextBox.TextLength > 100000)
                {
                    logTextBox.Text = logTextBox.Text.Substring(50000);
                }
            }
        }
    }

    public class ParoniDeckContext : ApplicationContext
    {
        private NotifyIcon trayIcon;
        private Process nodeProcess;
        private LogWindow logWindow;
        private int port = 5000;
        private System.Windows.Forms.Timer processCheckTimer;
        private string appDir;

        public ParoniDeckContext()
        {
            appDir = AppDomain.CurrentDomain.BaseDirectory;
            Directory.SetCurrentDirectory(appDir); // Garante o diretório de trabalho correto

            try
            {
                File.WriteAllText(Path.Combine(appDir, "launcher.log"), "[INFO] Launcher iniciado as " + DateTime.Now.ToString() + Environment.NewLine);
            }
            catch {}

            // Inicializa a janela de log primeiro para podermos registrar logs de inicialização
            logWindow = new LogWindow();

            ReadPortFromConfig();

            // Configura o Ícone da Bandeja (System Tray)
            trayIcon = new NotifyIcon();
            trayIcon.Text = "ParoniDeck (Iniciando...)";
            
            // Menu de Contexto
            ContextMenuStrip contextMenu = new ContextMenuStrip();
            
            ToolStripMenuItem menuOpen = new ToolStripMenuItem("Abrir Dashboard", null, OpenDashboard);
            menuOpen.Font = new Font(menuOpen.Font, FontStyle.Bold); // Negrito para ação padrão
            
            ToolStripMenuItem menuLog = new ToolStripMenuItem("Visualizar Log (Console)", null, ShowLog);
            ToolStripMenuItem menuRestart = new ToolStripMenuItem("Reiniciar Servidor", null, RestartServer);
            ToolStripMenuItem menuExit = new ToolStripMenuItem("Sair", null, ExitApp);
            
            contextMenu.Items.Add(menuOpen);
            contextMenu.Items.Add(menuLog);
            contextMenu.Items.Add(new ToolStripSeparator());
            contextMenu.Items.Add(menuRestart);
            contextMenu.Items.Add(menuExit);
            
            trayIcon.ContextMenuStrip = contextMenu;
            
            // Ações do clique
            trayIcon.DoubleClick += OpenDashboard;
            trayIcon.Visible = true;

            // Gera e define o ícone dinâmico do ParoniDeck
            SetAppIcon();

            // Timer para verificar periodicamente se o processo do Node.js continua vivo
            processCheckTimer = new System.Windows.Forms.Timer();
            processCheckTimer.Interval = 2000;
            processCheckTimer.Tick += CheckProcessStatus;

            // Inicia o Servidor Node.js
            StartNodeServer();

            // Assina eventos de encerramento do launcher
            Application.ApplicationExit += OnApplicationExit;
            AppDomain.CurrentDomain.ProcessExit += OnApplicationExit;
        }

        private void ReadPortFromConfig()
        {
            string configPath = Path.Combine(appDir, "config.json");
            if (File.Exists(configPath))
            {
                try
                {
                    string text = File.ReadAllText(configPath);
                    Match match = Regex.Match(text, @"""port""\s*:\s*(\d+)");
                    if (match.Success)
                    {
                        port = int.Parse(match.Groups[1].Value);
                        logWindow.AppendLog("[INFO] Porta detectada no config.json: " + port + Environment.NewLine);
                    }
                }
                catch (Exception ex)
                {
                    logWindow.AppendLog("[ERRO] Falha ao ler porta do config.json: " + ex.Message + ". Usando porta padrão 5000." + Environment.NewLine);
                }
            }
            else
            {
                logWindow.AppendLog("[INFO] config.json não encontrado. Usando porta padrão 5000." + Environment.NewLine);
            }
        }

        private void SetAppIcon()
        {
            try
            {
                string iconPath = Path.Combine(appDir, "favIcon.ico");
                if (File.Exists(iconPath))
                {
                    trayIcon.Icon = new Icon(iconPath);
                    logWindow.Icon = trayIcon.Icon;
                }
                else
                {
                    trayIcon.Icon = CreateDynamicIcon();
                    logWindow.Icon = trayIcon.Icon;
                }
            }
            catch (Exception ex)
            {
                logWindow.AppendLog("[AVISO] Falha ao carregar favIcon.ico: " + ex.Message + ". Usando ícone dinâmico." + Environment.NewLine);
                try
                {
                    trayIcon.Icon = CreateDynamicIcon();
                    logWindow.Icon = trayIcon.Icon;
                }
                catch
                {
                    trayIcon.Icon = SystemIcons.Application;
                    logWindow.Icon = SystemIcons.Application;
                }
            }
        }

        private Icon CreateDynamicIcon()
        {
            using (Bitmap bmp = new Bitmap(32, 32))
            {
                using (Graphics g = Graphics.FromImage(bmp))
                {
                    g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;
                    
                    // Desenha o fundo circular escuro
                    using (Brush bgBrush = new SolidBrush(Color.FromArgb(5, 7, 10)))
                    {
                        g.FillEllipse(bgBrush, 2, 2, 28, 28);
                    }
                    
                    // Desenha a borda brilhante azul (Estilo do ParoniDeck #1e5699)
                    using (Pen borderPen = new Pen(Color.FromArgb(30, 86, 153), 3))
                    {
                        g.DrawEllipse(borderPen, 2, 2, 28, 28);
                    }

                    // Desenha 4 quadrados verdes simbolizando um controle/deck de botões (Estilo ParoniDeck #10b981)
                    using (Brush btnBrush = new SolidBrush(Color.FromArgb(16, 185, 129)))
                    {
                        g.FillRectangle(btnBrush, 8, 8, 7, 7);
                        g.FillRectangle(btnBrush, 17, 8, 7, 7);
                        g.FillRectangle(btnBrush, 8, 17, 7, 7);
                        g.FillRectangle(btnBrush, 17, 17, 7, 7);
                    }
                }
                
                IntPtr hIcon = bmp.GetHicon();
                return Icon.FromHandle(hIcon);
            }
        }

        private void StartNodeServer()
        {
            KillNodeProcess();

            logWindow.AppendLog("[INFO] Iniciando servidor Node.js (node server.js)..." + Environment.NewLine);

            string serverScript = Path.Combine(appDir, "server.js");
            if (!File.Exists(serverScript))
            {
                MessageBox.Show("Erro: O arquivo 'server.js' não foi encontrado na pasta atual: " + appDir, "Erro ParoniDeck", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ExitApp(null, null);
                return;
            }

            string localNode = Path.Combine(appDir, "node.exe");
            ProcessStartInfo startInfo = new ProcessStartInfo();
            if (File.Exists(localNode))
            {
                startInfo.FileName = localNode;
                logWindow.AppendLog("[INFO] Usando executável Node.js local (portátil)." + Environment.NewLine);
            }
            else
            {
                startInfo.FileName = "node";
                logWindow.AppendLog("[INFO] Usando executável Node.js global do sistema." + Environment.NewLine);
            }
            startInfo.Arguments = "\"" + serverScript + "\"";
            startInfo.WorkingDirectory = appDir;
            startInfo.CreateNoWindow = true;
            startInfo.UseShellExecute = false;
            startInfo.RedirectStandardOutput = true;
            startInfo.RedirectStandardError = true;

            try
            {
                nodeProcess = new Process();
                nodeProcess.StartInfo = startInfo;
                
                nodeProcess.OutputDataReceived += (sender, e) => {
                    if (e.Data != null)
                    {
                        logWindow.AppendLog(e.Data + Environment.NewLine);
                    }
                };

                nodeProcess.ErrorDataReceived += (sender, e) => {
                    if (e.Data != null)
                    {
                        logWindow.AppendLog("[ERRO] " + e.Data + Environment.NewLine);
                    }
                };

                nodeProcess.Start();

                // Inicia a leitura assíncrona da saída padrão e erros
                nodeProcess.BeginOutputReadLine();
                nodeProcess.BeginErrorReadLine();

                trayIcon.Text = "ParoniDeck (Ativo na porta " + port + ")";
                SetAppIcon();

                logWindow.AppendLog("[INFO] Processo do Node.js iniciado com PID: " + nodeProcess.Id + Environment.NewLine);
                
                if (processCheckTimer != null && !processCheckTimer.Enabled)
                {
                    processCheckTimer.Start();
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao tentar iniciar o Node.js.\n\nCertifique-se de que o Node.js está instalado e acessível no prompt de comando (PATH do sistema).\n\nDetalhes do erro: " + ex.Message, "Erro ParoniDeck", MessageBoxButtons.OK, MessageBoxIcon.Error);
                ExitApp(null, null);
            }
        }

        private void KillNodeProcess()
        {
            if (nodeProcess != null)
            {
                try
                {
                    if (!nodeProcess.HasExited)
                    {
                        logWindow.AppendLog("[INFO] Encerrando processo do Node.js (PID: " + nodeProcess.Id + ")..." + Environment.NewLine);
                        nodeProcess.Kill();
                        nodeProcess.WaitForExit(1500);
                    }
                }
                catch (Exception ex)
                {
                    logWindow.AppendLog("[AVISO] Falha ao encerrar processo Node: " + ex.Message + Environment.NewLine);
                }
                nodeProcess = null;
            }
        }

        private void OpenDashboard(object sender, EventArgs e)
        {
            // Recarrega a porta caso ela tenha sido modificada antes de abrir
            ReadPortFromConfig();
            
            try
            {
                Process.Start("http://localhost:" + port);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Erro ao abrir o navegador: " + ex.Message, "Erro", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void ShowLog(object sender, EventArgs e)
        {
            if (logWindow.Visible)
            {
                logWindow.BringToFront();
            }
            else
            {
                logWindow.Show();
            }
        }

        private void RestartServer(object sender, EventArgs e)
        {
            ReadPortFromConfig();
            StartNodeServer();
            trayIcon.ShowBalloonTip(3000, "ParoniDeck", "O servidor foi reiniciado!", ToolTipIcon.Info);
        }

        private void ExitApp(object sender, EventArgs e)
        {
            ExitAppInternal();
        }

        private void ExitAppInternal()
        {
            if (processCheckTimer != null)
            {
                processCheckTimer.Stop();
                processCheckTimer.Dispose();
            }
            KillNodeProcess();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
            }
            Application.Exit();
        }

        private void OnApplicationExit(object sender, EventArgs e)
        {
            KillNodeProcess();
        }

        private void CheckProcessStatus(object sender, EventArgs e)
        {
            if (nodeProcess == null || nodeProcess.HasExited)
            {
                processCheckTimer.Stop();
                trayIcon.Text = "ParoniDeck (Servidor parado)";
                trayIcon.Icon = SystemIcons.Warning;
                logWindow.Icon = SystemIcons.Warning;
                logWindow.AppendLog("[ERRO] O processo do Node.js parou ou falhou ao responder." + Environment.NewLine);
                
                trayIcon.ShowBalloonTip(3000, "ParoniDeck", "O servidor Node.js foi encerrado inesperadamente!", ToolTipIcon.Warning);
            }
        }
    }
}
