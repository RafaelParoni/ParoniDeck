; Script gerado para criação do instalador do ParoniDeck usando o Inno Setup.
; Para gerar o instalador (setup.exe):
; 1. Baixe e instale o Inno Setup (https://jrsoftware.org/isdl.php)
; 2. Abra este arquivo (setup.iss) no Inno Setup Compiler.
; 3. Certifique-se de compilar o executável (build.bat) antes.
; 4. Clique em "Compile" no Inno Setup para gerar o instalador.

#define MyAppName "ParoniDeck"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Paroni"
#define MyAppExeName "ParoniDeck.exe"
#define MyAppIconName "favIcon.ico"

[Setup]
; O AppId abaixo identifica exclusivamente esta aplicação. Não use o mesmo GUID em outros instaladores!
AppId={{E67B1028-569A-464C-A2C3-5A546CCAD92E}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\{#MyAppName}
DisableProgramGroupPage=yes
; Onde salvar o instalador gerado (.exe)
OutputDir=.
OutputBaseFilename=ParoniDeck_Setup
SetupIconFile={#MyAppIconName}
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "startupicon"; Description: "Iniciar automaticamente com o Windows"; GroupDescription: "Configurações Adicionais:"

[Files]
; Executável Principal do Launcher
Source: "ParoniDeck.exe"; DestDir: "{app}"; Flags: ignoreversion
; Executável Portátil do Node.js
Source: "node.exe"; DestDir: "{app}"; Flags: ignoreversion skipifsourcedoesntexist
; favIcon do Site e Launcher
Source: "favIcon.ico"; DestDir: "{app}"; Flags: ignoreversion
; Configuração (NÃO sobrescreve em caso de reinstalação/atualização para preservar botões do usuário)
Source: "config.json"; DestDir: "{app}"; Flags: ignoreversion onlyifdoesntexist
; Servidor Backend Node.js
Source: "server.js"; DestDir: "{app}"; Flags: ignoreversion
; Pastas de Recursos Estáticos, Templates HTML e Dependências
Source: "static\*"; DestDir: "{app}\static"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "templates\*"; DestDir: "{app}\templates"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "node_modules\*"; DestDir: "{app}\node_modules"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
; Atalho no Menu Iniciar
Name: "{autoprograms}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\{#MyAppIconName}"
; Atalho na Área de Trabalho
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; IconFilename: "{app}\{#MyAppIconName}"
; Atalho para iniciar junto com o Windows
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon; IconFilename: "{app}\{#MyAppIconName}"

[Run]
; Opção para iniciar o aplicativo imediatamente após fechar o instalador
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
