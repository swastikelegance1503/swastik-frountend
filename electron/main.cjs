const { app, BrowserWindow, ipcMain, shell, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;

// Single instance lock (prevent opening multiple instances)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function getAppIcon() {
  const iconPath = path.join(__dirname, '../public/icon.png');
  const icoPath = path.join(__dirname, '../public/images/favicon.ico');
  const pngPath = path.join(__dirname, '../public/swastik-logo.png');

  if (fs.existsSync(iconPath)) {
    return iconPath;
  }
  if (process.platform === 'win32' && fs.existsSync(icoPath)) {
    return icoPath;
  }
  if (fs.existsSync(pngPath)) {
    return pngPath;
  }
  return undefined;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 680,
    title: 'Swastik Art - ચલાણ & બિલિંગ સોફ્ટવેર',
    icon: getAppIcon(),
    backgroundColor: '#ffffff',
    show: false, // Show once ready-to-show to prevent flash of white
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: true
    }
  });

  // Native application menu
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  const menuTemplate = [
    {
      label: 'ફાઇલ (File)',
      submenu: [
        {
          label: 'રીલોડ (Reload)',
          accelerator: 'CmdOrCtrl+R',
          click: () => mainWindow && mainWindow.reload()
        },
        { type: 'separator' },
        {
          label: 'બહાર નીકળો (Exit)',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'વ્યૂ (View)',
      submenu: [
        {
          label: 'ઝૂમ ઇન (Zoom In)',
          role: 'zoomIn'
        },
        {
          label: 'ઝૂમ આઉટ (Zoom Out)',
          role: 'zoomOut'
        },
        {
          label: 'સામાન્ય કદ (Reset Zoom)',
          role: 'resetZoom'
        },
        { type: 'separator' },
        {
          label: 'પૂર્ણ સ્ક્રીન (Full Screen)',
          role: 'togglefullscreen'
        },
        ...(isDev ? [
          { type: 'separator' },
          {
            label: 'ડેવલપર ટૂલ્સ (Developer Tools)',
            accelerator: 'F12',
            click: () => mainWindow && mainWindow.webContents.toggleDevTools()
          }
        ] : [])
      ]
    },
    {
      label: 'મદદ (Help)',
      submenu: [
        {
          label: 'Swastik Art વિશે (About)',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Swastik Art Desktop Application',
              message: 'Swastik Art & Astha Fashion',
              detail: 'ઓટોમેટેડ ચલાણ, બિલિંગ, પ્રિન્ટિંગ અને ગૂગલ ડ્રાઇવ બેકઅપ સોફ્ટવેર v1.0.0\nતમામ હકો અનામત © 2026'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  // Once ready, show window smoothly
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Handle external links safely (Google Drive, Sheets, Web links)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // If it's a web/drive/sheet link, open in the user's default browser
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  // Determine whether to load dev server or built production files
  const devUrl = process.env.ELECTRON_DEV_URL || 'http://localhost:5173';

  if (isDev && process.env.ELECTRON_START_URL) {
    mainWindow.loadURL(process.env.ELECTRON_START_URL);
  } else if (isDev && !fs.existsSync(path.join(__dirname, '../dist/index.html'))) {
    mainWindow.loadURL(devUrl);
  } else {
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ----------------------------------------------------------------------
// IPC Handlers
// ----------------------------------------------------------------------

ipcMain.handle('app:version', () => app.getVersion());

ipcMain.handle('drive:delete-challan', async (event, { webhookUrl, billNo, firmName, fileName }) => {
  const url = webhookUrl || 'https://script.google.com/macros/s/AKfycbzY7U2udadIQM-p-DsJ2F5HC4olnbR_ZQLPaxleLuZsA6LqebhXV-IA8EYfL_f0qVAD/exec';
  try {
    const response = await fetch(url.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'DELETE_CHALLAN',
        billNo: String(billNo || ''),
        firmName: String(firmName || ''),
        fileName: fileName || ''
      }),
      redirect: 'follow'
    });
    const text = await response.text();
    let result = {};
    try {
      result = JSON.parse(text);
    } catch {
      result = { raw: text };
    }
    return { success: true, ...result };
  } catch (err) {
    console.error('IPC drive delete error:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:open-external', async (event, url) => {
  if (url && (url.startsWith('http:') || url.startsWith('https:'))) {
    await shell.openExternal(url);
    return true;
  }
  return false;
});

ipcMain.handle('app:get-printers', async () => {
  if (!mainWindow) return [];
  return await mainWindow.webContents.getPrintersAsync();
});

ipcMain.handle('app:print', async (event, options = {}) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  try {
    return new Promise((resolve) => {
      mainWindow.webContents.print(
        {
          silent: Boolean(options.silent),
          printBackground: true,
          deviceName: options.deviceName || '',
          ...options
        },
        (success, failureReason) => {
          resolve({ success, failureReason });
        }
      );
    });
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// App Lifecycle
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
