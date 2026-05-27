const { app, BrowserWindow, ipcMain, shell, Tray, Menu, nativeImage, dialog, globalShortcut } = require('electron');
const path = require('path');
const Store = require('electron-store');

// Register server URL + common local addresses as secure origins (for mic / MediaRecorder)
const _earlyStore = new Store({ name: 'masterlms-config', defaults: { serverUrl: '' } });
const _savedUrl = (_earlyStore.get('serverUrl') || '').toString().trim().replace(/\/$/, '');
const _secureOrigins = [
  'http://localhost', 'http://localhost:3000', 'http://localhost:4000',
  'http://127.0.0.1', 'http://127.0.0.1:3000',
  _savedUrl,
].filter(Boolean).join(',');
app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', _secureOrigins);

// Bật autoplay media không cần user gesture (fix video/audio im lặng)
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
// Cho phép mixed content (http server trong https context)
app.commandLine.appendSwitch('allow-running-insecure-content');
// Tắt web security warnings trong dev
app.commandLine.appendSwitch('disable-features', 'OutOfBlinkCors');
// Mic / MediaRecorder
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('use-fake-ui-for-media-stream', 'false');
// Cho phép getUserMedia từ bất kỳ origin nào
app.commandLine.appendSwitch('disable-web-security');

const store = new Store({
  name: 'masterlms-config',
  defaults: { serverUrl: '', firstRun: true },
});

let mainWindow = null;
let splashWindow = null;
let tray = null;

const iconPath = path.join(
  __dirname, 'assets',
  process.platform === 'win32' ? 'icon.ico'
  : process.platform === 'darwin' ? 'icon.icns'
  : 'icon.png'
);

// ── Splash ────────────────────────────────────────────────────────────────────

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 480, height: 300,
    frame: false, transparent: true,
    alwaysOnTop: true, resizable: false,
    center: true, skipTaskbar: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.on('closed', () => { splashWindow = null; });
}

// ── Setup window ──────────────────────────────────────────────────────────────

function createSetupWindow() {
  const win = new BrowserWindow({
    width: 560, height: 500,
    frame: false, resizable: false,
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

// ── Main window ───────────────────────────────────────────────────────────────

function createMainWindow(serverUrl) {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800,
    minWidth: 900, minHeight: 600,
    show: false,
    title: 'MasterLMS',
    backgroundColor: '#0f172a',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,           // cho phép load từ HTTP server bất kỳ
      allowRunningInsecureContent: true,
    },
  });

  // Cho phép tất cả permission: camera, microphone, notifications, ...
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback) => callback(true)
  );
  mainWindow.webContents.session.setPermissionCheckHandler(
    () => true
  );

  // Hiện cửa sổ sau khi load xong
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) splashWindow.close();
    mainWindow.show();
    mainWindow.focus();
  });

  // Khi load thất bại → hiện trang lỗi
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, url) => {
    if (errorCode === -3) return; // ERR_ABORTED — điều hướng thông thường
    mainWindow.loadFile(path.join(__dirname, 'error.html'));
  });

  // Mở link ngoài trong browser mặc định
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Cập nhật title từ trang web
  mainWindow.webContents.on('page-title-updated', (event, title) => {
    if (title && !title.includes('localhost')) {
      mainWindow.setTitle(`${title} — MasterLMS`);
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.loadURL(serverUrl);
  return mainWindow;
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray() {
  try {
    const icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
    tray = new Tray(icon);
    tray.setToolTip('MasterLMS');
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Mở MasterLMS', click: () => mainWindow?.show() ?? null },
      { type: 'separator' },
      { label: 'Cài đặt máy chủ...', click: () => openSetupDialog() },
      { type: 'separator' },
      { label: 'Thoát', click: () => { app.isQuiting = true; app.quit(); } },
    ]));
    tray.on('double-click', () => { mainWindow?.show(); mainWindow?.focus(); });
  } catch {}
}

// ── Application menu ──────────────────────────────────────────────────────────

