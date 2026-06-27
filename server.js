const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execSync, exec, spawn } = require('child_process');

const app = express();
// Aumentar o limite para permitir uploads de imagens em base64
app.use(express.json({ limit: '10mb' }));





const CONFIG_PATH = path.join(__dirname, 'config.json');
const UPLOADS_DIR = path.join(__dirname, 'static', 'uploads');

// Garantir que a pasta de uploads exista
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Servir arquivos estáticos do front-end
app.use('/static', express.static(path.join(__dirname, 'static')));

function getPowerShellPath() {
    const sysnative = path.join(process.env.WINDIR || 'C:\\Windows', 'sysnative', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    if (fs.existsSync(sysnative)) {
        return sysnative;
    }
    return 'powershell';
}

function loadConfig() {
    if (fs.existsSync(CONFIG_PATH)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));


            return config;
        } catch (e) {
            console.error('Erro ao ler config.json:', e.message);
        }
    }
    return { 
        soundpad_path: "", 
        port: 5000, 
        sounds: [] 
    };
}

function saveConfig(config) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
        return true;
    } catch (e) {
        console.error('Erro ao salvar config.json:', e.message);
        return false;
    }
}

function getLocalIp() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return '127.0.0.1';
}

function detectSoundpadPath() {
    const config = loadConfig();
    
    // 1. Caminho manual no config.json
    if (config.soundpad_path && fs.existsSync(config.soundpad_path)) {
        return config.soundpad_path;
    }

    // 2. Tentar buscar no Registro do Windows (reg query)
    const regKeys = [
        'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 629520',
        'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Steam App 629520',
        'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Soundpad',
        'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Soundpad'
    ];

    for (const key of regKeys) {
        try {
            const output = execSync(`reg query "${key}" /v InstallLocation`, { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
            const match = output.match(/InstallLocation\s+REG_SZ\s+(.+)/);
            if (match && match[1]) {
                const installDir = match[1].trim();
                const exePath = path.join(installDir, 'Soundpad.exe');
                if (fs.existsSync(exePath)) {
                    return exePath;
                }
            }
        } catch (e) {
            // Ignorar chaves não encontradas
        }
    }

    // 3. Tentar descobrir o caminho da Steam e depois a pasta do Soundpad
    try {
        const output = execSync('reg query "HKCU\\SOFTWARE\\Valve\\Steam" /v SteamPath', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
        const match = output.match(/SteamPath\s+REG_SZ\s+(.+)/);
        if (match && match[1]) {
            const steamDir = match[1].trim().replace(/\//g, '\\');
            const exePath = path.join(steamDir, 'steamapps', 'common', 'Soundpad', 'Soundpad.exe');
            if (fs.existsSync(exePath)) {
                return exePath;
            }
        }
    } catch (e) {}

    // 4. Fallbacks comuns em caminhos padrão
    const defaultPaths = [
        'C:\\Program Files\\Soundpad\\Soundpad.exe',
        'C:\\Program Files (x86)\\Steam\\steamapps\\common\\Soundpad\\Soundpad.exe',
        'C:\\Program Files\\Steam\\steamapps\\common\\Soundpad\\Soundpad.exe',
        'D:\\Steam\\steamapps\\common\\Soundpad\\Soundpad.exe',
        'E:\\Steam\\steamapps\\common\\Soundpad\\Soundpad.exe'
    ];

    for (const p of defaultPaths) {
        if (fs.existsSync(p)) {
            return p;
        }
    }

    return null;
}

function isSoundpadRunning() {
    try {
        const output = execSync('tasklist /FI "IMAGENAME eq Soundpad.exe" /NH', { stdio: ['pipe', 'pipe', 'ignore'] }).toString();
        return output.includes('Soundpad.exe');
    } catch (e) {
        return false;
    }
}

function getSoundpadCategories() {
    const appData = process.env.APPDATA;
    if (!appData) return [];
    const splPath = path.join(appData, 'Leppsoft', 'soundlist.spl');
    if (!fs.existsSync(splPath)) {
        return [];
    }
    try {
        const content = fs.readFileSync(splPath, 'utf8');
        const categories = [];
        let index = 1;
        
        const categoryBlockRegex = /<Category([^>]*?)(?:\/>|>([\s\S]*?)<\/Category>)/g;
        
        let match;
        while ((match = categoryBlockRegex.exec(content)) !== null) {
            const attrsStr = match[1];
            const innerContent = match[2] || "";
            
            const nameMatch = attrsStr.match(/name="([^"]+)"/);
            const hiddenMatch = attrsStr.match(/hidden="([^"]+)"/);
            const typeMatch = attrsStr.match(/type="([^"]+)"/);
            
            const name = nameMatch ? nameMatch[1] : null;
            const hidden = hiddenMatch ? hiddenMatch[1] === 'true' : false;
            const type = typeMatch ? typeMatch[1] : null;
            
            const soundCount = (innerContent.match(/<Sound\s+/g) || []).length;
            
            if (!hidden && name) {
                categories.push({
                    index: index,
                    name: name,
                    count: soundCount
                });
            }
            index++;
        }
        return categories;
    } catch (e) {
        console.error('Erro ao ler categorias do Soundpad:', e.message);
        return [];
    }
}



function sendDiscordHotkey(action) {
    let keys = [];
    if (action === 'toggle-mute') {
        keys = [0x7C]; // F13
    } else if (action === 'toggle-deafen') {
        keys = [0x7D]; // F14
    } else {
        return Promise.resolve({ success: false, error: 'Ação do Discord inválida.' });
    }

    return new Promise((resolve) => {
        const psScript = `
$definition = @'
[DllImport("user32.dll")]
public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
[DllImport("user32.dll")]
public static extern uint MapVirtualKey(uint uCode, uint uMapType);
'@
$type = Add-Type -MemberDefinition $definition -Name "Keyboard" -Namespace "Win32" -PassThru

# Map keys to scan codes
${keys.map((k, idx) => `$vk_${idx} = ${k}; $scan_${idx} = $type::MapVirtualKey($vk_${idx}, 0)`).join('\n')}

# Press Keys Down with small delay
${keys.map((k, idx) => `$type::keybd_event($vk_${idx}, $scan_${idx}, 0, 0); [System.Threading.Thread]::Sleep(25)`).join('\n')}

# Hold for a moment
[System.Threading.Thread]::Sleep(50)

# Release Keys Up (reverse order) with small delay
${keys.map((k, idx) => idx).reverse().map(idx => `$type::keybd_event($vk_${idx}, $scan_${idx}, 2, 0); [System.Threading.Thread]::Sleep(25)`).join('\n')}
`;
        
        const child = spawn(getPowerShellPath(), ['-NoProfile', '-Command', psScript]);
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                resolve({ success: false, error: `Falha ao simular teclas. Código de saída do PowerShell: ${code}` });
            }
        });
    });
}

