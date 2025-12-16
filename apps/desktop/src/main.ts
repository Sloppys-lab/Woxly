import { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, Notification } from 'electron';
import { autoUpdater } from 'electron-updater';
import Store from 'electron-store';
import * as path from 'path';

// Инициализация хранилища
const store = new Store();

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isQuitting = false;

// URL сервера
const SERVER_URL = process.env.VITE_API_URL || 'https://woxly.ru';

// Создание главного окна
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'WOXLY',
    icon: path.join(__dirname, '../build/icon.png'),
    backgroundColor: '#1a1a1a', // Чуть светлее чтобы видеть UI
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webSecurity: true,
    },
    frame: true,
    autoHideMenuBar: true,
    show: false, // Не показываем пока не загрузится
  });

  // Загрузка приложения
  if (process.env.NODE_ENV === 'development') {
    // В режиме разработки загружаем с Vite dev сервера
    console.log('[MAIN] Loading from Vite dev server: http://localhost:3000');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // В продакшене загружаем локальные файлы
    const indexPath = path.join(__dirname, '../dist-vite/index.desktop.html');
    console.log('[MAIN] Loading local file:', indexPath);
    mainWindow.loadFile(indexPath).catch((err) => {
      console.error('[MAIN] Failed to load file:', err);
    });
    // НЕ открываем DevTools в продакшене
  }

  // Логируем ошибки загрузки
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[MAIN] Failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[MAIN] Page loaded successfully');
  });

  // Показываем окно когда готово
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Обработка закрытия окна
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow?.hide();
      
      // Показываем уведомление
      if (Notification.isSupported()) {
        new Notification({
          title: 'Woxly',
          body: 'Приложение свернуто в трей',
          icon: path.join(__dirname, '../build/icon.png'),
        }).show();
      }
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Открываем внешние ссылки в браузере
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Обработка навигации
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Разрешаем навигацию только внутри приложения
    if (!url.startsWith(SERVER_URL) && !url.startsWith('http://localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

// Создание иконки в трее
function createTray() {
  // Пробуем разные пути к иконке
  let iconPath: string;
  
  if (process.env.NODE_ENV === 'development') {
    // В разработке
    iconPath = path.join(__dirname, '../build/icon.ico');
  } else {
    // В продакшене - ищем в resources
    iconPath = path.join(process.resourcesPath, 'icon.ico');
    
    // Если не нашли, пробуем в build
    if (!require('fs').existsSync(iconPath)) {
      iconPath = path.join(__dirname, '../build/icon.ico');
    }
  }
  
  console.log('[TRAY] Loading icon from:', iconPath);
  
  const icon = nativeImage.createFromPath(iconPath);
  
  if (icon.isEmpty()) {
    console.error('[TRAY] Failed to load icon from:', iconPath);
    // Создаем пустую иконку как fallback
    tray = new Tray(nativeImage.createEmpty());
  } else {
    // Для Windows лучше использовать .ico напрямую без resize
    tray = new Tray(icon);
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Открыть Woxly',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createWindow();
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Настройки',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
          mainWindow.webContents.send('navigate-to', '/app/settings');
        }
      },
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Woxly');
  tray.setContextMenu(contextMenu);

  // Двойной клик - открыть окно
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createWindow();
    }
  });
}

// Автозапуск
function setupAutoLaunch() {
  const autoLaunch = store.get('autoLaunch', false) as boolean;
  
  if (autoLaunch) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: true,
    });
  }
}

// Проверка обновлений
function checkForUpdates() {
  if (process.env.NODE_ENV !== 'development') {
    // Настройки автообновления
    autoUpdater.autoDownload = true;
    autoUpdater.autoInstallOnAppQuit = true;
    
    // Проверяем обновления каждые 4 часа
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 4 * 60 * 60 * 1000);
    
    // Первая проверка через 10 секунд после запуска
    setTimeout(() => {
      autoUpdater.checkForUpdates();
    }, 10000);
    
    // Обновление найдено
    autoUpdater.on('update-available', (info) => {
      console.log('[UPDATER] Update available:', info.version);
      if (Notification.isSupported() && mainWindow) {
        new Notification({
          title: '🎉 Доступно обновление',
          body: `Новая версия ${info.version} загружается...`,
          icon: path.join(__dirname, '../build/icon.png'),
        }).show();
        
        // Отправляем событие в renderer
        mainWindow.webContents.send('update-available', info);
      }
    });

    // Обновление не найдено
    autoUpdater.on('update-not-available', (info) => {
      console.log('[UPDATER] Update not available. Current version:', info.version);
    });

    // Прогресс загрузки
    autoUpdater.on('download-progress', (progressObj) => {
      const message = `Загружено ${Math.round(progressObj.percent)}%`;
      console.log('[UPDATER]', message);
      
      if (mainWindow) {
        mainWindow.webContents.send('update-progress', progressObj);
      }
    });

    // Обновление загружено
    autoUpdater.on('update-downloaded', (info) => {
      console.log('[UPDATER] Update downloaded:', info.version);
      
      if (Notification.isSupported()) {
        const notification = new Notification({
          title: '✅ Обновление готово',
          body: `Версия ${info.version} готова к установке. Нажмите для перезапуска.`,
          icon: path.join(__dirname, '../build/icon.png'),
        });
        
        notification.on('click', () => {
          autoUpdater.quitAndInstall(false, true);
        });
        
        notification.show();
      }
      
      if (mainWindow) {
        mainWindow.webContents.send('update-downloaded', info);
      }
    });

    // Ошибка обновления
    autoUpdater.on('error', (error) => {
      console.error('[UPDATER] Error:', error);
      if (mainWindow) {
        mainWindow.webContents.send('update-error', error.message);
      }
    });
  }
}

// IPC обработчики
ipcMain.handle('get-store-value', (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('set-store-value', (_event, key: string, value: any) => {
  store.set(key, value);
  
  // Обновляем автозапуск если изменилась настройка
  if (key === 'autoLaunch') {
    app.setLoginItemSettings({
      openAtLogin: value,
      openAsHidden: value,
    });
  }
});

ipcMain.handle('show-notification', (_event, options: { title: string; body: string }) => {
  if (Notification.isSupported()) {
    new Notification({
      title: options.title,
      body: options.body,
      icon: path.join(__dirname, '../build/icon.png'),
    }).show();
  }
});

ipcMain.handle('minimize-to-tray', () => {
  mainWindow?.hide();
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('check-for-updates', () => {
  if (process.env.NODE_ENV !== 'development') {
    autoUpdater.checkForUpdates();
    return { checking: true };
  }
  return { checking: false, message: 'Updates disabled in development' };
});

ipcMain.handle('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

// Инициализация приложения
app.whenReady().then(() => {
  createWindow();
  createTray();
  setupAutoLaunch();
  checkForUpdates();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Выход из приложения
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  isQuitting = true;
});

// Обработка ошибок
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
});









