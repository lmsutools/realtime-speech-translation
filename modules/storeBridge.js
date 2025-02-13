import { ipcRenderer } from 'electron';

export async function getStoreValue(key, defaultValue) {
  return ipcRenderer.invoke('store-get', key, defaultValue);
}

export async function setStoreValue(key, value) {
  return ipcRenderer.invoke('store-set', key, value);
}

export async function deleteStoreValue(key) {
  return ipcRenderer.invoke('store-delete', key);
}
