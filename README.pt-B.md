# ParoniDeck - Controle Remoto do Soundpad & Stream Deck

O ParoniDeck é um painel de controle e Stream Deck web premium e responsivo para o Soundpad. Ele permite que você execute efeitos sonoros, personalize os botões do painel e controle volumes individuais de aplicativos (como Spotify ou Google Chrome) diretamente do seu celular, tablet ou monitor secundário.

---

## 🚀 Principais Recursos

* **Design Dark Premium**: Interface elegante em tons de azul, cinza e preto com transições suaves e micro-animações, totalmente otimizada para celular e computador.
* **Controle Remoto do Soundpad**: Dê play, pause, retome ou pare a reprodução de áudios instantaneamente.
* **Painel Altamente Personalizável**: Altere o nome dos botões, escolha cores diferenciadas, selecione ícones da biblioteca integrada ou envie suas próprias imagens personalizadas.
* **Mixer de Volume com Precisão de 1%**: Controle o som de aplicativos específicos individualmente com ajustes de 1% ou 5% diretamente pelo navegador do celular.
* **Inicializador na Bandeja do Sistema (C#)**: O launcher leve `ParoniDeck.exe` gerencia o servidor Node.js em segundo plano e fica discreto na área de notificação do Windows (perto do relógio).
* **Instalação Independente**: Já vem com o ambiente Node embarcado de forma portátil, permitindo que qualquer pessoa instale e use o programa sem precisar instalar o Node.js manualmente.
* **Otimização para Dispositivos Móveis**: Suporta rotação de tela (modo deitado/em pé) e modo de tela cheia/expandido.

---

## 💻 Requisitos do Sistema

* **Sistema Operacional Windows** (7 / 8 / 10 / 11)
* **Aplicativo Soundpad** instalado e em execução no PC.
* **Rede Local Comum** (para acessar pelo celular, ambos os dispositivos devem estar conectados no mesmo Wi-Fi).

---

## 📦 Como Instalar

A maneira mais rápida e fácil de usar o ParoniDeck é através do instalador oficial.

1. **Baixe o Instalador**:
   - Baixe o arquivo **`ParoniDeck_Setup.exe`** através do **Site Oficial** ou diretamente na aba de **Releases** deste repositório do GitHub.
2. **Execute o Setup**:
   - Dê dois cliques no instalador e siga o assistente de instalação em português.
   - Você pode marcar para criar um atalho na área de trabalho e configurar para **Iniciar automaticamente com o Windows**.
3. **Inicie o Programa**:
   - Abra o **Soundpad** no seu computador.
   - Abra o aplicativo **ParoniDeck** recém-instalado. Ele rodará silenciosamente no canto inferior direito, na barra de tarefas (System Tray).
4. **Abra o Painel**:
   - Dê dois cliques no ícone do ParoniDeck na barra de tarefas para abrir o painel, ou clique com o botão direito e selecione **Abrir Dashboard**.
   - Para acessar no celular, use o navegador do celular para visitar o endereço de rede IP local que aparece no painel do seu computador (ou ao passar o mouse sobre o ícone do programa).

---

## 🛠️ Desenvolvimento & Compilação

Caso você queira modificar o código-fonte ou compilar o projeto manualmente:

1. Clone este repositório.
2. Se quiser embutir o Node, copie o executável `node.exe` da sua pasta de instalação do Node.js para a raiz deste projeto.
3. Execute o script `build.bat` no terminal para compilar o launcher `ParoniDeck.exe`.
4. Abra o script `setup.iss` no **Inno Setup Compiler** para gerar o instalador executável final.

---

## 📄 Licença

Este projeto está licenciado sob a licença MIT.
