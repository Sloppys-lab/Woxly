import { contextBridge, ipcRenderer } from 'electron';

// Безопасный API для рендер процесса
contextBridge.exposeInMainWorld('electronAPI', {
  // Хранилище
  getStoreValue: (key: string) => ipcRenderer.invoke('get-store-value', key),
  setStoreValue: (key: string, value: any) => ipcRenderer.invoke('set-store-value', key, value),
  
  // Уведомления
  showNotification: (options: { title: string; body: string }) => 
    ipcRenderer.invoke('show-notification', options),
  
  // Управление окном
  minimizeToTray: () => ipcRenderer.invoke('minimize-to-tray'),
  
  // Информация о приложении
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  
  // Навигация
  onNavigateTo: (callback: (path: string) => void) => {
    ipcRenderer.on('navigate-to', (_event, path) => callback(path));
  },
  
  // Платформа
  platform: process.platform,
  isElectron: true,
});

// TypeScript типы для window.electronAPI
declare global {
  interface Window {
    electronAPI: {
      getStoreValue: (key: string) => Promise<any>;
      setStoreValue: (key: string, value: any) => Promise<void>;
      showNotification: (options: { title: string; body: string }) => Promise<void>;
      minimizeToTray: () => Promise<void>;
      getAppVersion: () => Promise<string>;
      onNavigateTo: (callback: (path: string) => void) => void;
      platform: string;
      isElectron: boolean;
    };
  }
}