function buildMenu() {
  const isMac = process.platform === 'darwin';
  const template = [
    ...(isMac ? [{ label: app.name, submenu: [
      { role: 'about' }, { type: 'separator' },
      { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' },
      { type: 'separator' }, { role: 'quit' },
    ]}] : []),
    {
      label: 'Điều hướng',
      submenu: [
        { label: 'Quay lại', accelerator: 'Alt+Left', click: () => mainWindow?.webContents.goBack() },
        { label: 'Tiến', accelerator: 'Alt+Right', click: () => mainWindow?.webContents.goForward() },
        { type: 'separator' },
        { label: 'Tải lại', accelerator: 'CmdOrCtrl+R', click: () => mainWindow?.webContents.reload() },
        { label: 'Tải lại toàn bộ', accelerator: 'CmdOrCtrl+Shift+R', click: () => mainWindow?.webContents.reloadIgnoringCache() },
        { type: 'separator' },
        { label: 'Cài đặt máy chủ...', accelerator: 'CmdOrCtrl+,', click: () => openSetupDialog() },
      ],
    },
    {
      label: 'Hiển thị',
      submenu: [
        { label: 'Phóng to', accelerator: 'CmdOrCtrl+Equal', click: () => zoom(0.1) },
        { label: 'Thu nhỏ', accelerator: 'CmdOrCtrl+-', click: () => zoom(-0.1) },
        { label: 'Kích thước gốc', accelerator: 'CmdOrCtrl+0', click: () => mainWindow?.webContents.setZoomFactor(1) },
        { type: 'separator' },
        { label: 'Toàn màn hình', accelerator: 'F11', click: () => mainWindow && mainWindow.setFullScreen(!mainWindow.isFullScreen()) },
        { label: 'Thu gọn', accelerator: 'CmdOrCtrl+M', role: 'minimize' },
        { type: 'separator' },
        ...(process.env.NODE_ENV === 'development' ? [
          { label: 'DevTools', accelerator: 'F12', click: () => mainWindow?.webContents.toggleDevTools() },
        ] : []),
      ],
    },
    {
      label: 'Cửa sổ',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(isMac ? [{ type: 'separator' }, { role: 'front' }] : [{ role: 'close' }]),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function zoom(delta) {
  if (!mainWindow) return;
  const current = mainWindow.webContents.getZoomFactor();
  const next = Math.min(Math.max(current + delta, 0.5), 3.0);
  mainWindow.webContents.setZoomFactor(next);
}

// ── Setup dialog ──────────────────────────────────────────────────────────────

function openSetupDialog() {
  const setupWin = createSetupWindow();
  setupWin.once('closed', () => {
    const newUrl = store.get('serverUrl');
    if (mainWindow && newUrl) mainWindow.loadURL(newUrl);
  });
}

// ── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  buildMenu();
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
    if (url) createMainWindow(url);
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
});

app.on('before-quit', () => { app.isQuiting = true; });

// ── IPC handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('get-server-url', () => store.get('serverUrl'));
ipcMain.handle('set-server-url', (event, url) => {
  const trimmed = url.trim().replace(/\/$/, '');
  store.set('serverUrl', trimmed);
  store.set('firstRun', false);
  return trimmed;
});
ipcMain.handle('show-setup', () => openSetupDialog());
ipcMain.handle('open-external', (event, url) => shell.openExternal(url));
ipcMain.handle('get-app-version', () => app.getVersion());
ipcMain.handle('window-minimize', () => mainWindow?.minimize());
ipcMain.handle('window-maximize', () => {
  if (!mainWindow) return;
  mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
});
ipcMain.handle('window-close', () => mainWindow?.close());
ipcMain.handle('window-reload', () => mainWindow?.webContents.reload());
ipcMain.handle('window-go-back', () => mainWindow?.webContents.goBack());
ipcMain.handle('window-go-forward', () => mainWindow?.webContents.goForward());
ipcMain.handle('window-zoom', (event, delta) => zoom(delta));