function sendSingleKey(keyCode) {
    return new Promise((resolve) => {
        const psScript = `
$definition = @'
[DllImport("user32.dll")]
public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, uint dwExtraInfo);
[DllImport("user32.dll")]
public static extern uint MapVirtualKey(uint uCode, uint uMapType);
'@
$type = Add-Type -MemberDefinition $definition -Name "Keyboard" -Namespace "Win32" -PassThru

$vk = ${keyCode}
$scan = $type::MapVirtualKey($vk, 0)

$type::keybd_event($vk, $scan, 0, 0)
[System.Threading.Thread]::Sleep(50)
$type::keybd_event($vk, $scan, 2, 0)
`;
        
        const child = spawn(getPowerShellPath(), ['-NoProfile', '-Command', psScript]);
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                resolve({ success: false, error: `Falha ao simular tecla. Código de saída do PowerShell: ${code}` });
            }
        });
    });
}

function sendAppCommand(processName, command) {
    return new Promise((resolve) => {
        const cleanProcessName = processName.replace(/\.exe$/i, '');
        
        let cmdValue;
        if (command === 'Media_Play_Pause') {
            cmdValue = 917504; // 14 << 16
        } else if (command === 'Media_Next') {
            cmdValue = 720896; // 11 << 16
        } else if (command === 'Media_Prev') {
            cmdValue = 786432; // 12 << 16
        } else {
            return resolve({ success: false, error: 'Comando de mídia inválido.' });
        }

        const psScript = `
$sig = @"
[DllImport("user32.dll")]
public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);
"@
$win32 = Add-Type -MemberDefinition $sig -Name "Win32App" -Namespace "Win32App" -PassThru

$WM_APPCOMMAND = 0x0319
$processes = Get-Process "${cleanProcessName}" -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowHandle -ne 0 }
$p = $processes | Where-Object { $_.MainWindowTitle -ne "" } | Select-Object -First 1
if (-not $p) {
    $p = $processes | Select-Object -First 1
}

if ($p) {
    $win32::PostMessage($p.MainWindowHandle, $WM_APPCOMMAND, [IntPtr]::Zero, [IntPtr]${cmdValue})
    Write-Output "Comando enviado para o processo da janela: $($p.ProcessName) (PID: $($p.Id))"
} else {
    Write-Error "Nenhum processo com janela encontrado para: ${cleanProcessName}."
}
`;
        
        const child = spawn(getPowerShellPath(), ['-NoProfile', '-Command', psScript]);
        let errorMsg = '';
        child.stderr.on('data', (data) => {
            errorMsg += data.toString();
        });
        child.on('close', (code) => {
            if (code === 0) {
                resolve({ success: true });
            } else {
                resolve({ success: false, error: errorMsg.trim() || `PowerShell exited with code ${code}` });
            }
        });
    });
}

