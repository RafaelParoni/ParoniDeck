@echo off
echo ==============================================
echo   Compiling ParoniDeck Launcher...
echo ==============================================

set CSC_PATH=C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe

if not exist "%CSC_PATH%" (
    set CSC_PATH=C:\Windows\Microsoft.NET\Framework\v4.0.30319\csc.exe
)

if not exist "%CSC_PATH%" (
    echo [ERROR] csc.exe compiler not found!
    echo Please ensure .NET Framework 4.0 or later is installed.
    pause
    exit /b 1
)

echo Using compiler: %CSC_PATH%
echo Compiling ParoniDeck.cs...

"%CSC_PATH%" /target:winexe /out:ParoniDeck.exe /win32icon:favIcon.ico /r:System.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.Core.dll ParoniDeck.cs

if %ERRORLEVEL% equ 0 (
    echo ==============================================
    echo   Success! ParoniDeck.exe generated.
    echo ==============================================
) else (
    echo ==============================================
    echo   [ERROR] Compilation failed.
    echo ==============================================
    pause
    exit /b %ERRORLEVEL%
)
