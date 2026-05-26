const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog } = require('electron');
const path = require('path');
const Store = require('electron-store');

const store = new Store({
  name: 'masterlms-config',
  defaults: { serverUrl: '', firstRun: true },
});

let mainWindow = null;
let splashWindow = null;
let tray = null;

const iconPath = path.join(__dirname, 'assets', process.platform === 'win32' ? 'icon.ico' : process.platform === 'darwin' ? 'icon.icns' : 'icon.png');

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

function createSetupWindow() {
  const win = new BrowserWindow({
    width: 560,
    height: 480,
    frame: false,
    resizable: false,
    center: true,
    title: 'MasterLMS - Cài đặt',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  win.loadFile(path.join(__dirname, 'setup.html'));
  return win;
}

function createMainWindow(serverUrl) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    title: 'MasterLMS',
    backgroundColor: '#0f172a',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (errorCode === -3) return; // Aborted — normal navigation
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.loadURL(serverUrl);
  return mainWindow;
}

function createTray() {
  try {
    const trayIcon = nativeImage.createFromPath(iconPath);
    tray = new Tray(trayIcon.resize({ width: 16, height: 16 }));
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Mở MasterLMS', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
      { type: 'separator' },
      { label: 'Cài đặt máy chủ...', click: () => showSetupDialog() },
      { type: 'separator' },
      { label: 'Thoát', click: () => { app.isQuiting = true; app.quit(); } },
    ]);
    tray.setToolTip('MasterLMS');
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } });
  } catch (e) {
    // tray icon might not exist during dev
  }
}

function showSetupDialog() {
  const setupWin = createSetupWindow();
  setupWin.once('closed', () => {
    const newUrl = store.get('serverUrl');
    if (mainWindow && newUrl) mainWindow.loadURL(newUrl);
  });
}

async function init() {
  createSplash();

  await new Promise(r => setTimeout(r, 1800));

  const serverUrl = store.get('serverUrl');
  const firstRun = store.get('firstRun');

  if (!serverUrl || firstRun) {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    const setupWin = createSetupWindow();
    setupWin.once('closed', () => {
      const url = store.get('serverUrl');
      if (url) {
        store.set('firstRun', false);
        createMainWindow(url);
        createTray();
      } else {
        app.quit();
      }
    });
  } else {
    createMainWindow(serverUrl);
    createTray();
  }
}

app.whenReady().then(init);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    const url = store.get('serverUrl');
    if (url) {
      createMainWindow(url);
    }
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => { app.isQuiting = true; });

// IPC handlers
ipcMain.handle('get-server-url', () => store.get('serverUrl'));
ipcMain.handle('set-server-url', (event, url) => {
  const trimmed = url.trim().replace(/\/$/, '');
  store.set('serverUrl', trimmed);
  store.set('firstRun', false);
  return trimmed;
});
ipcMain.handle('open-external', (event, url) => shell.openExternal(url));
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('window-minimize', () => { if (mainWindow) mainWindow.minimize(); });
ipcMain.handle('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
  }
});
ipcMain.handle('window-close', () => {
  if (mainWindow) mainWindow.close();
});
