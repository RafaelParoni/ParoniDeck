# ParoniDeck - Soundpad Remote & Stream Deck

ParoniDeck is a premium, responsive Web-based Stream Deck and Soundpad remote control dashboard. It allows you to trigger Soundpad sound clips, customize button cards, and adjust application-specific volumes (like Spotify or Chrome) directly from your mobile phone, tablet, or secondary monitor.

---

## 🚀 Key Features

* **Beautiful Dark Design**: Stunning dark-theme layout using curated shades of blue, gray, and black, completely responsive for both mobile and desktop screens.
* **Soundpad Remote Control**: Play, pause, resume, and stop soundboard tracks instantly.
* **Customizable Deck Grid**: Dynamic grid cards where you can change names, choose from predefined Lucide icons, select distinct colors, or upload your own custom image buttons.
* **1% Granular Volume Mixer**: Fine-tune volume control for target applications (such as Spotify or Google Chrome) in increments of 1% or 5% directly from your device.
* **C# Windows Tray Launcher**: A lightweight Windows background launcher (`ParoniDeck.exe`) that hosts the backend server and sits quietly in your system tray.
* **Fully Portable & Independent**: Packs a bundled node environment so it works out-of-the-box on any computer without requiring manual Node.js installation.
* **Mobile Enhancements**: Features landscape/portrait screen rotation and full-screen expansion modes optimized for mobile devices.

---

## 💻 System Requirements

* **Windows OS** (7 / 8 / 10 / 11)
* **Soundpad Application** (running on your PC)
* **Local Network Connection** (to access the dashboard on mobile devices connected to the same Wi-Fi)

---

## 📦 How to Install

The easiest way to get ParoniDeck up and running is to use the official installer wizard.

1. **Download the Installer**: 
   - Download `ParoniDeck_Setup.exe` from our **Official Website** or from the **Releases** tab on this GitHub repository.
2. **Run Setup**:
   - Double-click the installer and follow the prompt instructions.
   - You can choose to create a desktop shortcut and configure the program to **Start automatically with Windows**.
3. **Launch the Program**:
   - Open **Soundpad** on your PC.
   - Run the installed **ParoniDeck** application. It will launch as a background process and appear in your Windows **System Tray** (near the clock).
4. **Open the Dashboard**:
   - Double-click the system tray icon to open the desktop dashboard, or right-click it and choose **Abrir Dashboard**.
   - To use it on a mobile device, visit the local address shown in the desktop dashboard (or tray tooltip) from your phone while connected to the same Wi-Fi network.

---

## 🛠️ Development & Compilation

If you wish to modify or build the project from source code:

1. Clone this repository.
2. If you want to bundle node, download the standalone `node.exe` and place it in the root folder.
3. Run `build.bat` in the terminal to compile `ParoniDeck.exe` using the C# csc compiler.
4. Open `setup.iss` inside **Inno Setup Compiler** to generate the final setup executable.

---

## 📄 License

This project is licensed under the MIT License.
