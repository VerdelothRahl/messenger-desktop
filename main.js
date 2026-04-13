const { app, BrowserWindow, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

const LOG_FILE = path.join(__dirname, 'messenger.log');

function log(...args) {
  const line = `[${new Date().toISOString()}] ${args.join(' ')}\n`;
  fs.appendFileSync(LOG_FILE, line);
  console.log(line.trim());
}

// Clear log on each start
fs.writeFileSync(LOG_FILE, `=== Messenger started ===\n`);

process.on('uncaughtException', (err) => {
  log('UNCAUGHT EXCEPTION:', err.stack || err);
});
process.on('unhandledRejection', (reason) => {
  log('UNHANDLED REJECTION:', reason);
});

let mainWindow;
let tray;

log('Requesting single instance lock...');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  log('Another instance is running, quitting.');
  app.quit();
  process.exit(0);
}

app.on('second-instance', () => {
  log('Second instance detected, focusing existing window.');
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function createWindow() {
  log('Creating BrowserWindow...');
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    minWidth: 700,
    minHeight: 500,
    title: 'Messenger',
    icon: path.join(__dirname, 'messengerIcon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      partition: 'persist:messenger',
      preload: path.join(__dirname, 'preload.js'),
    },
  });
  log('BrowserWindow created.');

  mainWindow.webContents.setUserAgent(USER_AGENT);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    log('Window open requested:', url);
    if (url.includes('facebook.com') || url.includes('messenger.com')) {
      const popup = new BrowserWindow({
        width: 800,
        height: 650,
        parent: mainWindow,
        autoHideMenuBar: true,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          partition: 'persist:messenger',
        },
      });
      popup.webContents.setUserAgent(USER_AGENT);
      popup.loadURL(url);
      popup.once('closed', () => mainWindow.webContents.reload());
      return { action: 'deny' };
    }
    return { action: 'deny' };
  });

  mainWindow.webContents.on('did-start-loading', () => log('Page loading started.'));
  mainWindow.webContents.on('did-finish-load', () => log('Page finished loading.'));
  mainWindow.webContents.on('did-fail-load', (e, code, desc) => log('Page FAILED to load:', code, desc));
  mainWindow.webContents.on('crashed', () => log('Renderer CRASHED.'));
  mainWindow.on('unresponsive', () => log('Window became unresponsive.'));
  mainWindow.on('closed', () => log('Window closed.'));

  mainWindow.on('page-title-updated', (e) => e.preventDefault());

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  log('Loading fb.com/messages...');
  mainWindow.loadURL('https://www.facebook.com/messages');
  mainWindow.show();

  log('Creating tray...');
  createTray();
  log('Tray created.');
}

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');
  log('Loading icon from:', iconPath, '| exists:', fs.existsSync(iconPath));
  const img = nativeImage.createFromPath(iconPath);
  log('Icon empty?', img.isEmpty());
  tray = new Tray(img);
  tray.setToolTip('Messenger');

  const menu = Menu.buildFromTemplate([
    {
      label: 'Open Messenger',
      click: () => { mainWindow.show(); mainWindow.focus(); },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => { app.isQuitting = true; app.quit(); },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('click', () => {
    mainWindow.isVisible() ? mainWindow.hide() : mainWindow.show();
  });
}

log('Waiting for app ready...');
app.whenReady().then(() => {
  log('App is ready.');
  createWindow();
});

app.on('window-all-closed', () => {
  if (app.isQuitting) {
    log('All windows closed, exiting.');
    app.exit(0);
  } else {
    log('All windows closed (staying in tray).');
  }
});

app.on('activate', () => {
  if (mainWindow) mainWindow.show();
});
