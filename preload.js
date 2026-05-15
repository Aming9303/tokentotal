const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  getHistory: () => ipcRenderer.invoke("get-history"),
  addHistory: (entry) => ipcRenderer.invoke("add-history", entry),
  clearHistory: () => ipcRenderer.invoke("clear-history"),
  getBudget: () => ipcRenderer.invoke("get-budget"),
  setBudget: (budget) => ipcRenderer.invoke("set-budget", budget),
  getSettings: () => ipcRenderer.invoke("get-settings"),
  setSetting: (key, value) => ipcRenderer.invoke("set-setting", key, value),
  getLicenseStatus: () => ipcRenderer.invoke("get-license-status"),
  activateLicense: (licenseKey) => ipcRenderer.invoke("activate-license", licenseKey),
  deactivateLicense: () => ipcRenderer.invoke("deactivate-license"),
  openPurchasePage: () => ipcRenderer.invoke("open-purchase-page"),
  clearSettings: () => ipcRenderer.invoke("clear-settings"),
  clearAllData: () => ipcRenderer.invoke("clear-all-data"),
  getAllData: () => ipcRenderer.invoke("get-all-data"),
  importHistory: (entries) => ipcRenderer.invoke("import-history", entries),
  scanLocalUsage: (source) => ipcRenderer.invoke("scan-local-usage", source),
  getProxyStatus: () => ipcRenderer.invoke("get-proxy-status"),
  startProxy: (config) => ipcRenderer.invoke("start-proxy", config),
  stopProxy: () => ipcRenderer.invoke("stop-proxy"),
  listOllamaModels: () => ipcRenderer.invoke("list-ollama-models"),
  sendLocalChat: (payload) => ipcRenderer.invoke("send-local-chat", payload),
  fetchOpenAIUsage: (apiKey) => ipcRenderer.invoke("fetch-openai-usage", apiKey),
  onClipboardText: (callback) => {
    ipcRenderer.on("clipboard-text", (_, text) => callback(text));
  },
});