function adjustAppVolume(processName, action, step = 0.05) {
    return new Promise((resolve) => {
        const cleanProcessName = processName.replace(/\.exe$/i, '');
        
        const psScript = `
if (-not ([System.Management.Automation.PSTypeName]"AudioVolumeControl.ProcessVolumeManager").Type) {
    Add-Type -TypeDefinition @"
    using System;
    using System.Runtime.InteropServices;

    namespace AudioVolumeControl
    {
        [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
        [ComImport]
        internal class MMDeviceEnumerator {}

        [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IMMDeviceEnumerator
        {
            [PreserveSig] int EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
            [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice ppDevice);
        }

        [Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IMMDevice
        {
            [PreserveSig] int Activate(ref Guid iid, int dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
        }

        [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IAudioSessionManager2
        {
            int dummy1();
            int dummy2();
            [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
        }

        [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IAudioSessionEnumerator
        {
            [PreserveSig] int GetCount(out int SessionCount);
            [PreserveSig] int GetSession(int SessionCount, out IAudioSessionControl Session);
        }

        [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IAudioSessionControl
        {
            int GetState(out int pRetVal);
            int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
            int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
            int GetGroupingParam(out Guid pRetVal);
            int SetGroupingParam(ref Guid Override, ref Guid EventContext);
            int RegisterAudioSessionNotification(IntPtr Client);
            int UnregisterAudioSessionNotification(IntPtr Client);
        }

        [Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface IAudioSessionControl2
        {
            [PreserveSig] int GetState(out int pRetVal);
            [PreserveSig] int GetDisplayName([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
            [PreserveSig] int GetIconPath([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
            [PreserveSig] int GetGroupingParam(out Guid pRetVal);
            [PreserveSig] int SetGroupingParam(ref Guid Override, ref Guid EventContext);
            [PreserveSig] int RegisterAudioSessionNotification(IntPtr Client);
            [PreserveSig] int UnregisterAudioSessionNotification(IntPtr Client);
            [PreserveSig] int GetSessionIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int GetSessionInstanceIdentifier([MarshalAs(UnmanagedType.LPWStr)] out string pRetVal);
            [PreserveSig] int GetProcessId(out uint pRetVal);
            [PreserveSig] int IsSystemSoundsSession();
            [PreserveSig] int SetDuckingPreference(bool optOut);
        }

        [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
        internal interface ISimpleAudioVolume
        {
            [PreserveSig] int SetMasterVolume(float fLevel, ref Guid EventContext);
            [PreserveSig] int GetMasterVolume(out float pfLevel);
            [PreserveSig] int SetMute(bool bMute, ref Guid EventContext);
            [PreserveSig] int GetMute(out bool pbMute);
        }

        public class ProcessVolumeManager
        {
            public static float AdjustVolume(string processName, string action, float step = 0.05f)
            {
                string targetName = processName.ToLower();
                float finalVolume = -1f;

                try
                {
                    IMMDeviceEnumerator deviceEnumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
                    IMMDevice speakers;
                    int hr = deviceEnumerator.GetDefaultAudioEndpoint(0, 1, out speakers);
                    if (hr != 0) return -2f;

                    Guid iidIAudioSessionManager2 = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");
                    object sessionManagerObj;
                    hr = speakers.Activate(ref iidIAudioSessionManager2, 1, IntPtr.Zero, out sessionManagerObj);
                    if (hr != 0) return -3f;

                    IAudioSessionManager2 sessionManager = (IAudioSessionManager2)sessionManagerObj;
                    IAudioSessionEnumerator sessionEnum;
                    hr = sessionManager.GetSessionEnumerator(out sessionEnum);
                    if (hr != 0) return -4f;

                    int sessionCount;
                    hr = sessionEnum.GetCount(out sessionCount);
                    if (hr != 0) return -5f;

                    Guid emptyGuid = Guid.Empty;

                    for (int i = 0; i < sessionCount; i++)
                    {
                        IAudioSessionControl sessionCtrl;
                        hr = sessionEnum.GetSession(i, out sessionCtrl);
                        if (hr != 0) continue;

                        IAudioSessionControl2 sessionCtrl2 = sessionCtrl as IAudioSessionControl2;
                        if (sessionCtrl2 == null) continue;

                        uint pid;
                        hr = sessionCtrl2.GetProcessId(out pid);
                        if (hr != 0 || pid == 0) continue;

                        string name = "";
                        try
                        {
                            using (var p = System.Diagnostics.Process.GetProcessById((int)pid))
                            {
                                name = p.ProcessName.ToLower();
                            }
                        }
                        catch { continue; }

                        if (name == targetName)
                        {
                            ISimpleAudioVolume simpleVolume = sessionCtrl as ISimpleAudioVolume;
                            if (simpleVolume == null) continue;

                            float currentVol;
                            hr = simpleVolume.GetMasterVolume(out currentVol);
                            if (hr != 0) continue;

                            bool currentMute;
                            hr = simpleVolume.GetMute(out currentMute);
                            if (hr != 0) continue;

                            if (action == "volume_up")
                            {
                                float newVol = Math.Min(1.0f, currentVol + step);
                                hr = simpleVolume.SetMasterVolume(newVol, ref emptyGuid);
                                if (hr == 0) finalVolume = newVol;
                            }
                            else if (action == "volume_down")
                            {
                                float newVol = Math.Max(0.0f, currentVol - step);
                                hr = simpleVolume.SetMasterVolume(newVol, ref emptyGuid);
                                if (hr == 0) finalVolume = newVol;
                            }
                            else if (action == "mute")
                            {
                                bool newMute = !currentMute;
                                hr = simpleVolume.SetMute(newMute, ref emptyGuid);
                                if (hr == 0) finalVolume = newMute ? 0f : 1f;
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Console.Error.WriteLine(ex.ToString());
                    return -9f;
                }

                return finalVolume;
            }
        }
    }
"@
}

$res = [AudioVolumeControl.ProcessVolumeManager]::AdjustVolume("${cleanProcessName}", "${action}", ${step})
Write-Output "RESULT:$res"
`;

        const child = spawn(getPowerShellPath(), ['-NoProfile', '-Command', psScript]);
        let output = '';
        let errorMsg = '';
        child.stdout.on('data', (data) => {
            output += data.toString();
        });
        child.stderr.on('data', (data) => {
            errorMsg += data.toString();
        });
        child.on('close', (code) => {
            if (code === 0) {
                const match = output.match(/RESULT:(-?\d+(?:\.\d+)?)/);
                if (match) {
                    const resCode = parseFloat(match[1]);
                    if (resCode >= 0) {
                        resolve({ success: true, volume: resCode });
                    } else {
                        resolve({ success: false, error: `Erro no Mixer (${resCode}): ${errorMsg.trim() || 'Verifique se o aplicativo está rodando e reproduzindo som.'}` });
                    }
                } else {
                    resolve({ success: false, error: 'Erro ao interpretar resposta do PowerShell.' });
                }
            } else {
                resolve({ success: false, error: errorMsg.trim() || `PowerShell finalizado com código ${code}` });
            }
        });
    });
}

