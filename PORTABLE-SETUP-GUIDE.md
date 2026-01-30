# 🚀 DB Env Diff Tool - Portable Windows Application

## Quick Start (30 seconds)

1. **Download** the ZIP file: `DB-Env-Diff-Tool-Portable.zip`
2. **Extract** it to any folder
3. **Double-click** `start-app.bat` or `start-app.vbs`
4. **Browser opens automatically** → You're ready to use the tool!

---

## Installation Methods

### Method 1: Simple (Recommended) ✅
- **File**: `start-app.bat`
- **How**: Double-click the file
- **Result**: Command window shows + Browser opens automatically

### Method 2: No Command Window (Cleaner)
- **File**: `start-app.vbs` 
- **How**: Double-click the file
- **Result**: App starts silently in background

### Method 3: Advanced Users
- **File**: `start-app.ps1`
- **How**: Right-click → Run with PowerShell
- **Result**: Detailed startup messages in PowerShell window

---

## System Requirements

### Required
- ✅ **Windows 7 or later** (Windows 10/11 recommended)
- ✅ **Node.js v18+** (https://nodejs.org/)
  - Installation takes 2 minutes
  - Choose "LTS" (Long Term Support) version
  - Add to PATH during installation

### Optional
- Default browser (Chrome, Edge, Firefox, etc.)

---

## Step-by-Step Setup

### For First-Time Users:

#### Step 1: Install Node.js (if you don't have it)
```
1. Go to https://nodejs.org/
2. Click "Download LTS" 
3. Run the installer
4. Check "Add to PATH" ✓
5. Complete installation
```

#### Step 2: Extract the ZIP
```
1. Right-click DB-Env-Diff-Tool-Portable.zip
2. Extract All...
3. Choose folder location
4. Click Extract
```

#### Step 3: Launch the App
```
1. Open the extracted folder
2. Double-click "start-app.bat"
3. Wait for browser to open (5-10 seconds)
```

#### Step 4: Use the Tool
- Application opens at: `http://localhost:2214`
- Login with your credentials
- Start comparing databases!

---

## Application Features

### Core Features
- **Schema Comparison**: Compare database structures across environments
- **Data Diff**: View detailed data differences with row-by-row analysis
- **Audit Log**: Track all changes made through the tool
- **Multiple Databases**: Support for MySQL, PostgreSQL, SQLite

### Supported Databases
| Database | Status |
|----------|--------|
| MySQL/MariaDB | ✅ Full Support |
| PostgreSQL | ✅ Full Support |
| SQLite | ✅ Full Support |

---

## Common Issues & Solutions

### ❌ "Node.js is not installed"
**Solution**:
1. Download Node.js from https://nodejs.org/
2. Install with default settings
3. Restart your computer
4. Try again

### ❌ "Port 2214 is already in use"
**Solution A - Use different port**:
1. Stop the app
2. Open `start-app.bat` with Notepad
3. Change `2214` to `3000` (or another port)
4. Save and restart

**Solution B - Free the port**:
1. Open Command Prompt (Admin)
2. Run: `netstat -ano | findstr :2214`
3. Note the PID number
4. Run: `taskkill /PID [your-pid] /F`
5. Try again

### ❌ Browser doesn't open automatically
**Manual Launch**:
1. After starting the app, open your browser
2. Type: `http://localhost:2214`
3. Press Enter

### ❌ "Permission Denied" error
**Solution**:
1. Right-click Command Prompt
2. Select "Run as Administrator"
3. Navigate to app folder: `cd C:\path\to\app`
4. Run: `node .next/standalone/server.js`

### ❌ App crashes on startup
**Solution**:
1. Delete the `.next` folder
2. Delete the `node_modules` folder
3. Open Command Prompt in app directory
4. Run: `npm install`
5. Run: `npm run build`
6. Try `start-app.bat` again

---

## Advanced Configuration

### Change Default Port
**File**: `start-app.bat`
```batch
set PORT=3000
```

**File**: `start-app.ps1`
```powershell
$port = 3000
```

### Run on Startup
**Windows 10/11**:
1. Create shortcut to `start-app.bat`
2. Open Task Scheduler
3. Create Basic Task → Trigger: "At startup"
4. Action: Run the shortcut

### Custom Configuration
Edit files in `.next/standalone/` for advanced settings.

---

## File Structure

```
DB-Env-Diff-Tool-Portable/
├── start-app.bat          ← Click this to run
├── start-app.vbs          ← Alternative launcher (no window)
├── start-app.ps1          ← PowerShell version
├── README.md              ← This file
├── package.json           ← Dependencies list
├── .next/                 ← Compiled application
├── node_modules/          ← All dependencies
└── public/                ← Static assets
```

---

## Stopping the Application

### Method 1: Close Window
- Click the X button on the command window

### Method 2: Keyboard
- Press `Ctrl + C` in the command window

### Method 3: Windows Task Manager
- Press `Ctrl + Shift + Esc`
- Find "node.exe" 
- Right-click → End Task

---

## Browser Compatibility

| Browser | Status |
|---------|--------|
| Chrome | ✅ Recommended |
| Edge | ✅ Works Great |
| Firefox | ✅ Works Great |
| Safari | ⚠️ May have issues |
| Internet Explorer | ❌ Not supported |

---

## Network Configuration

### Local Network Access
To access from another computer on your network:

1. Find your computer's IP: Open Command Prompt, type `ipconfig`, find "IPv4 Address"
2. Share the URL: `http://[your-ip]:2214`
3. Other computers can access via that URL

### Port Forwarding (Advanced)
Only if you need external internet access:
1. Set up port forwarding in your router
2. Map external port to your computer's port 2214
3. Give others your public IP + port

⚠️ **Security Note**: Only expose if behind a firewall. The tool has authentication but avoid exposing on public internet without additional security.

---

## Performance Tips

### First Run Takes Longer
- First startup: 10-20 seconds
- Subsequent runs: 3-5 seconds
- This is normal!

### Optimize Performance
1. Close other applications to free RAM
2. Run on SSD for faster startup
3. Use Chrome/Edge for best performance

### Slow Database Comparisons
- Large databases: Comparison may take 30+ seconds
- This is normal for complex schemas
- Smaller datasets compare in seconds

---

## Uninstall

1. Simply delete the extracted folder
2. No registry entries or system changes
3. Optional: Uninstall Node.js if not used elsewhere

---

## Getting Help

### In the App
- Click "?" or Help menu for built-in documentation
- Check error messages carefully

### Online
- GitHub Issues: Check the project repository
- Documentation: See README.md in source project

### Logs
- Check browser console: Press `F12` in browser
- Server logs: Visible in the command window

---

## System Specifications

### Minimum Requirements
- RAM: 512 MB
- Disk Space: 150 MB (for app + node_modules)
- CPU: Any modern processor

### Recommended
- RAM: 2+ GB
- Disk Space: 200+ MB on SSD
- Windows 10/11 64-bit

---

## Updates & Versions

**Current Version**: 0.1.0  
**Release Date**: January 2026

To update:
1. Download new version
2. Extract to new folder
3. Migrate your data/configs if needed

---

## Troubleshooting Checklist

Before requesting help, verify:

- [ ] Node.js is installed (`node --version` in CMD)
- [ ] Extract folder is in C:\ or user directory (not Program Files)
- [ ] No antivirus blocking the app
- [ ] Sufficient disk space available
- [ ] Port 2214 is not used by another app
- [ ] Windows firewall allows Node.js

---

## License & Copyright

DB Env Diff Tool - Database Environment Comparison Tool  
Author: Thirumal M  
License: Check LICENSE file in source repository

---

**Last Updated**: January 2026  
**Questions?** Check the main project repository or README files.
