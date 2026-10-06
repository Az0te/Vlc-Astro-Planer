// Proceso principal de Electron.
// Carga la build estática de Vite (dist/index.html) en una ventana nativa.
// Usa .cjs explícitamente porque package.json tiene "type": "module".

const { app, BrowserWindow, Menu } = require('electron');
const path = require('path');

const isWindows = process.platform === 'win32';

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 960,
    minHeight: 640,
    backgroundColor: '#070a12',
    autoHideMenuBar: true,
    icon: isWindows ? path.join(__dirname, '..', 'build', 'icon.ico') : undefined,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Oculta la barra de menú por defecto de Electron (File/Edit/View...),
  // ya que esta app no la necesita.
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));

  // Abre los enlaces externos (http/https) en el navegador del sistema
  // en vez de dentro de la propia ventana de Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
