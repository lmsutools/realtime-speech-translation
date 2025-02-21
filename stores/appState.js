import { makeAutoObservable, runInAction } from "mobx";
import { ipcRenderer } from "electron";

class AppState {
  enableTranslation = false;
  sourceLanguage = "nova-2|multi";
  targetLanguage = "en";
  deepgramApiKey = "";
  diarizationEnabled = false;
  typingAppGlobalShortcut = "CommandOrControl+Shift+T";
  typingAppActiveWidth = 400;
  typingAppActiveHeight = 400;
  isRecording = false;
  transcript = "";
  translatedText = "";

  constructor() {
    makeAutoObservable(this);
    this.loadInitialState();
  }

  async loadInitialState() {
    const enableTranslation = await ipcRenderer.invoke('store-get', 'enableTranslation', false);
    const sourceLanguage = await ipcRenderer.invoke('store-get', 'sourceLanguage', "nova-2|multi");
    const targetLanguage = await ipcRenderer.invoke('store-get', 'targetLanguage', "en");
    const deepgramApiKey = await ipcRenderer.invoke('store-get', 'deepgramApiKey', "");
    const diarizationEnabled = await ipcRenderer.invoke('store-get', 'diarizationEnabled', false);
    const typingAppGlobalShortcut = await ipcRenderer.invoke('store-get', 'typingAppGlobalShortcut', "CommandOrControl+Shift+T");
    const typingAppActiveWidth = await ipcRenderer.invoke('store-get', 'typingAppActiveWidth', 400);
    const typingAppActiveHeight = await ipcRenderer.invoke('store-get', 'typingAppActiveHeight', 200);
    runInAction(() => {
      this.enableTranslation = enableTranslation;
      this.sourceLanguage = sourceLanguage;
      this.targetLanguage = targetLanguage;
      this.deepgramApiKey = deepgramApiKey;
      this.diarizationEnabled = diarizationEnabled;
      this.typingAppGlobalShortcut = typingAppGlobalShortcut;
      this.typingAppActiveWidth = typingAppActiveWidth;
      this.typingAppActiveHeight = typingAppActiveHeight;
    });
  }

  setEnableTranslation(value) {
    this.enableTranslation = value;
    ipcRenderer.invoke('store-set', 'enableTranslation', value);
  }

  setSourceLanguage(value) {
    this.sourceLanguage = value;
    ipcRenderer.invoke('store-set', 'sourceLanguage', value);
  }

  setTargetLanguage(value) {
    this.targetLanguage = value;
    ipcRenderer.invoke('store-set', 'targetLanguage', value);
  }

  setDeepgramApiKey(value) {
    this.deepgramApiKey = value;
    ipcRenderer.invoke('store-set', 'deepgramApiKey', value);
  }

  setDiarizationEnabled(value) {
    this.diarizationEnabled = value;
    ipcRenderer.invoke('store-set', 'diarizationEnabled', value);
  }

  setTypingAppGlobalShortcut(value) {
    this.typingAppGlobalShortcut = value;
    ipcRenderer.invoke('store-set', 'typingAppGlobalShortcut', value);
  }

  setTypingAppActiveWidth(value) {
    this.typingAppActiveWidth = value;
    ipcRenderer.invoke('store-set', 'typingAppActiveWidth', value);
  }

  setTypingAppActiveHeight(value) {
    this.typingAppActiveHeight = value;
    ipcRenderer.invoke('store-set', 'typingAppActiveHeight', value);
  }

  setIsRecording(value) {
    this.isRecording = value;
  }

  setTranscript(value) {
    this.transcript = value;
  }

  appendTranscript(value) {
    this.transcript += value;
  }

  setTranslatedText(value) {
    this.translatedText = value;
  }

  appendTranslatedText(value) {
    this.translatedText += value;
  }
}

export const appState = new AppState();