function openLink(url) {
    return new Promise((resolve) => {
        if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) {
            return resolve({ success: false, error: 'A URL deve começar com http:// ou https://' });
        }
        
        const escapedUrl = url.replace(/"/g, '');
        
        exec(`start "" "${escapedUrl}"`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro ao abrir URL (${url}):`, error.message);
                return resolve({ success: false, error: error.message });
            }
            resolve({ success: true });
        });
    });
}

function runSoundpadCommand(command) {
    return new Promise((resolve) => {
        const soundpadPath = detectSoundpadPath();
        if (!soundpadPath) {
            return resolve({ success: false, message: 'Executável do Soundpad não encontrado.' });
        }

        if (!isSoundpadRunning()) {
            try {
                const child = spawn(soundpadPath, [], {
                    detached: true,
                    stdio: 'ignore'
                });
                child.unref();
                return resolve({ success: false, message: 'O Soundpad estava fechado. Tentando abrir... Tente novamente em 2 segundos.' });
            } catch (err) {
                return resolve({ success: false, message: `Soundpad fechado e falhou ao iniciar: ${err.message}` });
            }
        }

        exec(`"${soundpadPath}" -rc ${command}`, (error, stdout, stderr) => {
            if (error) {
                console.error(`Erro ao rodar comando (${command}):`, error.message);
                return resolve({ success: false, message: `Erro ao enviar comando: ${stderr || error.message}` });
            }
            resolve({ success: true, message: 'Comando enviado com sucesso.' });
        });
    });
}

// Rota principal (Front-end)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'templates', 'index.html'));
});

// Favicon do Site
app.get(['/favicon.ico', '/favIcon.ico'], (req, res) => {
    res.sendFile(path.join(__dirname, 'favIcon.ico'));
});

// Endpoint de Status do Servidor
app.get('/api/status', (req, res) => {
    const config = loadConfig();
    const soundpadPath = detectSoundpadPath();
    const running = isSoundpadRunning();
    const categories = getSoundpadCategories();



    res.json({
        soundpad_found: soundpadPath !== null,
        soundpad_running: running,
        soundpad_path: soundpadPath || 'Não encontrado',
        sounds: config.sounds || [],
        categories: categories,


        server_ip: getLocalIp(),
        server_port: config.port || 5000
    });
});

// Endpoint central para acionar qualquer tipo de botão
app.post('/api/trigger-action', async (req, res) => {
    await handleTriggerAction(req, res);
});

// Endpoint para Tocar Som (retrocompatibilidade)
app.post('/api/play-sound', async (req, res) => {
    req.body.type = 'soundpad';
    await handleTriggerAction(req, res);
});

// Endpoint para salvar Configurações Globais
app.post('/api/save-global-settings', (req, res) => {
    const { port } = req.body;
    
    if (!port || isNaN(parseInt(port))) {
        return res.status(400).json({ success: false, error: 'Porta do servidor inválida.' });
    }

    const config = loadConfig();
    config.port = parseInt(port);

    if (saveConfig(config)) {
        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } else {
        res.status(500).json({ success: false, error: 'Falha ao salvar o arquivo no disco.' });
    }
});

// Função interna para tratar a execução das ações dos botões
async function handleTriggerAction(req, res) {
    const action = req.body;
    const type = action.type || 'soundpad';

    try {
        if (type === 'soundpad') {
            const { id, category } = action;
            if (id === undefined) {
                return res.status(400).json({ success: false, error: 'ID do som não fornecido.' });
            }

            let categoryIndex = null;
            if (category !== undefined && category !== null) {
                if (typeof category === 'string' && category.trim() !== '') {
                    const categories = getSoundpadCategories();
                    const foundCat = categories.find(c => c.name.toLowerCase() === category.toLowerCase());
                    if (foundCat) {
                        categoryIndex = foundCat.index;
                    }
                } else if (typeof category === 'number') {
                    categoryIndex = category;
                }
            }

            let command = `DoPlaySound(${id})`;
            if (categoryIndex !== null && categoryIndex > 0) {
                command = `DoPlaySoundFromCategory(${categoryIndex},${id})`;
            }

            const result = await runSoundpadCommand(command);
            if (result.success) {
                return res.json(result);
            } else {
                return res.status(500).json(result);
            }
        } 
 
        else if (type === 'link') {
            const { linkUrl } = action;
            if (!linkUrl) {
                return res.status(400).json({ success: false, error: 'URL do link não fornecida.' });
            }
            const result = await openLink(linkUrl);
            if (result.success) {
                return res.json({ success: true });
            } else {
                return res.status(500).json(result);
            }
        } 
        else if (type === 'discord') {
            const { discordAction } = action;
            if (!discordAction) {
                return res.status(400).json({ success: false, error: 'Ação do Discord não fornecida.' });
            }
            const result = await sendDiscordHotkey(discordAction);
            if (result.success) {
                return res.json({ success: true });
            } else {
                return res.status(500).json(result);
            }
        } 
        else if (type === 'key') {
            const { keyCode } = action;
            if (keyCode === undefined) {
                return res.status(400).json({ success: false, error: 'Tecla não fornecida.' });
            }
            const result = await sendSingleKey(parseInt(keyCode));
            if (result.success) {
                return res.json({ success: true });
            } else {
                return res.status(500).json(result);
            }
        }
        else if (type === 'media_control') {
            const { mediaAction, mediaTarget } = action;
            if (!mediaAction) {
                return res.status(400).json({ success: false, error: 'Ação de mídia não fornecida.' });
            }

            const targetApp = mediaTarget || 'global';

            if (targetApp === 'global') {
                let keyCode;
                if (mediaAction === 'Media_Play_Pause') {
                    keyCode = 179; // 0xB3
                } else if (mediaAction === 'Media_Next') {
                    keyCode = 176; // 0xB0
                } else if (mediaAction === 'Media_Prev') {
                    keyCode = 177; // 0xB1
                } else if (mediaAction === 'volume_up' || mediaAction === 'volume_up_1') {
                    keyCode = 175; // 0xAF (Volume Up)
                } else if (mediaAction === 'volume_down' || mediaAction === 'volume_down_1') {
                    keyCode = 174; // 0xAE (Volume Down)
                } else if (mediaAction === 'mute') {
                    keyCode = 173; // 0xAD (Volume Mute)
                } else {
                    return res.status(400).json({ success: false, error: 'Ação de mídia inválida.' });
                }

                const result = await sendSingleKey(keyCode);
                if (result.success) {
                    return res.json({ success: true });
                } else {
                    return res.status(500).json(result);
                }
            } else {
                if (['volume_up', 'volume_down', 'volume_up_1', 'volume_down_1', 'mute'].includes(mediaAction)) {
                    let actionCmd = mediaAction;
                    let step = 0.05;
                    if (mediaAction === 'volume_up_1') {
                        actionCmd = 'volume_up';
                        step = 0.01;
                    } else if (mediaAction === 'volume_down_1') {
                        actionCmd = 'volume_down';
                        step = 0.01;
                    }
                    const result = await adjustAppVolume(targetApp, actionCmd, step);
                    if (result.success) {
                        return res.json(result);
                    } else {
                        return res.status(500).json(result);
                    }
                } else {
                    const result = await sendAppCommand(targetApp, mediaAction);
                    if (result.success) {
                        return res.json({ success: true });
                    } else {
                        return res.status(500).json(result);
                    }
                }
            }
        }
        else {
            return res.status(400).json({ success: false, error: 'Tipo de ação desconhecido.' });
        }
    } catch (err) {
        console.error('Erro ao executar ação:', err.message);
        return res.status(500).json({ success: false, error: err.message });
    }
}

// Endpoint para Controles Globais (Parar, Pausar, etc.)
app.post('/api/control', async (req, res) => {
    const { action } = req.body;
    
    const commands = {
        "stop": "DoStopSound()",
        "toggle-pause": "DoTogglePause()",
        "next": "DoPlayNextSound()",
        "prev": "DoPlayPreviousSound()"
    };

    if (!commands[action]) {
        return res.status(400).json({ success: false, error: 'Ação inválida.' });
    }

    const result = await runSoundpadCommand(commands[action]);
    if (result.success) {
        res.json(result);
    } else {
        res.status(500).json(result);
    }
});

// Endpoint para Salvar Configuração de Botões (Editados no PC)
app.post('/api/save-config', (req, res) => {
    const { sounds } = req.body;
    if (!sounds || !Array.isArray(sounds)) {
        return res.status(400).json({ success: false, error: 'Lista de sons inválida.' });
    }

    const config = loadConfig();
    config.sounds = sounds;

    if (saveConfig(config)) {
        res.json({ success: true, message: 'Configurações salvas com sucesso!' });
    } else {
        res.status(500).json({ success: false, error: 'Falha ao gravar arquivo no disco.' });
    }
});

// Endpoint para Upload de Imagens Customizadas dos Botões
app.post('/api/upload-image', (req, res) => {
    const { filename, data } = req.body;
    if (!filename || !data) {
        return res.status(400).json({ success: false, error: 'Dados ou nome de arquivo ausentes.' });
    }

    // Extrair o formato base64 limpo (sem o prefixo data:image/png;base64,)
    const matches = data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
        return res.status(400).json({ success: false, error: 'Formato de base64 inválido.' });
    }

    const base64Data = matches[2];
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Gerar um nome único com timestamp para evitar caching e colisões
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueName = `${Date.now()}_${cleanFilename}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);

    try {
        fs.writeFileSync(filePath, buffer);
        const relativeUrl = `/static/uploads/${uniqueName}`;
        res.json({ success: true, url: relativeUrl });
    } catch (e) {
        console.error('Erro ao salvar imagem de upload:', e.message);
        res.status(500).json({ success: false, error: `Erro ao salvar imagem: ${e.message}` });
    }
});



// ========================================================================
// INICIALIZAÇÃO DO SERVIDOR
// ========================================================================
const config = loadConfig();
const port = config.port || 5000;
const localIp = getLocalIp();



app.listen(port, '0.0.0.0', () => {
    console.log('\n' + '='.repeat(50));
    console.log('      PARONIDECK - SERVIDOR INICIADO (NODE.JS)');
    console.log(`      Acesse no seu PC: http://localhost:${port}`);
    console.log(`      Acesse no seu Celular: http://${localIp}:${port}`);
    console.log('='.repeat(50) + '\n');
});
