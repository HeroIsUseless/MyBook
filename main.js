const path = require('path')
const url = require('url')
const {app, ipcMain, BrowserWindow, Menu, MenuItem} = require('electron')

let mainWindow
let exportWindow

function createWindow () {
    // 隐藏菜单栏
  Menu.setApplicationMenu(null)
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {"nodeIntegration":true}
  });
  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true
  }));
  // 开发者工具
  //mainWindow.webContents.openDevTools();
  mainWindow.on('close', function(){ // 此函数要先于closed，先于窗口关闭
    mainWindow.webContents.send('sigWindow_close');
  })
  mainWindow.on('closed', function () {
    mainWindow = null;
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
})

app.on('activate', function () {
  if (mainWindow === null) createWindow();
})

ipcMain.on('sigShowRightClickMenu', (event) => {
    // 生成菜单
    const menu = new Menu();
    menu.append(new MenuItem({label:'复制', role: 'copy' }));
    menu.append(new MenuItem({label:'粘贴', role: 'paste' }));
    menu.append(new MenuItem({label:'剪切', role: 'cut' }));
    menu.append(new MenuItem({ label:'全选', role: 'selectall' }));
    menu.append(new MenuItem({ type: 'separator' }));
    menu.append(new MenuItem({ label: '字体', click() { mainWindow.webContents.send('sigShowRightClickMenu_compete'); } }));
    menu.append(new MenuItem({ label: '段落', click() { mainWindow.webContents.send('sigShowRightClickMenu_compete'); } }));
    menu.append(new MenuItem({ label: '背景', click() { mainWindow.webContents.send('sigShowRightClickMenu_compete'); } }));
    // menu.append(new MenuItem({ label: 'MenuItem2', type: 'checkbox', checked: true }));

    const win = BrowserWindow.fromWebContents(event.sender);

    menu.popup(win);
});
ipcMain.on('sigShowExportWindow', (event) => {
  exportWindow = new BrowserWindow({    
    title: '导出小说', // 窗口标题
    width: 300, // 宽
    height: 400, // 高
    resizable: true, // 窗口大小是否可变
    frame: true, // 是否带边框
    parent: mainWindow, // 父窗口
    modal: true, // 是否模态窗口
    show: true, // 是否显示窗口
    webPreferences: {"nodeIntegration":true},
  });
  exportWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'export.html'),
    protocol: 'file:',
    slashes: true
  }));
  
  //exportWindow.webContents.openDevTools();
});
ipcMain.on('sig_book_rightMenu', (event) => {
    const menu = new Menu();
    menu.append(new MenuItem({label:'删除', click() { 
        mainWindow.webContents.send('sig_delete_book');
    }}));
    const win = BrowserWindow.fromWebContents(event.sender);
    menu.popup(win);
});