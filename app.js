/* ══════════════════════════════════════════════════
   TokenTotal — 渲染进程
   ══════════════════════════════════════════════════ */

const models = [
  // OpenAI
  { id: "gpt-5.2", name: "GPT-5.2", provider: "OpenAI", input: 1.75, cached: 0.175, output: 14, context: 400000 },
  { id: "gpt-5.2-chat", name: "GPT-5.2 Chat", provider: "OpenAI", input: 1.75, cached: 0.175, output: 14, context: 128000 },
  { id: "gpt-5.1", name: "GPT-5.1", provider: "OpenAI", input: 1.25, cached: 0.125, output: 10, context: 400000 },
  { id: "gpt-5-mini", name: "GPT-5 mini", provider: "OpenAI", input: 0.25, cached: 0.025, output: 2, context: 400000 },
  { id: "gpt-5-nano", name: "GPT-5 nano", provider: "OpenAI", input: 0.05, cached: 0.005, output: 0.4, context: 400000 },
  { id: "gpt-4.1", name: "GPT-4.1", provider: "OpenAI", input: 2, cached: 0.5, output: 8, context: 1047576 },
  { id: "gpt-4.1-mini", name: "GPT-4.1 mini", provider: "OpenAI", input: 0.4, cached: 0.1, output: 1.6, context: 1047576 },
  { id: "gpt-4.1-nano", name: "GPT-4.1 nano", provider: "OpenAI", input: 0.1, cached: 0.025, output: 0.4, context: 1047576 },
  { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI", input: 2.5, cached: 1.25, output: 10, context: 128000 },
  { id: "gpt-4o-mini", name: "GPT-4o mini", provider: "OpenAI", input: 0.15, cached: 0.075, output: 0.6, context: 128000 },
  // Anthropic
  { id: "claude-opus-4", name: "Claude Opus 4", provider: "Anthropic", input: 15, cached: 1.875, output: 75, context: 200000 },
  { id: "claude-sonnet-4", name: "Claude Sonnet 4", provider: "Anthropic", input: 3, cached: 0.30, output: 15, context: 200000 },
  { id: "claude-haiku-3.5", name: "Claude Haiku 3.5", provider: "Anthropic", input: 0.80, cached: 0.08, output: 4, context: 200000 },
  // Google
  { id: "gemini-2.5-pro", name: "Gemini 2.5 Pro", provider: "Google", input: 1.25, cached: 0.3125, output: 10, context: 1048576 },
  { id: "gemini-2.5-flash", name: "Gemini 2.5 Flash", provider: "Google", input: 0.15, cached: 0.0375, output: 0.60, context: 1048576 },
  { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "Google", input: 0.10, cached: 0.025, output: 0.40, context: 1048576 },
  // DeepSeek
  { id: "deepseek-v3", name: "DeepSeek V3", provider: "DeepSeek", input: 0.27, cached: 0.07, output: 1.10, context: 65536 },
  { id: "deepseek-r1", name: "DeepSeek R1", provider: "DeepSeek", input: 0.55, cached: 0.14, output: 2.19, context: 65536 },
];

const colors = {
  cjk: "#2f8f83",
  latin: "#255f85",
  number: "#b1842d",
  symbol: "#d96b4c",
  overhead: "#6f5d99",
};

const providerColors = {
  OpenAI: "#10a37f",
  Anthropic: "#cc9351",
  Google: "#4285f4",
  DeepSeek: "#6366f1",
  Local: "#2f8f83",
};

const FREE_HISTORY_LIMIT = 100;
const CNY_PER_USD = 7.2;
const DEFAULT_WORKSPACE = {
  activeMemberId: "me",
  wallet: {
    currency: "CNY",
    monthlyBudget: 300,
    warningPct: 80,
    tokenModelId: "gpt-5-mini",
  },
  members: [
    {
      id: "me",
      name: "我",
      role: "Owner",
      monthlyBudget: 300,
      enabled: true,
      allowedModels: "all",
    },
  ],
  security: {
    detectSecrets: true,
    detectPII: true,
    detectCustomerData: true,
    blockHighRisk: false,
    customKeywords: "客户资料\n合同\n身份证\n银行卡\napi key\nsecret",
  },
};
const proFeatureLabels = {
  connectors: "连接器同步",
  localChat: "本地模型聊天",
  promptEnglish: "Prompt 转英文",
  cloudUsage: "官方用量拉取",
  exportData: "数据导出",
  unlimitedHistory: "不限历史记录",
};

const modelScenarioHints = {
  "gpt-5-mini": "日常问答、轻量代码、批量任务",
  "gpt-5-nano": "分类、提取、短文本批处理",
  "gpt-4.1-mini": "长上下文代码和文档分析",
  "gpt-4.1-nano": "低成本长上下文粗处理",
  "gpt-4o-mini": "轻量聊天、多媒体边缘任务",
  "claude-haiku-3.5": "快速问答、摘要、低风险任务",
  "gemini-2.5-flash": "长上下文、低成本通用分析",
  "gemini-2.0-flash": "高频低成本请求",
  "deepseek-v3": "代码、中文、通用推理",
  "deepseek-r1": "低成本推理型任务",
};

const moonSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
const sunSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';

const estimateModes = {
  balanced: { label: "标准估算", factor: 1, low: 0.88, high: 1.16 },
  conservative: { label: "保守预算", factor: 1.12, low: 0.96, high: 1.3 },
  code: { label: "代码密集", factor: 1.08, low: 0.92, high: 1.24 },
  cjk: { label: "中文长文", factor: 0.98, low: 0.9, high: 1.12 },
};

function applyInitialTheme() {
  const saved = localStorage.getItem("tokentotal-theme");
  const preferred =
    saved ||
    (window.matchMedia?.("(prefers-color-scheme:dark)").matches
      ? "dark"
      : "light");
  document.documentElement.setAttribute("data-theme", preferred);
}

applyInitialTheme();

/* ── Storage abstraction ── */

const storage = {
  isElectron: typeof window.electronAPI !== "undefined",

  async getHistory() {
    if (this.isElectron) return window.electronAPI.getHistory();
    try { return JSON.parse(localStorage.getItem("tt-history") || "[]"); } catch { return []; }
  },

  async addHistory(entry) {
    if (this.isElectron) return window.electronAPI.addHistory(entry);
    const h = await this.getHistory();
    h.push(entry);
    localStorage.setItem("tt-history", JSON.stringify(h));
  },

  async clearHistory() {
    if (this.isElectron) return window.electronAPI.clearHistory();
    localStorage.setItem("tt-history", "[]");
  },

  async getBudget() {
    if (this.isElectron) return window.electronAPI.getBudget();
    try { return JSON.parse(localStorage.getItem("tt-budget") || "{}"); } catch { return {}; }
  },

  async setBudget(budget) {
    if (this.isElectron) return window.electronAPI.setBudget(budget);
    localStorage.setItem("tt-budget", JSON.stringify(budget));
  },

  async getSettings() {
    if (this.isElectron) return window.electronAPI.getSettings();
    try {
      const settings = JSON.parse(localStorage.getItem("tt-settings") || "{}");
      if ("openaiKey" in settings) {
        delete settings.openaiKey;
        localStorage.setItem("tt-settings", JSON.stringify(settings));
      }
      return settings;
    } catch { return {}; }
  },

  async getLicenseStatus() {
    if (this.isElectron && window.electronAPI.getLicenseStatus) {
      return window.electronAPI.getLicenseStatus();
    }
    try {
      return JSON.parse(localStorage.getItem("tt-license-status") || "null") || {
        activated: false,
        isPro: false,
        plan: "free",
        status: "free",
        freeLimits: { history: FREE_HISTORY_LIMIT },
      };
    } catch {
      return {
        activated: false,
        isPro: false,
        plan: "free",
        status: "free",
        freeLimits: { history: FREE_HISTORY_LIMIT },
      };
    }
  },

  async activateLicense(licenseKey) {
    if (this.isElectron && window.electronAPI.activateLicense) {
      return window.electronAPI.activateLicense(licenseKey);
    }
    if (String(licenseKey || "").trim() === "TT-DEV-PRO") {
      const status = {
        activated: true,
        isPro: true,
        plan: "pro",
        status: "active",
        source: "browser-dev",
        email: "developer@tokentotal.local",
        features: Object.keys(proFeatureLabels),
      };
      localStorage.setItem("tt-license-status", JSON.stringify(status));
      return { success: true, status };
    }
    return { success: false, error: "License 激活仅在桌面版支持" };
  },

  async deactivateLicense() {
    if (this.isElectron && window.electronAPI.deactivateLicense) {
      return window.electronAPI.deactivateLicense();
    }
    localStorage.removeItem("tt-license-status");
    return { success: true, status: await this.getLicenseStatus() };
  },

  async openPurchasePage() {
    if (this.isElectron && window.electronAPI.openPurchasePage) {
      return window.electronAPI.openPurchasePage();
    }
    return { success: false, error: "Pro 购买页暂未配置" };
  },

  async setSetting(key, value) {
    if (this.isElectron) return window.electronAPI.setSetting(key, value);
    if (key === "openaiKey") {
      sessionStorage.setItem("tt-session-openai-key", value);
      return;
    }
    const s = await this.getSettings();
    s[key] = value;
    localStorage.setItem("tt-settings", JSON.stringify(s));
  },

  async clearSettings() {
    if (this.isElectron) {
      if (window.electronAPI.clearSettings) return window.electronAPI.clearSettings();
      await window.electronAPI.setSetting("clipboardWatch", true);
      await window.electronAPI.setSetting("autoSave", false);
      await window.electronAPI.setSetting("startMinimized", false);
      await window.electronAPI.setSetting("openaiKey", "");
      return;
    }
    localStorage.setItem("tt-settings", "{}");
    sessionStorage.removeItem("tt-session-openai-key");
  },

  async clearAllData() {
    if (this.isElectron && window.electronAPI.clearAllData) {
      return window.electronAPI.clearAllData();
    }
    await this.clearHistory();
    await this.setBudget({});
    await this.clearSettings();
  },

  async getAllData() {
    if (this.isElectron) return window.electronAPI.getAllData();
    return {
      history: await this.getHistory(),
      budget: await this.getBudget(),
      settings: await this.getSettings(),
    };
  },

  async importHistory(entries) {
    if (this.isElectron) return window.electronAPI.importHistory(entries);
    const h = await this.getHistory();
    const existing = new Set(h.map((entry) => entry.externalId).filter(Boolean));
    for (const entry of entries) {
      if (entry.externalId && existing.has(entry.externalId)) continue;
      h.push(entry);
      if (entry.externalId) existing.add(entry.externalId);
    }
    localStorage.setItem("tt-history", JSON.stringify(h));
  },

  async scanLocalUsage(source) {
    if (!this.isElectron || !window.electronAPI.scanLocalUsage) {
      return { success: false, error: "本地采集仅在桌面应用中可用" };
    }
    return window.electronAPI.scanLocalUsage(source);
  },

  async getProxyStatus() {
    if (!this.isElectron || !window.electronAPI.getProxyStatus) {
      return { running: false, proxyBaseUrl: "", config: { port: 8787, targetBaseUrl: "http://127.0.0.1:11434", provider: "Local" } };
    }
    return window.electronAPI.getProxyStatus();
  },

  async startProxy(config) {
    if (!this.isElectron || !window.electronAPI.startProxy) {
      return { running: false, error: "本地代理仅在桌面应用中可用" };
    }
    return window.electronAPI.startProxy(config);
  },

  async stopProxy() {
    if (!this.isElectron || !window.electronAPI.stopProxy) {
      return { running: false, error: "本地代理仅在桌面应用中可用" };
    }
    return window.electronAPI.stopProxy();
  },

  async listOllamaModels() {
    if (!this.isElectron || !window.electronAPI.listOllamaModels) {
      return { success: false, error: "Ollama 模型读取仅在桌面应用中可用", models: [] };
    }
    return window.electronAPI.listOllamaModels();
  },

  async sendLocalChat(payload) {
    if (!this.isElectron || !window.electronAPI.sendLocalChat) {
      return { success: false, error: "本地聊天仅在桌面应用中可用" };
    }
    return window.electronAPI.sendLocalChat(payload);
  },
};

/* ── DOM elements ── */

const els = {
  // Dashboard page
  dashboardSpend: document.querySelector("#dashboardSpend"),
  dashboardBudget: document.querySelector("#dashboardBudget"),
  dashboardRemaining: document.querySelector("#dashboardRemaining"),
  dashboardCalls: document.querySelector("#dashboardCalls"),
  dashboardRisk: document.querySelector("#dashboardRisk"),
  dashboardActiveMember: document.querySelector("#dashboardActiveMember"),
  dashboardMemberSelect: document.querySelector("#dashboardMemberSelect"),
  dashboardMemberTable: document.querySelector("#dashboardMemberTable"),
  dashboardAlertList: document.querySelector("#dashboardAlertList"),
  // Estimate page
  sourceText: document.querySelector("#sourceText"),
  modelSelect: document.querySelector("#modelSelect"),
  estimateMode: document.querySelector("#estimateMode"),
  outputTokens: document.querySelector("#outputTokens"),
  contextLimit: document.querySelector("#contextLimit"),
  cacheRatio: document.querySelector("#cacheRatio"),
  cacheLabel: document.querySelector("#cacheLabel"),
  dailyCalls: document.querySelector("#dailyCalls"),
  workDays: document.querySelector("#workDays"),
  inputPrice: document.querySelector("#inputPrice"),
  cachedPrice: document.querySelector("#cachedPrice"),
  outputPrice: document.querySelector("#outputPrice"),
  tokenCount: document.querySelector("#tokenCount"),
  tokenConfidence: document.querySelector("#tokenConfidence"),
  singleCost: document.querySelector("#singleCost"),
  monthlyCost: document.querySelector("#monthlyCost"),
  costBreakdown: document.querySelector("#costBreakdown"),
  callSummary: document.querySelector("#callSummary"),
  contextUsage: document.querySelector("#contextUsage"),
  gaugeFill: document.querySelector("#gaugeFill"),
  charCount: document.querySelector("#charCount"),
  wordCount: document.querySelector("#wordCount"),
  cjkCount: document.querySelector("#cjkCount"),
  lineCount: document.querySelector("#lineCount"),
  messageCount: document.querySelector("#messageCount"),
  codeDensity: document.querySelector("#codeDensity"),
  tokenBars: document.querySelector("#tokenBars"),
  insightList: document.querySelector("#insightList"),
  promptSlimMode: document.querySelector("#promptSlimMode"),
  promptSlimRun: document.querySelector("#promptSlimRun"),
  promptSlimEnglish: document.querySelector("#promptSlimEnglish"),
  promptSlimCopy: document.querySelector("#promptSlimCopy"),
  promptSlimApply: document.querySelector("#promptSlimApply"),
  promptSlimOutput: document.querySelector("#promptSlimOutput"),
  promptSlimOriginal: document.querySelector("#promptSlimOriginal"),
  promptSlimNew: document.querySelector("#promptSlimNew"),
  promptSlimSaved: document.querySelector("#promptSlimSaved"),
  promptSlimSaving: document.querySelector("#promptSlimSaving"),
  promptSlimNotes: document.querySelector("#promptSlimNotes"),
  modelTable: document.querySelector("#modelTable"),
  chatMode: document.querySelector("#chatMode"),
  messageOverhead: document.querySelector("#messageOverhead"),
  filePicker: document.querySelector("#filePicker"),
  loadSample: document.querySelector("#loadSample"),
  clearInput: document.querySelector("#clearInput"),
  copyReport: document.querySelector("#copyReport"),
  themeToggle: document.querySelector("#themeToggle"),
  recordEstimate: document.querySelector("#recordEstimate"),
  // Chat page
  refreshChatModels: document.querySelector("#refreshChatModels"),
  clearChat: document.querySelector("#clearChat"),
  chatStartProxy: document.querySelector("#chatStartProxy"),
  chatThread: document.querySelector("#chatThread"),
  chatEmpty: document.querySelector("#chatEmpty"),
  chatInput: document.querySelector("#chatInput"),
  chatSend: document.querySelector("#chatSend"),
  chatModel: document.querySelector("#chatModel"),
  chatSystemPrompt: document.querySelector("#chatSystemPrompt"),
  chatTemperature: document.querySelector("#chatTemperature"),
  chatTemperatureLabel: document.querySelector("#chatTemperatureLabel"),
  chatModelStatus: document.querySelector("#chatModelStatus"),
  chatProxyStatus: document.querySelector("#chatProxyStatus"),
  chatProxyUrl: document.querySelector("#chatProxyUrl"),
  chatStatInput: document.querySelector("#chatStatInput"),
  chatStatOutput: document.querySelector("#chatStatOutput"),
  chatStatTotal: document.querySelector("#chatStatTotal"),
  chatStatLatency: document.querySelector("#chatStatLatency"),
  chatStatSpeed: document.querySelector("#chatStatSpeed"),
  // Connectors page
  refreshConnectors: document.querySelector("#refreshConnectors"),
  connectorSyncAll: document.querySelector("#connectorSyncAll"),
  connectorCopyProxy: document.querySelector("#connectorCopyProxy"),
  connectorExactCount: document.querySelector("#connectorExactCount"),
  connectorLocalModels: document.querySelector("#connectorLocalModels"),
  connectorLocalModelNames: document.querySelector("#connectorLocalModelNames"),
  connectorProxyState: document.querySelector("#connectorProxyState"),
  connectorProxyUrl: document.querySelector("#connectorProxyUrl"),
  connectorKeyState: document.querySelector("#connectorKeyState"),
  connOllamaBadge: document.querySelector("#connOllamaBadge"),
  connOllamaDetail: document.querySelector("#connOllamaDetail"),
  connCompatibleBadge: document.querySelector("#connCompatibleBadge"),
  connCodexBadge: document.querySelector("#connCodexBadge"),
  connCodexDetail: document.querySelector("#connCodexDetail"),
  connClaudeBadge: document.querySelector("#connClaudeBadge"),
  connClaudeDetail: document.querySelector("#connClaudeDetail"),
  connOpenAIDetail: document.querySelector("#connOpenAIDetail"),
  connEnableOllama: document.querySelector("#connEnableOllama"),
  connRefreshOllama: document.querySelector("#connRefreshOllama"),
  connCopyCompatible: document.querySelector("#connCopyCompatible"),
  connOpenProxySettings: document.querySelector("#connOpenProxySettings"),
  connSyncCodex: document.querySelector("#connSyncCodex"),
  connSyncClaude: document.querySelector("#connSyncClaude"),
  connOpenAISettings: document.querySelector("#connOpenAISettings"),
  connAnthropicSettings: document.querySelector("#connAnthropicSettings"),
  connOpenRouterCopy: document.querySelector("#connOpenRouterCopy"),
  connectorToolTable: document.querySelector("#connectorToolTable"),
  // History page
  historyRange: document.querySelector("#historyRange"),
  exportCsv: document.querySelector("#exportCsv"),
  clearHistory: document.querySelector("#clearHistory"),
  costChart: document.querySelector("#costChart"),
  chartEmpty: document.querySelector("#chartEmpty"),
  histTotalCount: document.querySelector("#histTotalCount"),
  histTotalTokens: document.querySelector("#histTotalTokens"),
  histTotalCost: document.querySelector("#histTotalCost"),
  histDailyCost: document.querySelector("#histDailyCost"),
  qualityExactTokens: document.querySelector("#qualityExactTokens"),
  qualityObservedTokens: document.querySelector("#qualityObservedTokens"),
  qualityEstimatedTokens: document.querySelector("#qualityEstimatedTokens"),
  qualityStatus: document.querySelector("#qualityStatus"),
  qualityWarning: document.querySelector("#qualityWarning"),
  historyTable: document.querySelector("#historyTable"),
  historyEmpty: document.querySelector("#historyEmpty"),
  // Budget page
  budgetPeriod: document.querySelector("#budgetPeriod"),
  budgetFill: document.querySelector("#budgetFill"),
  budgetUsed: document.querySelector("#budgetUsed"),
  budgetPct: document.querySelector("#budgetPct"),
  budgetTotal: document.querySelector("#budgetTotal"),
  budgetDailyAvg: document.querySelector("#budgetDailyAvg"),
  budgetProjected: document.querySelector("#budgetProjected"),
  budgetRemaining: document.querySelector("#budgetRemaining"),
  budgetDaysLeft: document.querySelector("#budgetDaysLeft"),
  providerBars: document.querySelector("#providerBars"),
  providerEmpty: document.querySelector("#providerEmpty"),
  budgetAmount: document.querySelector("#budgetAmount"),
  budgetThreshold: document.querySelector("#budgetThreshold"),
  saveBudget: document.querySelector("#saveBudget"),
  syncCodex: document.querySelector("#syncCodex"),
  syncClaude: document.querySelector("#syncClaude"),
  syncAllUsage: document.querySelector("#syncAllUsage"),
  syncStatus: document.querySelector("#syncStatus"),
  budgetQualityNote: document.querySelector("#budgetQualityNote"),
  costDiagnosisList: document.querySelector("#costDiagnosisList"),
  recommendationTable: document.querySelector("#recommendationTable"),
  recommendationEmpty: document.querySelector("#recommendationEmpty"),
  walletCurrency: document.querySelector("#walletCurrency"),
  walletMonthlyBudget: document.querySelector("#walletMonthlyBudget"),
  walletWarningPct: document.querySelector("#walletWarningPct"),
  walletTokenModel: document.querySelector("#walletTokenModel"),
  walletUsdBudget: document.querySelector("#walletUsdBudget"),
  walletTokenCapacity: document.querySelector("#walletTokenCapacity"),
  walletMemberTable: document.querySelector("#walletMemberTable"),
  saveWallet: document.querySelector("#saveWallet"),
  // Team page
  teamMemberName: document.querySelector("#teamMemberName"),
  teamMemberRole: document.querySelector("#teamMemberRole"),
  teamMemberBudget: document.querySelector("#teamMemberBudget"),
  teamAddMember: document.querySelector("#teamAddMember"),
  teamActiveMember: document.querySelector("#teamActiveMember"),
  teamMemberTable: document.querySelector("#teamMemberTable"),
  // Security page
  securityDetectSecrets: document.querySelector("#securityDetectSecrets"),
  securityDetectPII: document.querySelector("#securityDetectPII"),
  securityDetectCustomerData: document.querySelector("#securityDetectCustomerData"),
  securityBlockHighRisk: document.querySelector("#securityBlockHighRisk"),
  securityKeywords: document.querySelector("#securityKeywords"),
  saveSecurity: document.querySelector("#saveSecurity"),
  securitySummary: document.querySelector("#securitySummary"),
  securityRecentTable: document.querySelector("#securityRecentTable"),
  // Settings page
  settingClipboard: document.querySelector("#settingClipboard"),
  settingAutoSave: document.querySelector("#settingAutoSave"),
  settingStartMin: document.querySelector("#settingStartMin"),
  licensePlanBadge: document.querySelector("#licensePlanBadge"),
  licenseStatusText: document.querySelector("#licenseStatusText"),
  licenseAccount: document.querySelector("#licenseAccount"),
  licenseExpiry: document.querySelector("#licenseExpiry"),
  licenseFeatureList: document.querySelector("#licenseFeatureList"),
  licenseKey: document.querySelector("#licenseKey"),
  licenseActivate: document.querySelector("#licenseActivate"),
  licenseDeactivate: document.querySelector("#licenseDeactivate"),
  licenseBuy: document.querySelector("#licenseBuy"),
  licenseDevHint: document.querySelector("#licenseDevHint"),
  openaiKey: document.querySelector("#openaiKey"),
  apiKeyHelp: document.querySelector("#apiKeyHelp"),
  fetchUsage: document.querySelector("#fetchUsage"),
  proxyPort: document.querySelector("#proxyPort"),
  proxyTarget: document.querySelector("#proxyTarget"),
  proxyProvider: document.querySelector("#proxyProvider"),
  startProxy: document.querySelector("#startProxy"),
  stopProxy: document.querySelector("#stopProxy"),
  proxyStatus: document.querySelector("#proxyStatus"),
  proxyBaseUrl: document.querySelector("#proxyBaseUrl"),
  copyProxyUrl: document.querySelector("#copyProxyUrl"),
  csvPicker: document.querySelector("#csvPicker"),
  exportAllData: document.querySelector("#exportAllData"),
  clearAllData: document.querySelector("#clearAllData"),
  // Toast
  toastContainer: document.querySelector("#toastContainer"),
};

const sampleText = `system: 你是一个严谨的产品分析助手。
user: 我准备把客服知识库接入模型，需要估算每次请求的输入 token、输出预算和月度成本。
assistant: 可以。请提供知识库片段、平均问题长度、模型候选、缓存命中比例和每日调用量。

示例代码:
const estimate = ({ inputTokens, outputTokens, price }) => {
  return (inputTokens * price.input + outputTokens * price.output) / 1_000_000;
};`;

let lastReport = null;
let lastPromptSlim = null;
let chatMessages = [];
let chatBusy = false;
let chatModelsLoaded = false;
let lastConnectorState = {
  ollamaModels: [],
  proxyStatus: null,
  settings: {},
};
let lastUsageAudit = null;
let licenseStatus = {
  activated: false,
  isPro: false,
  plan: "free",
  status: "free",
  freeLimits: { history: FREE_HISTORY_LIMIT },
};

/* ── Theme ── */

function isDark() {
  return document.documentElement.getAttribute("data-theme") === "dark";
}

function updateThemeIcon() {
  if (els.themeToggle) {
    els.themeToggle.innerHTML = isDark() ? sunSvg : moonSvg;
  }
}

function toggleTheme() {
  const next = isDark() ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", next);
  localStorage.setItem("tokentotal-theme", next);
  updateThemeIcon();
}

/* ── Toast ── */

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  els.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.2s ease-in forwards";
    setTimeout(() => toast.remove(), 200);
  }, 2000);
}

/* ── Tab switching ── */

function isProUser() {
  return !!licenseStatus?.isPro;
}

function featureLabel(feature) {
  return proFeatureLabels[feature] || "Pro 功能";
}

function requirePro(feature, message = "") {
  if (isProUser()) return true;
  const text = message || `${featureLabel(feature)} 是 Pro 功能`;
  showToast(`${text}，请在设置页升级`, "warn");
  renderLicenseStatus();
  return false;
}

async function canAddHistoryEntry() {
  if (isProUser()) return true;
  const history = await storage.getHistory();
  if (history.length < FREE_HISTORY_LIMIT) return true;
  showToast(`免费版最多保留 ${FREE_HISTORY_LIMIT} 条历史记录，请升级 Pro 解锁不限历史`, "warn");
  return false;
}

function formatLicenseDate(value) {
  if (!value) return "永久";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知";
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function renderLicenseStatus() {
  if (!els.licensePlanBadge) return;
  const isPro = isProUser();
  els.licensePlanBadge.textContent = isPro ? "Pro" : "Free";
  els.licensePlanBadge.className = `license-plan-badge ${isPro ? "pro" : "free"}`;
  els.licenseStatusText.textContent = isPro
    ? "已激活 Pro，连接器、导出、本地聊天和高级转换已解锁。"
    : `免费版可做核心估算和基础瘦身，历史记录上限 ${FREE_HISTORY_LIMIT} 条。`;
  els.licenseAccount.textContent = isPro
    ? (licenseStatus.email || licenseStatus.customerName || licenseStatus.licenseId || "本机授权")
    : "未激活";
  els.licenseExpiry.textContent = isPro ? formatLicenseDate(licenseStatus.expiresAt) : "升级后显示";

  const features = isPro
    ? (licenseStatus.features || Object.keys(proFeatureLabels))
    : ["estimate", "promptSlim", "manualHistory"];
  const labels = {
    estimate: "Token 成本估算",
    promptSlim: "基础 Prompt 瘦身",
    manualHistory: `最多 ${FREE_HISTORY_LIMIT} 条历史记录`,
    ...proFeatureLabels,
  };
  els.licenseFeatureList.innerHTML = features
    .map((feature) => `<span>${escapeHtml(labels[feature] || feature)}</span>`)
    .join("");

  if (els.licenseDeactivate) els.licenseDeactivate.disabled = !isPro;
  if (els.licenseBuy) {
    const hasPurchaseUrl = !!licenseStatus.purchaseUrl;
    els.licenseBuy.textContent = hasPurchaseUrl ? "购买 Pro" : "Pro 内测说明";
    els.licenseBuy.disabled = !hasPurchaseUrl;
    els.licenseBuy.title = hasPurchaseUrl ? "打开购买页" : "当前免费版暂未开放自动购买";
  }
  if (els.licenseDevHint) {
    els.licenseDevHint.textContent = isPro && licenseStatus.source === "developer"
      ? "当前使用开发测试授权 TT-DEV-PRO，正式发布前需要配置授权公钥。"
      : "GitHub 免费版先开放核心能力；Pro 内测用户可手动输入 License Key。";
  }
}

async function refreshLicenseStatus() {
  licenseStatus = await storage.getLicenseStatus();
  renderLicenseStatus();
  return licenseStatus;
}

async function activateLicenseFromInput() {
  const key = els.licenseKey?.value?.trim() || "";
  if (!key) {
    showToast("请输入 License Key", "warn");
    return;
  }
  const original = els.licenseActivate.textContent;
  els.licenseActivate.disabled = true;
  els.licenseActivate.textContent = "激活中...";
  try {
    const result = await storage.activateLicense(key);
    if (result.success) {
      licenseStatus = result.status || await storage.getLicenseStatus();
      els.licenseKey.value = "";
      renderLicenseStatus();
      showToast("Pro 已激活", "success");
      return;
    }
    showToast(result.error || "License 激活失败", "warn");
  } finally {
    els.licenseActivate.disabled = false;
    els.licenseActivate.textContent = original;
  }
}

async function deactivateLicense() {
  const result = await storage.deactivateLicense();
  licenseStatus = result.status || await storage.getLicenseStatus();
  renderLicenseStatus();
  showToast("License 已停用", "info");
}

async function openPurchasePage() {
  const result = await storage.openPurchasePage();
  if (!result?.success) {
    showToast(result?.error || "购买链接暂未配置", "warn");
  }
}

function normalizeWorkspace(raw = {}) {
  const workspace = {
    ...DEFAULT_WORKSPACE,
    ...raw,
    wallet: { ...DEFAULT_WORKSPACE.wallet, ...(raw.wallet || {}) },
    security: { ...DEFAULT_WORKSPACE.security, ...(raw.security || {}) },
    members: Array.isArray(raw.members) && raw.members.length ? raw.members : DEFAULT_WORKSPACE.members,
  };
  if (!workspace.members.some((member) => member.id === workspace.activeMemberId)) {
    workspace.activeMemberId = workspace.members[0]?.id || "me";
  }
  return workspace;
}

async function getWorkspace() {
  const settings = await storage.getSettings();
  return normalizeWorkspace(settings.workspace || {});
}

async function saveWorkspace(workspace) {
  const normalized = normalizeWorkspace(workspace);
  await storage.setSetting("workspace", normalized);
  return normalized;
}

function currencySymbol(currency) {
  return currency === "CNY" ? "¥" : "$";
}

function toDisplayMoney(usd, workspace) {
  const currency = workspace?.wallet?.currency || "CNY";
  const value = currency === "CNY" ? Number(usd || 0) * CNY_PER_USD : Number(usd || 0);
  return `${currencySymbol(currency)}${value.toFixed(2)}`;
}

function walletBudgetUsd(workspace) {
  const wallet = workspace.wallet || DEFAULT_WORKSPACE.wallet;
  const amount = Number(wallet.monthlyBudget || 0);
  return wallet.currency === "CNY" ? amount / CNY_PER_USD : amount;
}

function monthRange() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).getTime() + 86400000;
  return { now, monthStart, monthEnd };
}

function memberForEntry(entry, workspace) {
  return workspace.members.find((member) => member.id === entry.memberId) || workspace.members[0];
}

function summarizeByMember(entries, workspace) {
  const summary = new Map();
  for (const member of workspace.members) {
    summary.set(member.id, {
      member,
      cost: 0,
      tokens: 0,
      calls: 0,
      risks: 0,
    });
  }
  for (const entry of entries) {
    const member = memberForEntry(entry, workspace);
    const row = summary.get(member.id) || { member, cost: 0, tokens: 0, calls: 0, risks: 0 };
    row.cost += Number(entry.cost || 0);
    row.tokens += Number(entry.inputTokens || 0) + Number(entry.outputTokens || 0);
    row.calls += 1;
    if (entry.security?.riskLevel && entry.security.riskLevel !== "low") row.risks += 1;
    summary.set(member.id, row);
  }
  return [...summary.values()];
}

function activeMember(workspace) {
  return workspace.members.find((member) => member.id === workspace.activeMemberId) || workspace.members[0];
}

function renderMemberOptions(select, workspace) {
  if (!select) return;
  select.innerHTML = workspace.members
    .map((member) => `<option value="${escapeHtml(member.id)}">${escapeHtml(member.name)}</option>`)
    .join("");
  select.value = workspace.activeMemberId;
}

async function setActiveMember(memberId) {
  const workspace = await getWorkspace();
  if (!workspace.members.some((member) => member.id === memberId)) return;
  workspace.activeMemberId = memberId;
  await saveWorkspace(workspace);
  await refreshWorkspaceViews();
}

async function refreshWorkspaceViews() {
  const activePage = document.querySelector(".tab-page.active")?.id || "";
  if (activePage === "pageDashboard") await refreshDashboard();
  if (activePage === "pageBudget") await refreshBudget();
  if (activePage === "pageTeam") await refreshTeam();
  if (activePage === "pageSecurity") await refreshSecurity();
}

function switchTab(tabName) {
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tabName);
    btn.setAttribute("aria-selected", btn.dataset.tab === tabName);
  });
  document.querySelectorAll(".tab-page").forEach((page) => {
    page.classList.toggle("active", page.id === "page" + tabName.charAt(0).toUpperCase() + tabName.slice(1));
  });

  // Refresh data when entering pages
  if (tabName === "dashboard") refreshDashboard();
  if (tabName === "chat") {
    refreshChatProxyStatus();
    loadChatModels();
  }
  if (tabName === "connectors") refreshConnectors();
  if (tabName === "history") refreshHistory();
  if (tabName === "budget") refreshBudget();
  if (tabName === "team") refreshTeam();
  if (tabName === "security") refreshSecurity();
}

/* ── Utilities ── */

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(Math.round(value || 0));
}

function formatMoney(value, precision = 4) {
  return `$${(value || 0).toFixed(precision)}`;
}

function selectedModel() {
  return models.find((m) => m.id === els.modelSelect.value) || models[0];
}

function selectedEstimateMode() {
  return estimateModes[els.estimateMode.value] || estimateModes.balanced;
}

function setupModels() {
  const providers = [];
  const seen = new Set();
  for (const m of models) {
    if (!seen.has(m.provider)) {
      seen.add(m.provider);
      providers.push(m.provider);
    }
  }
  els.modelSelect.innerHTML = providers
    .map((provider) => {
      const group = models.filter((m) => m.provider === provider);
      const options = group
        .map((m) => `<option value="${m.id}">${m.name}</option>`)
        .join("");
      return `<optgroup label="${provider}">${options}</optgroup>`;
    })
    .join("");
  els.modelSelect.value = "claude-sonnet-4";
  els.contextLimit.value = selectedModel().context;
}

function safeNumber(input, fallback = 0) {
  const value = Number(input.value);
  return Number.isFinite(value) ? value : fallback;
}

function countMatches(text, regex) {
  const matches = text.match(regex);
  return matches ? matches.length : 0;
}

function detectMessages(text) {
  const roleLines = text.match(
    /^\s*(system|user|assistant|developer|tool|function|客户|客服|用户|助手)\s*[:：]/gim
  );
  if (roleLines) return roleLines.length;

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item) => item && typeof item === "object" && "content" in item
      ).length;
    }
    if (Array.isArray(parsed.messages)) {
      return parsed.messages.length;
    }
  } catch {
    return text.trim() ? 1 : 0;
  }

  return text.trim() ? 1 : 0;
}

function estimateInputForText(text) {
  const mode = selectedEstimateMode();
  const estimate = estimateTokens(text);
  const messageCount = detectMessages(text);
  const overhead = els.chatMode.checked
    ? messageCount * Math.max(0, safeNumber(els.messageOverhead, 4)) +
      (messageCount ? 2 : 0)
    : 0;
  const adjustedBase = Math.ceil(estimate.base * mode.factor);
  return {
    estimate,
    mode,
    messageCount,
    overhead,
    adjustedBase,
    inputTokens: adjustedBase + overhead,
    lowerInputTokens: Math.max(0, Math.floor(adjustedBase * mode.low + overhead)),
    upperInputTokens: Math.ceil(adjustedBase * mode.high + overhead),
  };
}

/* ── Token estimation ── */

function estimateTokens(text) {
  const normalized = text.replace(/\r\n/g, "\n");
  const cjk = countMatches(
    normalized,
    /[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g
  );
  const latinWords =
    normalized.match(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g) || [];
  const numbers = normalized.match(/\d+(?:[.,:]\d+)*/g) || [];
  const symbols = countMatches(
    normalized,
    /[^\sA-Za-z0-9\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/g
  );
  const whitespaceRuns = normalized.match(/\s+/g) || [];

  const latinTokens = latinWords.reduce(
    (sum, word) => sum + Math.max(1, Math.ceil(word.length / 4)),
    0
  );
  const numberTokens = numbers.reduce(
    (sum, n) => sum + Math.max(1, Math.ceil(n.length / 3)),
    0
  );
  const symbolTokens = Math.ceil(symbols * 0.7);
  const whitespaceTokens = Math.ceil(whitespaceRuns.length * 0.15);
  const cjkTokens = Math.ceil(cjk * 1.05);

  const codeChars = countMatches(
    normalized,
    /[{}()[\]<>/=+*;._`|\\]/g
  );
  const charCount = [...normalized].length;
  const codeDensity = charCount ? codeChars / charCount : 0;
  const lexicalTotal =
    cjkTokens + latinTokens + numberTokens + symbolTokens + whitespaceTokens;
  const codeAdjustedTotal = Math.ceil(
    charCount / (codeDensity > 0.12 ? 3.15 : 3.75)
  );
  const base = Math.max(lexicalTotal, Math.ceil(codeAdjustedTotal * 0.72));

  return {
    base,
    charCount,
    cjk,
    latinWordCount: latinWords.length,
    lineCount: normalized.length ? normalized.split("\n").length : 0,
    codeDensity,
    buckets: {
      cjk: cjkTokens,
      latin: latinTokens,
      number: numberTokens,
      symbol: symbolTokens + whitespaceTokens,
    },
  };
}

/* ── Cost calculation ── */

function calculateForModel(model, inputTokens, outputTokens, cacheRatio) {
  const cachedTokens = Math.round(inputTokens * cacheRatio);
  const billableInput = Math.max(inputTokens - cachedTokens, 0);
  const inputCost = (billableInput * model.input) / 1_000_000;
  const cachedCost = (cachedTokens * model.cached) / 1_000_000;
  const outputCost = (outputTokens * model.output) / 1_000_000;

  return {
    inputCost,
    cachedCost,
    outputCost,
    total: inputCost + cachedCost + outputCost,
  };
}

function modelKeyFromHistory(entry) {
  return entry.modelId || entry.model || "Unknown";
}

function findCatalogModel(entry) {
  const modelId = String(entry.modelId || entry.model || "").toLowerCase();
  const modelName = String(entry.model || "").toLowerCase();
  return models.find((model) =>
    model.id.toLowerCase() === modelId ||
    model.name.toLowerCase() === modelName ||
    modelId.includes(model.id.toLowerCase()) ||
    modelName.includes(model.name.toLowerCase())
  );
}

function modelScenario(model) {
  return modelScenarioHints[model.id] || "通用替换候选";
}

function buildCostDiagnosis(monthHistory, amount, projected) {
  const paidHistory = monthHistory.filter((entry) => (entry.cost || 0) > 0);
  const totalCost = monthHistory.reduce((sum, entry) => sum + (entry.cost || 0), 0);
  const totalInput = monthHistory.reduce((sum, entry) => sum + (entry.inputTokens || 0), 0);
  const totalOutput = monthHistory.reduce((sum, entry) => sum + (entry.outputTokens || 0), 0);
  const totalCached = monthHistory.reduce((sum, entry) => sum + (entry.cachedInputTokens || 0), 0);

  if (monthHistory.length === 0) {
    return { cards: [], alternatives: [] };
  }

  const groups = new Map();
  for (const entry of monthHistory) {
    const key = `${entry.provider || "Unknown"}:${modelKeyFromHistory(entry)}`;
    const current = groups.get(key) || {
      provider: entry.provider || "Unknown",
      model: entry.model || entry.modelId || "Unknown",
      modelId: entry.modelId || entry.model || "",
      sourceTotals: {},
      inputTokens: 0,
      cachedInputTokens: 0,
      outputTokens: 0,
      cost: 0,
      count: 0,
      maxTokens: 0,
      sample: entry,
    };
    current.inputTokens += entry.inputTokens || 0;
    current.cachedInputTokens += entry.cachedInputTokens || 0;
    current.outputTokens += entry.outputTokens || 0;
    current.cost += entry.cost || 0;
    current.count += 1;
    current.maxTokens = Math.max(current.maxTokens, (entry.inputTokens || 0) + (entry.outputTokens || 0));
    const source = entry.source || "Unknown";
    current.sourceTotals[source] = (current.sourceTotals[source] || 0) + (entry.cost || 0);
    groups.set(key, current);
  }

  const sortedGroups = [...groups.values()].sort((a, b) => b.cost - a.cost);
  const top = sortedGroups[0];
  const cards = [];

  if (top && top.cost > 0) {
    const share = totalCost > 0 ? (top.cost / totalCost) * 100 : 0;
    const topSource = Object.entries(top.sourceTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || top.provider;
    cards.push({
      tone: share >= 60 ? "danger" : "warn",
      title: "主要贵在这里",
      value: `${top.provider} ${top.model}`,
      body: `${topSource} 贡献 ${formatMoney(top.cost, 2)}，占本月成本 ${share.toFixed(0)}%。`,
    });
  } else if (monthHistory.some((entry) => entry.provider === "Local")) {
    cards.push({
      tone: "good",
      title: "本地模型 API 成本为 0",
      value: "Ollama / Local",
      body: "当前记录主要是本地推理，预算页应重点看 token、耗时和是否需要更强模型。",
    });
  }

  const avgInput = monthHistory.length ? totalInput / monthHistory.length : 0;
  const outputRatio = totalInput + totalOutput > 0 ? totalOutput / (totalInput + totalOutput) : 0;
  const cacheRatio = totalInput > 0 ? totalCached / totalInput : 0;

  if (avgInput > 20000) {
    cards.push({
      tone: "warn",
      title: "上下文偏大",
      value: `${formatNumber(avgInput)} / 次`,
      body: "平均输入 token 很高，贵通常来自整段文件、历史上下文或工具输出被反复带入。",
    });
  }

  if (outputRatio > 0.45) {
    cards.push({
      tone: "warn",
      title: "输出占比偏高",
      value: `${Math.round(outputRatio * 100)}%`,
      body: "模型回复太长会明显抬高成本，可以限制输出长度或让模型先给摘要再展开。",
    });
  }

  if (totalInput > 50000 && cacheRatio < 0.1 && paidHistory.length > 0) {
    cards.push({
      tone: "warn",
      title: "缓存利用不足",
      value: `${Math.round(cacheRatio * 100)}%`,
      body: "大量重复上下文没有吃到缓存价格，适合拆系统提示词、固定上下文或换支持缓存收益更好的调用方式。",
    });
  }

  if (projected > amount && amount > 0) {
    cards.push({
      tone: "danger",
      title: "预算会超",
      value: formatMoney(projected, 2),
      body: `按当前速度月底约 ${formatMoney(projected, 2)}，超过预算 ${formatMoney(amount, 2)}。`,
    });
  }

  if (cards.length === 0) {
    cards.push({
      tone: "good",
      title: "成本结构健康",
      value: formatMoney(totalCost, 2),
      body: "目前没有明显异常。继续积累真实调用后，建议会更准确。",
    });
  }

  const alternatives = [];
  if (top && top.cost > 0 && top.inputTokens + top.outputTokens > 0) {
    const currentCatalog = findCatalogModel(top.sample);
    const cacheRatioForTop = top.inputTokens > 0 ? top.cachedInputTokens / top.inputTokens : 0;
    const minContext = Math.max(top.maxTokens, top.inputTokens + top.outputTokens > 0 ? Math.ceil((top.inputTokens + top.outputTokens) / Math.max(top.count, 1)) : 0);
    const currentCost = top.cost;
    const currentId = currentCatalog?.id || "";

    models
      .filter((model) => model.id !== currentId && model.context >= minContext)
      .map((model) => {
        const cost = calculateForModel(model, top.inputTokens, top.outputTokens, cacheRatioForTop).total;
        const saving = currentCost - cost;
        return {
          model,
          cost,
          saving,
          savingPct: currentCost > 0 ? (saving / currentCost) * 100 : 0,
        };
      })
      .filter((item) => item.saving > 0 && item.savingPct >= 10)
      .sort((a, b) => b.savingPct - a.savingPct)
      .slice(0, 5)
      .forEach((item) => alternatives.push(item));
  }

  return { cards: cards.slice(0, 4), alternatives };
}

function renderCostDiagnosis(monthHistory, amount, projected) {
  if (!els.costDiagnosisList || !els.recommendationTable || !els.recommendationEmpty) return;
  const diagnosis = buildCostDiagnosis(monthHistory, amount, projected);

  els.costDiagnosisList.innerHTML = diagnosis.cards
    .map((card) => `
      <article class="diagnosis-card diagnosis-${card.tone}">
        <span>${card.title}</span>
        <strong>${card.value}</strong>
        <p>${card.body}</p>
      </article>`)
    .join("");

  if (diagnosis.alternatives.length === 0) {
    els.recommendationTable.innerHTML = "";
    els.recommendationEmpty.classList.add("visible");
    return;
  }

  els.recommendationEmpty.classList.remove("visible");
  els.recommendationTable.innerHTML = diagnosis.alternatives
    .map((item) => `
      <tr>
        <td>${item.model.name}</td>
        <td><span class="provider-tag provider-${item.model.provider.toLowerCase()}">${item.model.provider}</span></td>
        <td>${formatMoney(item.cost, 2)}</td>
        <td>${formatMoney(item.saving, 2)} · ${item.savingPct.toFixed(0)}%</td>
        <td>${modelScenario(item.model)}</td>
      </tr>`)
    .join("");
}

/* ── UI rendering (Estimate page) ── */

function buildBars(buckets) {
  const total =
    Object.values(buckets).reduce((sum, v) => sum + v, 0) || 1;
  const labels = {
    cjk: "CJK",
    latin: "英文",
    number: "数字",
    symbol: "符号/空白",
    overhead: "协议开销",
  };

  els.tokenBars.innerHTML = Object.entries(buckets)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => {
      const pct = Math.max(2, (value / total) * 100);
      return `
        <div class="bar-row">
          <span>${labels[key]}</span>
          <div class="bar-track"><div class="bar-fill" style="width:${pct}%; background:${colors[key]}"></div></div>
          <strong>${formatNumber(value)}</strong>
        </div>`;
    })
    .join("");
}

function buildModelTable(
  inputTokens,
  outputTokens,
  cacheRatio,
  dailyCalls,
  workDays
) {
  const currentId = selectedModel().id;
  els.modelTable.innerHTML = models
    .map((model) => {
      const cost = calculateForModel(
        model,
        inputTokens,
        outputTokens,
        cacheRatio
      );
      const monthly = cost.total * dailyCalls * workDays;
      const cls = model.id === currentId ? ' class="selected"' : "";
      return `
        <tr${cls} data-model-id="${model.id}">
          <td class="provider-cell"><span class="provider-tag provider-${model.provider.toLowerCase()}">${model.provider}</span></td>
          <td>${model.name}</td>
          <td>${formatNumber(model.context)}</td>
          <td>${formatMoney(cost.total)}</td>
          <td>${formatMoney(monthly, 2)}</td>
        </tr>`;
    })
    .join("");
}

function renderInsights({
  text,
  model,
  inputTokens,
  highInputTokens,
  outputTokens,
  contextLimit,
  usagePct,
  cost,
  cacheSavingsMonthly,
  cheapest,
  monthly,
}) {
  if (!text.trim()) {
    els.insightList.innerHTML = `
      <div class="insight-item">
        <strong>等待文本</strong>
        <span>输入 prompt、文档或代码后，这里会给出上下文、成本和缓存建议。</span>
      </div>`;
    return;
  }

  const insights = [];
  const highUsagePct = ((highInputTokens + outputTokens) / contextLimit) * 100;

  if (highUsagePct >= 100) {
    insights.push({
      title: "上下文风险高",
      body: `估算上界会达到 ${highUsagePct.toFixed(1)}%，建议压缩输入或降低输出预算。`,
      level: "danger",
    });
  } else if (usagePct >= 70) {
    insights.push({
      title: "上下文接近上限",
      body: `当前占比 ${usagePct.toFixed(1)}%，预留空间不多，长回复可能顶到上限。`,
      level: "warn",
    });
  } else {
    insights.push({
      title: "上下文余量充足",
      body: `当前占比 ${usagePct.toFixed(1)}%，仍有 ${formatNumber(Math.max(0, contextLimit - inputTokens - outputTokens))} token 余量。`,
      level: "good",
    });
  }

  const outputShare = cost.total > 0 ? cost.outputCost / cost.total : 0;
  insights.push({
    title: outputShare > 0.6 ? "输出成本占比较高" : "成本结构清晰",
    body:
      outputShare > 0.6
        ? `输出约占 ${(outputShare * 100).toFixed(0)}%，限制 max output 能更直接控费。`
        : `输入与输出成本相对均衡，当前单次约 ${formatMoney(cost.total)}。`,
    level: outputShare > 0.6 ? "warn" : "good",
  });

  if (cacheSavingsMonthly > 0.01) {
    insights.push({
      title: "缓存有明显收益",
      body: `按当前调用量，缓存命中每月约节省 ${formatMoney(cacheSavingsMonthly, 2)}。`,
      level: "good",
    });
  } else {
    insights.push({
      title: "缓存收益有限",
      body: "当前缓存比例较低或输入规模较小，优先优化模型与输出预算。",
      level: "warn",
    });
  }

  if (cheapest && cheapest.model.id !== model.id && cheapest.monthly < monthly * 0.8) {
    const savingPct = (1 - cheapest.monthly / monthly) * 100;
    insights.push({
      title: "存在更低成本模型",
      body: `${cheapest.model.provider} ${cheapest.model.name} 约低 ${savingPct.toFixed(0)}%，适合做成本下限参考。`,
      level: "warn",
    });
  } else {
    insights.push({
      title: "当前模型成本可接受",
      body: `${model.provider} ${model.name} 在当前参数下月成本约 ${formatMoney(monthly, 2)}。`,
      level: "good",
    });
  }

  els.insightList.innerHTML = insights
    .map(
      (item) => `
        <div class="insight-item insight-${item.level}">
          <strong>${item.title}</strong>
          <span>${item.body}</span>
        </div>`
    )
    .join("");
}

function updatePrices(model) {
  els.inputPrice.textContent = `$${model.input.toFixed(3)}`;
  els.cachedPrice.textContent = `$${model.cached.toFixed(3)}`;
  els.outputPrice.textContent = `$${model.output.toFixed(3)}`;
}

function normalizeDuplicateKey(text) {
  return text
    .replace(/[：:]\s+/g, ":")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function tryMinifyJsonPrompt(text, notes) {
  const trimmed = text.trim();
  if (!/^[\[{]/.test(trimmed)) return "";
  try {
    const minified = JSON.stringify(JSON.parse(trimmed));
    if (minified.length < trimmed.length) {
      notes.push("压缩了 JSON 结构空白。");
      return minified;
    }
  } catch {
    // Not JSON; continue with text rules.
  }
  return "";
}

function replaceWithStats(text, pattern, replacement, stats) {
  const next = text.replace(pattern, replacement);
  if (next !== text) {
    stats.phrasePasses += 1;
    stats.removedChars += Math.max(0, text.length - next.length);
  }
  return next;
}

function applyPromptPhraseRules(text, mode, stats) {
  if (mode === "safe") return text;
  let next = text;
  [
    [/请你/g, ""],
    [/麻烦你?/g, ""],
    [/辛苦你?/g, ""],
    [/我希望你(?:能够|可以)?/g, ""],
    [/你需要做的是/g, ""],
    [/接下来请/g, ""],
    [/尽可能详细地/g, "详细地"],
    [/尽可能/g, ""],
    [/非常重要的是/g, "重要："],
    [/\bplease\s+/gi, ""],
    [/\bkindly\s+/gi, ""],
    [/\bI want you to\s+/gi, ""],
    [/\bYou are asked to\s+/gi, ""],
    [/\bmake sure to\s+/gi, "ensure "],
  ].forEach(([pattern, replacement]) => {
    next = replaceWithStats(next, pattern, replacement, stats);
  });

  if (mode === "aggressive") {
    [
      [/一定要确保/g, "确保"],
      [/请严格按照/g, "按"],
      [/不要忘记/g, "确保"],
      [/务必/g, ""],
      [/(?:^|\n)\s*(?:谢谢|感谢|thank you)\s*$/gim, ""],
    ].forEach(([pattern, replacement]) => {
      next = replaceWithStats(next, pattern, replacement, stats);
    });
  }

  return next;
}

function rewriteCommonPromptQuestion(line) {
  const text = line.trim();
  const rules = [
    [/^那?现在的(.+?)该怎么用[？?]?$/i, "说明$1用法。"],
    [/^(.+?)是什么[？?]?$/i, "解释$1。"],
    [/^我怎么验证(.+?)(?:的真实性)?[？?]?$/i, "说明如何验证$1真实性。"],
    [/^为什么(.+?)[？?]?$/i, "解释$1原因。"],
    [/^(.+?)为什么(.+?)[？?]?$/i, "解释$1为什么$2。"],
    [/^检查(.+?)再进行一下改善[。.!！?？]?$/i, "检查$1并改善。"],
    [/^看一下(.+?)再进行一下改善[。.!！?？]?$/i, "检查$1并改善。"],
    [/^开始(.+?)(?:功能)?[。.!！?？]?$/i, "实现$1功能。"],
  ];
  for (const [pattern, replacement] of rules) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }
  return text;
}

function compressPromptLine(line, mode, stats) {
  if (mode === "safe") return line;
  const original = line;
  let next = rewriteCommonPromptQuestion(line);

  [
    [/\bpropmt\b/gi, "prompt"],
    [/\banthorpic\b/gi, "Anthropic"],
    [/^(?:我想让你|我希望你|我需要你|我想请你)\s*/i, ""],
    [/帮我搞一个/g, "创建"],
    [/帮我做一个/g, "做"],
    [/帮我写一个/g, "写"],
    [/帮我设计一个/g, "设计"],
    [/帮我实现一个/g, "实现"],
    [/^(?:请你|请|麻烦你|麻烦|可以帮我|能不能帮我|能否帮我|帮我|请帮我|请你帮我)\s*/i, ""],
    [/^(?:我现在|我这边|我们现在)?(?:想要|想|需要|要)\s*/i, ""],
    [/^(?:你现在需要|你需要|你要|接下来你需要|接下来请你)\s*/i, ""],
    [/看一下/g, "检查"],
    [/改进一下/g, "改进"],
    [/改善一下/g, "改善"],
    [/，?\s*(?:你应该懂我意思吧|你懂我意思吧|明白我的意思吧)[。.!！?？]*$/i, ""],
    [/，?\s*(?:越详细越好|越完整越好|尽可能详细|尽可能完整)[。.!！?？]*$/i, ""],
    [/，?\s*(?:不要偷懒|认真一点|好好想想|仔细一点)[。.!！?？]*$/i, ""],
    [/[,，]?\s*(?:谢谢|感谢|thank you|thanks)[。.!！?？]*$/i, ""],
    [/(?:非常|特别|十分|尽可能|尽量|务必|一定要|千万要)\s*/g, ""],
    [/详细完整/g, "完整"],
    [/完整详细/g, "完整"],
    [/进行一下/g, ""],
    [/处理一下/g, "处理"],
    [/优化一下/g, "优化"],
    [/分析一下/g, "分析"],
    [/设计一下/g, "设计"],
    [/帮我/g, ""],
    [/请/g, ""],
    [/\s+/g, " "],
  ].forEach(([pattern, replacement]) => {
    next = replaceWithStats(next, pattern, replacement, stats);
  });

  if (mode === "aggressive") {
    [
      [/如果可以的话/g, ""],
      [/我感觉/g, ""],
      [/就是/g, ""],
      [/其实/g, ""],
      [/大概/g, ""],
      [/的话/g, ""],
      [/能不能/g, ""],
      [/可以吗/g, ""],
      [/好吗/g, ""],
    ].forEach(([pattern, replacement]) => {
      next = replaceWithStats(next, pattern, replacement, stats);
    });
  }

  next = next
    .replace(/\s*([，。；：、,.!?;:])\s*/g, "$1")
    .replace(/[，,]\s*$/g, "")
    .trim();

  if (next !== original.trim()) {
    stats.linePasses += 1;
  }
  return next;
}

function isLowValuePromptClause(text) {
  const normalized = text.trim().toLowerCase();
  return (
    !normalized ||
    /^(谢谢|感谢|thank you|thanks|好的|好)$/i.test(normalized) ||
    /^(请)?(?:认真|仔细)?(?:思考|分析)(?:一下)?$/.test(normalized) ||
    /^(你应该懂我意思吧|你懂我意思吧|明白我的意思吧)$/.test(normalized)
  );
}

function buildStructuredSlimFallback(text, mode, stats) {
  if (mode === "safe") return text;
  const trimmed = text.trim();
  if (!trimmed || /```/.test(trimmed)) return text;
  const looksLikeCode = /(?:function\s+\w+|class\s+\w+|=>|<\/?[a-z][\s\S]*>|;\s*$)/m.test(trimmed);
  if (looksLikeCode) return text;

  const clauses = trimmed
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, "。")
    .split(/[。！？!?；;]+/)
    .map((part) => compressPromptLine(part, mode, stats))
    .filter((part) => !isLowValuePromptClause(part));

  const unique = [];
  const seen = new Set();
  for (const clause of clauses) {
    const key = normalizeDuplicateKey(clause);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(clause);
  }

  if (unique.length === 0) return text;
  let candidate = unique.join(mode === "aggressive" ? "；" : "\n");
  if (unique.length === 1 && /[^\n。！？!?]$/.test(candidate)) candidate += "。";
  candidate = candidate.trim();

  const currentTokens = estimateTokens(text).base;
  const candidateTokens = estimateTokens(candidate).base;
  const currentLength = [...text.trim()].length;
  const candidateLength = [...candidate].length;
  if (
    candidate &&
    candidate !== text.trim() &&
    (candidateTokens < currentTokens || candidateLength < currentLength * 0.92)
  ) {
    stats.fallbackPasses += 1;
    return candidate;
  }

  return text;
}

function compactPromptSegment(segment, mode, stats) {
  const threshold = mode === "aggressive" ? 6 : mode === "standard" ? 12 : 22;
  let text = segment
    .replace(/\r\n/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+$/gm, "");

  text = applyPromptPhraseRules(text, mode, stats);

  const lines = text.split("\n");
  const seenLines = new Set();
  const compactedLines = [];
  for (const rawLine of lines) {
    const line = mode === "safe"
      ? rawLine.replace(/[ \t]+$/g, "")
      : compressPromptLine(rawLine, mode, stats);
    const key = normalizeDuplicateKey(line);
    const isSeparator = /^[-_=*#]{4,}$/.test(key);
    if (isSeparator && mode !== "safe") {
      stats.separatorLines += 1;
      continue;
    }
    if (key.length >= threshold && seenLines.has(key)) {
      stats.duplicateLines += 1;
      continue;
    }
    if (key) seenLines.add(key);
    compactedLines.push(line);
  }

  text = compactedLines.join("\n").replace(/\n{3,}/g, "\n\n");

  if (mode !== "safe") {
    const paragraphs = text.split(/\n{2,}/);
    const seenParagraphs = new Set();
    text = paragraphs
      .filter((paragraph) => {
        const key = normalizeDuplicateKey(paragraph);
        if (key.length < 40) return true;
        if (seenParagraphs.has(key)) {
          stats.duplicateParagraphs += 1;
          return false;
        }
        seenParagraphs.add(key);
        return true;
      })
      .join("\n\n");
  }

  return buildStructuredSlimFallback(text, mode, stats);
}

function slimPromptText(source, mode = "standard") {
  const notes = [];
  const stats = {
    duplicateLines: 0,
    duplicateParagraphs: 0,
    separatorLines: 0,
    phrasePasses: 0,
    linePasses: 0,
    fallbackPasses: 0,
    removedChars: 0,
  };

  const jsonPrompt = tryMinifyJsonPrompt(source, notes);
  let slimmed = jsonPrompt;
  if (!slimmed) {
    const blocks = source.replace(/\r\n/g, "\n").split(/(```[\s\S]*?```)/g);
    slimmed = blocks
      .map((block) => {
        if (block.startsWith("```")) return block.replace(/[ \t]+$/gm, "");
        return compactPromptSegment(block, mode, stats);
      })
      .join("")
      .replace(/[ \t]+$/gm, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  if (!slimmed) slimmed = source.trim();
  if (stats.duplicateLines) notes.push(`移除了 ${stats.duplicateLines} 行重复内容。`);
  if (stats.duplicateParagraphs) notes.push(`移除了 ${stats.duplicateParagraphs} 段重复内容。`);
  if (stats.separatorLines) notes.push(`移除了 ${stats.separatorLines} 行装饰分隔符。`);
  if (stats.linePasses) notes.push(`压缩了 ${stats.linePasses} 行日常口语表达。`);
  if (stats.fallbackPasses) notes.push("生成了更紧凑的结构化表达。");
  if (stats.phrasePasses) notes.push("压缩了礼貌套话和低信息密度表达。");
  if (mode === "aggressive") notes.push("激进模式会改写部分表达，建议人工快速复核。");
  if (notes.length === 0) notes.push("没有发现明显可安全压缩的内容。");

  return { text: slimmed, notes, stats };
}

function renderPromptSlimNotes(notes) {
  if (!els.promptSlimNotes) return;
  els.promptSlimNotes.innerHTML = notes
    .map((note) => `<span>${escapeHtml(note)}</span>`)
    .join("");
}

function renderPromptVariant(source, text, notes, mode) {
  const originalEstimate = estimateInputForText(source);
  const slimEstimate = estimateInputForText(text);
  const savedTokens = Math.max(0, originalEstimate.inputTokens - slimEstimate.inputTokens);
  const savedChars = Math.max(0, [...source].length - [...text].length);
  const cacheRatio = Math.max(0, Math.min(100, safeNumber(els.cacheRatio, 0))) / 100;
  const outputTokens = Math.max(0, safeNumber(els.outputTokens, 0));
  const dailyCalls = Math.max(1, safeNumber(els.dailyCalls, 1));
  const workDays = Math.max(1, safeNumber(els.workDays, 1));
  const model = selectedModel();
  const beforeCost = calculateForModel(model, originalEstimate.inputTokens, outputTokens, cacheRatio).total;
  const afterCost = calculateForModel(model, slimEstimate.inputTokens, outputTokens, cacheRatio).total;
  const singleSaving = Math.max(0, beforeCost - afterCost);
  const monthlySaving = singleSaving * dailyCalls * workDays;

  lastPromptSlim = {
    source,
    mode,
    text,
    originalTokens: originalEstimate.inputTokens,
    slimTokens: slimEstimate.inputTokens,
    savedTokens,
    singleSaving,
    monthlySaving,
  };

  els.promptSlimOutput.value = text;
  els.promptSlimOriginal.textContent = formatNumber(originalEstimate.inputTokens);
  els.promptSlimNew.textContent = formatNumber(slimEstimate.inputTokens);
  els.promptSlimSaved.textContent = savedTokens
    ? `${formatNumber(savedTokens)} (${Math.round((savedTokens / originalEstimate.inputTokens) * 100)}%)`
    : savedChars
      ? `0 (${formatNumber(savedChars)} 字符)`
      : "0";
  els.promptSlimSaving.textContent = monthlySaving > 0.0001
    ? `${formatMoney(singleSaving)} / 次`
    : "$0.0000";

  const renderedNotes = [...notes];
  if (monthlySaving > 0.01) {
    renderedNotes.push(`按当前调用量估算，每月可少花约 ${formatMoney(monthlySaving, 2)}。`);
  }
  if (savedTokens <= 0 && savedChars <= 0) {
    renderedNotes.push("当前版本没有比原文更短；不建议替换。");
  }
  renderPromptSlimNotes(renderedNotes);
}

function runPromptSlim() {
  const source = els.sourceText.value;
  if (!source.trim()) {
    showToast("先粘贴 prompt 再瘦身", "warn");
    return;
  }

  const mode = els.promptSlimMode?.value || "standard";
  const result = slimPromptText(source, mode);
  renderPromptVariant(source, result.text, result.notes, mode);
}

function cleanEnglishPromptResult(text) {
  return String(text || "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/^```(?:\w+)?\s*/i, "")
    .replace(/```$/i, "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .trim();
}

function fallbackEnglishPrompt(source) {
  const compact = slimPromptText(source, "aggressive").text;
  const translateNoun = (value) => {
    let text = String(value || "").trim();
    [
      [/token量化工具/gi, "a token quantification tool"],
      [/AI客户端/gi, "an AI client"],
      [/预算页/g, "the budget page"],
      [/连接器/g, "connectors"],
      [/本地模型/g, "local models"],
      [/提示词|prompt/gi, "prompt"],
      [/数据/g, "data"],
      [/真实性/g, "authenticity"],
      [/准确性/g, "accuracy"],
      [/成本/g, "cost"],
      [/用量/g, "usage"],
      [/统计/g, "analytics"],
      [/工具/g, "tool"],
      [/客户端/g, "client"],
      [/功能/g, "feature"],
      [/模型/g, "model"],
      [/产品/g, "product"],
      [/用户/g, "users"],
      [/这个/g, "this"],
      [/英文/g, "English"],
      [/中文/g, "Chinese"],
      [/瘦身/g, "compression"],
      [/我的|我/g, "my "],
    ].forEach(([pattern, replacement]) => {
      text = text.replace(pattern, ` ${replacement} `);
    });
    return text
      .replace(/\s+/g, " ")
      .replace(/\s+([,.!?;:])/g, "$1")
      .trim();
  };

  const templateRules = [
    [/^设计(.+?)[。.!！?？]*$/i, (match) => `Design ${translateNoun(match[1])}.`],
    [/^实现(.+?)[。.!！?？]*$/i, (match) => `Implement ${translateNoun(match[1])}.`],
    [/^创建(.+?)[。.!！?？]*$/i, (match) => `Create ${translateNoun(match[1])}.`],
    [/^(?:详细地)?分析(.+?)[。.!！?？]*$/i, (match) => `Analyze ${translateNoun(match[1])}.`],
    [/^解释(.+?)[。.!！?？]*$/i, (match) => `Explain ${translateNoun(match[1])}.`],
    [/^说明(.+?)用法[。.!！?？]*$/i, (match) => `Explain how to use ${translateNoun(match[1])}.`],
    [/^说明如何验证(.+?)真实性[。.!！?？]*$/i, (match) => `Explain how to verify the authenticity of ${translateNoun(match[1])}.`],
    [/^检查(.+?)并改善[。.!！?？]*$/i, (match) => `Review ${translateNoun(match[1])} and improve it.`],
    [/^(.+?)转英文[。.!！?？]*$/i, (match) => `Convert ${translateNoun(match[1])} to concise English.`],
  ];

  for (const [pattern, builder] of templateRules) {
    const match = compact.match(pattern);
    if (match) return builder(match).replace(/\s+/g, " ").trim();
  }

  return translateNoun(compact)
    .replace(/[。！？]+/g, ".")
    .replace(/[，、]+/g, ", ")
    .replace(/；+/g, "; ")
    .replace(/\s+/g, " ")
    .trim() || compact;
}

async function preferredPromptEnglishModel() {
  const current = els.chatModel?.value?.trim();
  if (current) return current;
  const result = await storage.listOllamaModels();
  if (result.success && result.models.length > 0) {
    const names = result.models.map((item) => item.name || item.model).filter(Boolean);
    return names.includes("qwen3:4b") ? "qwen3:4b" : names[0];
  }
  return "qwen3:4b";
}

async function convertPromptToEnglish() {
  const source = els.sourceText.value;
  if (!source.trim()) {
    showToast("先粘贴 prompt 再转英文", "warn");
    return;
  }
  if (!requirePro("promptEnglish", "Prompt 转英文")) return;

  const originalLabel = els.promptSlimEnglish?.textContent || "转英文";
  if (els.promptSlimEnglish) {
    els.promptSlimEnglish.textContent = "转换中...";
    els.promptSlimEnglish.disabled = true;
  }

  try {
    const model = await preferredPromptEnglishModel();
    const result = await storage.sendLocalChat({
      model,
      temperature: 0.1,
      messages: [
        {
          role: "system",
          content:
            "Convert the user's prompt into concise English. Preserve all concrete requirements, constraints, names, numbers, file paths, APIs, and model names. Remove filler and politeness. Return only the final English prompt, no explanation, no markdown, no quotes.",
        },
        {
          role: "user",
          content: source,
        },
      ],
    });

    if (result.success) {
      const english = cleanEnglishPromptResult(result.message);
      if (english) {
        renderPromptVariant(source, english, [
          `已使用本地模型 ${model} 生成英文精简版。`,
          "英文不保证一定省 token，请以本次对比结果为准。",
        ], "english");
        showToast("英文版 prompt 已生成", "success");
        return;
      }
    }

    const fallback = fallbackEnglishPrompt(source);
    renderPromptVariant(source, fallback, [
      result.error || "本地模型不可用，已使用离线词典兜底。",
      "离线英文转换只适合常见产品/开发提示词，请人工复核。",
    ], "english-fallback");
    showToast("已生成离线英文兜底版", "warn");
  } finally {
    if (els.promptSlimEnglish) {
      els.promptSlimEnglish.textContent = originalLabel;
      els.promptSlimEnglish.disabled = false;
    }
  }
}

function copyPromptSlimResult() {
  const text = els.promptSlimOutput?.value || "";
  if (!text.trim()) {
    showToast("还没有瘦身结果", "warn");
    return;
  }
  const copied = () => showToast("瘦身版已复制", "success");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(copied).catch(() => copyWithFallback(text, copied));
  } else {
    copyWithFallback(text, copied);
  }
}

function applyPromptSlimResult() {
  const text = els.promptSlimOutput?.value || "";
  if (!text.trim()) {
    showToast("还没有瘦身结果", "warn");
    return;
  }
  els.sourceText.value = text;
  update();
  showToast("已替换为瘦身版 prompt", "success");
}

/* ── Main update loop ── */

function update() {
  const text = els.sourceText.value;
  const model = selectedModel();
  const mode = selectedEstimateMode();
  const outputTokens = Math.max(0, safeNumber(els.outputTokens, 0));
  const contextLimit = Math.max(
    1,
    safeNumber(els.contextLimit, model.context)
  );
  const cacheRatio =
    Math.max(0, Math.min(100, safeNumber(els.cacheRatio, 0))) / 100;
  const dailyCalls = Math.max(1, safeNumber(els.dailyCalls, 1));
  const workDays = Math.max(1, safeNumber(els.workDays, 1));
  const inputEstimate = estimateInputForText(text);
  const estimate = inputEstimate.estimate;
  const messageCount = inputEstimate.messageCount;
  const overhead = inputEstimate.overhead;
  const inputTokens = inputEstimate.inputTokens;
  const lowerInputTokens = inputEstimate.lowerInputTokens;
  const upperInputTokens = inputEstimate.upperInputTokens;
  const usagePct = Math.min(
    999,
    ((inputTokens + outputTokens) / contextLimit) * 100
  );
  const cost = calculateForModel(model, inputTokens, outputTokens, cacheRatio);
  const noCacheCost = calculateForModel(model, inputTokens, outputTokens, 0);
  const monthly = cost.total * dailyCalls * workDays;
  const cacheSavingsMonthly = Math.max(0, (noCacheCost.total - cost.total) * dailyCalls * workDays);
  const cheapest = models
    .map((m) => {
      const modelCost = calculateForModel(m, inputTokens, outputTokens, cacheRatio);
      return {
        model: m,
        monthly: modelCost.total * dailyCalls * workDays,
      };
    })
    .sort((a, b) => a.monthly - b.monthly)[0];

  updatePrices(model);
  els.cacheLabel.textContent = `${Math.round(cacheRatio * 100)}%`;
  els.tokenCount.textContent = formatNumber(inputTokens);
  els.tokenConfidence.textContent = text.trim()
    ? `${mode.label} · 区间 ${formatNumber(lowerInputTokens)}-${formatNumber(upperInputTokens)}`
    : "等待输入";
  els.singleCost.textContent = formatMoney(cost.total);
  els.monthlyCost.textContent = formatMoney(monthly, 2);
  els.costBreakdown.textContent = `输入 ${formatMoney(cost.inputCost + cost.cachedCost)} / 输出 ${formatMoney(cost.outputCost)}`;
  els.callSummary.textContent = `${formatNumber(dailyCalls)} 次/日，${formatNumber(workDays)} 天`;
  els.contextUsage.textContent = `${usagePct.toFixed(1)}%`;
  els.gaugeFill.style.width = `${Math.min(100, usagePct)}%`;
  els.gaugeFill.className = usagePct > 90 ? "gauge-danger" : usagePct > 70 ? "gauge-warn" : "";
  els.charCount.textContent = formatNumber(estimate.charCount);
  els.wordCount.textContent = formatNumber(estimate.latinWordCount);
  els.cjkCount.textContent = formatNumber(estimate.cjk);
  els.lineCount.textContent = formatNumber(estimate.lineCount);
  els.messageCount.textContent = formatNumber(messageCount);
  els.codeDensity.textContent = `${Math.round(estimate.codeDensity * 100)}%`;

  buildBars({ ...estimate.buckets, overhead });
  buildModelTable(inputTokens, outputTokens, cacheRatio, dailyCalls, workDays);
  renderInsights({
    text,
    model,
    inputTokens,
    highInputTokens: upperInputTokens,
    outputTokens,
    contextLimit,
    usagePct,
    cost,
    cacheSavingsMonthly,
    cheapest,
    monthly,
  });

  lastReport = {
    model: model.name,
    modelId: model.id,
    provider: model.provider,
    estimateMode: mode.label,
    inputTokens,
    lowerInputTokens,
    upperInputTokens,
    outputTokens,
    contextLimit,
    usagePct,
    cacheRatio,
    singleCost: cost.total,
    monthlyCost: monthly,
    dailyCalls,
    workDays,
  };
}

/* ── Record estimation ── */

async function recordEstimation() {
  if (!lastReport || lastReport.inputTokens === 0) {
    showToast("没有可记录的估算结果", "warn");
    return;
  }
  if (!(await canAddHistoryEntry())) return;
  const workspace = await getWorkspace();
  const member = activeMember(workspace);
  const entry = {
    timestamp: Date.now(),
    model: lastReport.model,
    modelId: lastReport.modelId,
    provider: lastReport.provider,
    source: "Manual",
    estimateMode: lastReport.estimateMode,
    inputTokens: lastReport.inputTokens,
    lowerInputTokens: lastReport.lowerInputTokens,
    upperInputTokens: lastReport.upperInputTokens,
    outputTokens: lastReport.outputTokens,
    cost: lastReport.singleCost,
    cacheRatio: lastReport.cacheRatio,
    memberId: member?.id || "me",
    memberName: member?.name || "我",
  };
  await storage.addHistory(entry);
  showToast("已记录到历史", "success");
}

/* ── Copy report ── */

function copyReport() {
  if (!lastReport) return;
  const report = [
    `模型: ${lastReport.provider} ${lastReport.model}`,
    `估算策略: ${lastReport.estimateMode}`,
    `估算输入 token: ${formatNumber(lastReport.inputTokens)} (${formatNumber(lastReport.lowerInputTokens)}-${formatNumber(lastReport.upperInputTokens)})`,
    `预计输出 token: ${formatNumber(lastReport.outputTokens)}`,
    `上下文占比: ${lastReport.usagePct.toFixed(1)}% / ${formatNumber(lastReport.contextLimit)}`,
    `单次成本: ${formatMoney(lastReport.singleCost)}`,
    `月成本: ${formatMoney(lastReport.monthlyCost, 2)} (${formatNumber(lastReport.dailyCalls)} 次/日 x ${formatNumber(lastReport.workDays)} 天)`,
  ].join("\n");

  const markCopied = () => {
    const btn = els.copyReport;
    const original = btn.innerHTML;
    btn.textContent = "已复制";
    setTimeout(() => {
      btn.innerHTML = original;
    }, 1200);
  };

  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(report)
      .then(markCopied)
      .catch(() => copyWithFallback(report, markCopied));
  } else {
    copyWithFallback(report, markCopied);
  }
}

function copyWithFallback(text, onSuccess) {
  const helper = document.createElement("textarea");
  helper.value = text;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.inset = "0 auto auto 0";
  helper.style.opacity = "0";
  document.body.appendChild(helper);
  helper.select();
  try {
    document.execCommand("copy");
    onSuccess();
  } finally {
    document.body.removeChild(helper);
  }
}

/* ── Chat page ── */

function escapeHtml(text) {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function localOllamaProxyConfigFromInputs() {
  const savedTarget = els.proxyTarget?.value?.trim() || "";
  const useSavedTarget = els.proxyProvider?.value === "Local" && savedTarget;
  return {
    port: parseInt(els.proxyPort?.value, 10) || 8787,
    targetBaseUrl: useSavedTarget ? savedTarget : "http://127.0.0.1:11434",
    provider: "Local",
  };
}

function renderChatProxyStatus(status = {}) {
  if (!els.chatProxyStatus || !els.chatProxyUrl) return;
  const config = status.config || localOllamaProxyConfigFromInputs();
  const baseUrl = status.proxyBaseUrl || `http://127.0.0.1:${config.port || 8787}`;
  els.chatProxyStatus.textContent = status.running ? "统计已启用" : "统计未启用";
  els.chatProxyStatus.style.color = status.running ? "var(--green)" : "var(--muted)";
  els.chatProxyUrl.textContent = baseUrl;
}

async function refreshChatProxyStatus() {
  renderChatProxyStatus(await storage.getProxyStatus());
}

async function startChatProxy() {
  if (!requirePro("connectors", "自动统计代理")) {
    return { running: false, error: "需要 Pro" };
  }
  const status = await storage.startProxy(localOllamaProxyConfigFromInputs());
  if (status.error) {
    showToast(status.error, "warn");
    return status;
  }
  renderProxyStatus(status);
  renderChatProxyStatus(status);
  showToast("自动统计已启用", "success");
  return status;
}

async function loadChatModels(force = false) {
  if (chatModelsLoaded && !force) return;
  if (els.chatModelStatus) els.chatModelStatus.textContent = "正在读取 Ollama 模型...";
  const result = await storage.listOllamaModels();
  if (result.success && result.models.length > 0) {
    const names = result.models.map((item) => item.name || item.model).filter(Boolean);
    const current = els.chatModel.value.trim();
    const preferred = names.includes("qwen3:4b") ? "qwen3:4b" : names[0];
    els.chatModel.innerHTML = names
      .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
      .join("");
    els.chatModel.value =
      names.includes(current) && !(current === "qwen3:0.6b" && names.includes("qwen3:4b"))
        ? current
        : preferred;
    if (els.chatModelStatus) {
      els.chatModelStatus.textContent = `${names.length} 个模型 · 当前 ${els.chatModel.value}`;
    }
    chatModelsLoaded = true;
    if (force) showToast("Ollama 模型已刷新", "success");
    return;
  }

  els.chatModel.innerHTML = '<option value="qwen3:4b">qwen3:4b</option><option value="qwen3:0.6b">qwen3:0.6b</option>';
  if (!els.chatModel.value.trim()) els.chatModel.value = "qwen3:4b";
  if (els.chatModelStatus) {
    els.chatModelStatus.textContent = result.error || "未读取到 Ollama 模型";
  }
  if (force) showToast(result.error || "未读取到 Ollama 模型", "warn");
}

function renderChatMessages() {
  if (!els.chatThread) return;
  const visibleMessages = chatBusy
    ? [...chatMessages, { role: "assistant", content: "正在生成...", pending: true }]
    : [...chatMessages];

  if (visibleMessages.length === 0) {
    els.chatThread.innerHTML = '<div class="chat-empty visible" id="chatEmpty">暂无会话</div>';
    return;
  }

  els.chatThread.innerHTML = visibleMessages
    .map((message) => {
      const role = message.role === "user" ? "user" : "assistant";
      const label = role === "user" ? "你" : "模型";
      const pending = message.pending ? " pending" : "";
      return `
        <article class="chat-message ${role}${pending}">
          <div class="chat-role">${label}</div>
          <div class="chat-bubble">${escapeHtml(message.content)}</div>
        </article>`;
    })
    .join("");
  els.chatThread.scrollTop = els.chatThread.scrollHeight;
}

function renderChatStats(usage = {}) {
  if (!els.chatStatInput) return;
  const inputTokens = Number(usage.inputTokens || 0);
  const outputTokens = Number(usage.outputTokens || 0);
  const totalDurationMs = Number(usage.totalDurationMs || 0);
  const tokensPerSecond = Number(usage.tokensPerSecond || 0);
  els.chatStatInput.textContent = formatNumber(inputTokens);
  els.chatStatOutput.textContent = formatNumber(outputTokens);
  els.chatStatTotal.textContent = formatNumber(inputTokens + outputTokens);
  els.chatStatLatency.textContent = totalDurationMs ? `${formatNumber(totalDurationMs)} ms` : "0 ms";
  els.chatStatSpeed.textContent = tokensPerSecond ? `${tokensPerSecond.toFixed(1)} tok/s` : "0 tok/s";
}

function setChatBusy(next) {
  chatBusy = next;
  if (els.chatSend) {
    els.chatSend.disabled = next;
    els.chatSend.style.opacity = next ? "0.7" : "";
  }
  if (els.chatInput) els.chatInput.disabled = next;
  renderChatMessages();
}

function selectedChatModel() {
  return els.chatModel?.value?.trim() || "qwen3:0.6b";
}

/* ── Connectors page ── */

const connectorToolRows = [
  {
    tool: "Cursor / Windsurf",
    method: "配置 OpenAI-compatible base URL",
    precision: "响应含 usage 时精确",
    advice: "适合把云端或本地兼容接口统一走统计通道",
  },
  {
    tool: "Continue / Aider",
    method: "在配置文件里设置 baseUrl",
    precision: "精确或半精确",
    advice: "开发者最容易接入，建议优先支持",
  },
  {
    tool: "Cline / Roo Code",
    method: "选择 OpenAI-compatible provider",
    precision: "响应含 usage 时精确",
    advice: "适合 agent 工作流成本审计",
  },
  {
    tool: "LM Studio / vLLM / LocalAI",
    method: "作为目标服务接入统计通道",
    precision: "OpenAI usage 字段精确",
    advice: "适合本地或自托管模型成本/性能对比",
  },
  {
    tool: "ChatGPT / Claude 网页版",
    method: "暂无稳定接口",
    precision: "估算或导入",
    advice: "后续做浏览器插件或手动账单导入",
  },
];

function setStatusBadge(element, text, tone = "neutral") {
  if (!element) return;
  element.textContent = text;
  element.className = `status-badge status-${tone}`;
}

function proxyUrlFromStatus(status = {}) {
  const config = status.config || proxyConfigFromInputs();
  return status.proxyBaseUrl || `http://127.0.0.1:${config.port || 8787}`;
}

function renderConnectorToolTable() {
  if (!els.connectorToolTable) return;
  els.connectorToolTable.innerHTML = connectorToolRows
    .map((row) => `
      <tr>
        <td>${row.tool}</td>
        <td>${row.method}</td>
        <td>${row.precision}</td>
        <td>${row.advice}</td>
      </tr>`)
    .join("");
}

function renderConnectorState() {
  if (!els.connectorExactCount) return;
  const { ollamaModels, proxyStatus, settings } = lastConnectorState;
  const modelNames = ollamaModels.map((item) => item.name || item.model).filter(Boolean);
  const proxyRunning = !!proxyStatus?.running;
  const hasOpenAIKey = !!settings.hasOpenAIKey;
  const exactCount =
    (modelNames.length > 0 ? 1 : 0) +
    (proxyRunning ? 1 : 0) +
    (hasOpenAIKey ? 1 : 0) +
    (storage.isElectron ? 2 : 0);

  if (!isProUser()) {
    els.connectorExactCount.textContent = "Pro";
    els.connectorLocalModels.textContent = String(modelNames.length);
    els.connectorLocalModelNames.textContent = modelNames.length ? modelNames.slice(0, 3).join(" / ") : "未检测到 Ollama 模型";
    els.connectorProxyState.textContent = "未解锁";
    els.connectorProxyUrl.textContent = proxyUrlFromStatus(proxyStatus);
    els.connectorKeyState.textContent = hasOpenAIKey ? "已保存" : "未配置";
    setStatusBadge(els.connOllamaBadge, "Pro", "neutral");
    setStatusBadge(els.connCompatibleBadge, "Pro", "neutral");
    setStatusBadge(els.connCodexBadge, "Pro", "neutral");
    setStatusBadge(els.connClaudeBadge, "Pro", "neutral");
    els.connOllamaDetail.textContent = "本地模型聊天和自动 token 统计需要 Pro。";
    els.connCodexDetail.textContent = "Codex / Claude Code 本地日志同步需要 Pro。";
    els.connClaudeDetail.textContent = "Claude Code 本地日志同步需要 Pro。";
    els.connOpenAIDetail.textContent = "官方用量拉取和云端账单对账需要 Pro。";
    renderConnectorToolTable();
    return;
  }

  els.connectorExactCount.textContent = String(exactCount);
  els.connectorLocalModels.textContent = String(modelNames.length);
  els.connectorLocalModelNames.textContent = modelNames.length ? modelNames.slice(0, 3).join(" / ") : "未检测到 Ollama 模型";
  els.connectorProxyState.textContent = proxyRunning ? "已启用" : "未启用";
  els.connectorProxyUrl.textContent = proxyUrlFromStatus(proxyStatus);
  els.connectorKeyState.textContent = hasOpenAIKey ? "已保存" : "未配置";

  setStatusBadge(els.connOllamaBadge, modelNames.length ? "已连接" : "未连接", modelNames.length ? "good" : "warn");
  els.connOllamaDetail.textContent = modelNames.length
    ? `检测到 ${modelNames.length} 个模型：${modelNames.slice(0, 4).join(" / ")}。`
    : "未读取到模型。请确认 Ollama 已运行，或先安装模型。";

  setStatusBadge(els.connCompatibleBadge, proxyRunning ? "统计中" : "待启用", proxyRunning ? "good" : "neutral");
  setStatusBadge(els.connCodexBadge, "可同步", "good");
  const codexAudit = lastUsageAudit?.codex;
  if (codexAudit?.observedTotal?.records) {
    els.connCodexDetail.textContent =
      `精确日志 ${codexAudit.exact.records} 条，另观察到 ${formatNumber(codexAudit.observedTotal.totalUsageTokens)} total-only token；已按低置信记录补齐。`;
  }
  setStatusBadge(els.connClaudeBadge, "可同步", "good");
  els.connOpenAIDetail.textContent = hasOpenAIKey
    ? "API Key 已安全保存，可用于后续官方 usage/cost API。"
    : "未配置密钥。配置后可接官方 usage/cost API 和云模型聊天。";
  renderConnectorToolTable();
}

async function refreshConnectors(force = false) {
  if (force) showToast("正在刷新连接器状态...", "info");
  const [settings, proxyStatus, ollamaResult] = await Promise.all([
    storage.getSettings(),
    storage.getProxyStatus(),
    storage.listOllamaModels(),
  ]);
  lastConnectorState = {
    settings,
    proxyStatus,
    ollamaModels: ollamaResult.success ? ollamaResult.models : [],
  };
  renderConnectorState();
  if (force) {
    showToast(ollamaResult.success ? "连接器状态已刷新" : (ollamaResult.error || "连接器状态已刷新"), ollamaResult.success ? "success" : "warn");
  }
}

function copyProxyAddress() {
  const url = els.connectorProxyUrl?.textContent || els.proxyBaseUrl?.textContent || "http://127.0.0.1:8787";
  const copied = () => showToast("统计地址已复制", "success");
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(url).then(copied).catch(() => copyWithFallback(url, copied));
  } else {
    copyWithFallback(url, copied);
  }
}

function openSettingsForProxy() {
  switchTab("settings");
  els.proxyTarget?.focus();
}

function openSettingsForKey() {
  switchTab("settings");
  els.openaiKey?.focus();
}

async function sendChatMessage() {
  const content = els.chatInput.value.trim();
  if (!content) {
    showToast("请输入消息", "warn");
    return;
  }
  if (!requirePro("localChat", "本地模型聊天")) return;

  const model = selectedChatModel();
  const systemPrompt = els.chatSystemPrompt.value.trim();
  const requestMessages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...chatMessages,
    { role: "user", content },
  ];

  chatMessages.push({ role: "user", content });
  els.chatInput.value = "";
  setChatBusy(true);

  const result = await storage.sendLocalChat({
    model,
    messages: requestMessages,
    temperature: Number(els.chatTemperature.value),
  });

  setChatBusy(false);
  if (result.proxyStatus) {
    renderProxyStatus(result.proxyStatus);
    renderChatProxyStatus(result.proxyStatus);
  }

  if (!result.success) {
    chatMessages.pop();
    els.chatInput.value = content;
    renderChatMessages();
    showToast(result.error || "本地模型请求失败", "warn");
    return;
  }

  chatMessages.push({
    role: "assistant",
    content: result.message?.trim() || "(空响应)",
  });
  renderChatStats(result.usage);
  renderChatMessages();
  showToast("回复已记录到历史", "success");
  setTimeout(() => {
    refreshHistory();
    refreshBudget();
  }, 120);
}

/* ── Clipboard handling ── */

async function handleClipboardText(text) {
  // Switch to estimate tab
  switchTab("estimate");
  els.sourceText.value = text;
  update();
  showToast("剪贴板文本已载入", "info");

  // Auto-save if enabled
  const settings = await storage.getSettings();
  if (settings.autoSave && lastReport && lastReport.inputTokens > 0) {
    await recordEstimation();
  }
}

/* ── History page ── */

/* ── Local workspace dashboard ── */

async function currentMonthUsage() {
  const workspace = await getWorkspace();
  const history = await storage.getHistory();
  const { monthStart, monthEnd } = monthRange();
  const monthHistory = history.filter((entry) => entry.timestamp >= monthStart && entry.timestamp <= monthEnd);
  const confidence = summarizeConfidence(monthHistory);
  return { workspace, history, monthHistory, confidence };
}

async function refreshDashboard() {
  if (!els.dashboardSpend) return;
  const { workspace, monthHistory, confidence } = await currentMonthUsage();
  const budgetUsd = walletBudgetUsd(workspace);
  const remainingUsd = Math.max(0, budgetUsd - confidence.totalCost);
  const riskCount = monthHistory.filter((entry) => entry.security?.riskLevel && entry.security.riskLevel !== "low").length;

  els.dashboardSpend.textContent = toDisplayMoney(confidence.totalCost, workspace);
  els.dashboardBudget.textContent = toDisplayMoney(budgetUsd, workspace);
  els.dashboardRemaining.textContent = toDisplayMoney(remainingUsd, workspace);
  els.dashboardCalls.textContent = formatNumber(monthHistory.length);
  els.dashboardRisk.textContent = formatNumber(riskCount);
  els.dashboardActiveMember.textContent = activeMember(workspace)?.name || "未设置";
  renderMemberOptions(els.dashboardMemberSelect, workspace);

  const memberRows = summarizeByMember(monthHistory, workspace)
    .sort((a, b) => b.cost - a.cost)
    .map((row) => {
      const budget = Number(row.member.monthlyBudget || workspace.wallet.monthlyBudget || 0);
      const budgetUsdForMember = workspace.wallet.currency === "CNY" ? budget / CNY_PER_USD : budget;
      const pct = budgetUsdForMember > 0 ? Math.min(999, (row.cost / budgetUsdForMember) * 100) : 0;
      return `
        <tr>
          <td>${escapeHtml(row.member.name)}</td>
          <td>${escapeHtml(row.member.role || "Member")}</td>
          <td>${toDisplayMoney(row.cost, workspace)}</td>
          <td>${formatNumber(row.tokens)}</td>
          <td>${pct.toFixed(1)}%</td>
          <td>${row.risks ? `<span class="status-badge status-warn">${row.risks}</span>` : `<span class="status-badge status-good">0</span>`}</td>
        </tr>`;
    })
    .join("");
  if (els.dashboardMemberTable) els.dashboardMemberTable.innerHTML = memberRows;

  const alerts = [];
  const usedPct = budgetUsd > 0 ? (confidence.totalCost / budgetUsd) * 100 : 0;
  if (usedPct >= Number(workspace.wallet.warningPct || 80)) {
    alerts.push(`本月 AI 额度已使用 ${usedPct.toFixed(1)}%，接近或超过预警线。`);
  }
  if (riskCount > 0) {
    alerts.push(`本月检测到 ${riskCount} 条中高风险调用，请到安全页查看。`);
  }
  if (!monthHistory.length) {
    alerts.push("还没有本月用量。先通过估算、网关或本地日志同步产生记录。");
  }
  els.dashboardAlertList.innerHTML = alerts.map((item) => `<div class="insight-item"><strong>${escapeHtml(item)}</strong><span>本地策略提醒</span></div>`).join("");
}

function renderWalletTokenCapacity(workspace) {
  if (!els.walletTokenCapacity) return;
  const model = models.find((item) => item.id === workspace.wallet.tokenModelId) || models[0];
  const budgetUsd = walletBudgetUsd(workspace);
  const inputTokens = model.input > 0 ? Math.floor((budgetUsd / model.input) * 1_000_000) : 0;
  const outputTokens = model.output > 0 ? Math.floor((budgetUsd / model.output) * 1_000_000) : 0;
  els.walletUsdBudget.textContent = `$${budgetUsd.toFixed(2)}`;
  els.walletTokenCapacity.textContent = `${formatNumber(inputTokens)} 输入 token / ${formatNumber(outputTokens)} 输出 token`;
}

async function refreshWalletPanel(workspace, monthHistory) {
  if (!els.walletCurrency) return;
  els.walletCurrency.value = workspace.wallet.currency || "CNY";
  els.walletMonthlyBudget.value = workspace.wallet.monthlyBudget || 300;
  els.walletWarningPct.value = workspace.wallet.warningPct || 80;
  els.walletTokenModel.innerHTML = models
    .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.provider)} / ${escapeHtml(model.name)}</option>`)
    .join("");
  els.walletTokenModel.value = workspace.wallet.tokenModelId || "gpt-5-mini";
  renderWalletTokenCapacity(workspace);

  const rows = summarizeByMember(monthHistory, workspace)
    .map((row) => {
      const budget = Number(row.member.monthlyBudget || workspace.wallet.monthlyBudget || 0);
      const budgetUsdForMember = workspace.wallet.currency === "CNY" ? budget / CNY_PER_USD : budget;
      const remaining = Math.max(0, budgetUsdForMember - row.cost);
      return `
        <tr>
          <td>${escapeHtml(row.member.name)}</td>
          <td>${currencySymbol(workspace.wallet.currency)}${budget.toFixed(2)}</td>
          <td>${toDisplayMoney(row.cost, workspace)}</td>
          <td>${toDisplayMoney(remaining, workspace)}</td>
          <td>${formatNumber(row.tokens)}</td>
        </tr>`;
    })
    .join("");
  if (els.walletMemberTable) els.walletMemberTable.innerHTML = rows;
}

async function saveWalletSettings() {
  const workspace = await getWorkspace();
  workspace.wallet.currency = els.walletCurrency.value;
  workspace.wallet.monthlyBudget = Number(els.walletMonthlyBudget.value || 0);
  workspace.wallet.warningPct = Number(els.walletWarningPct.value || 80);
  workspace.wallet.tokenModelId = els.walletTokenModel.value;
  await saveWorkspace(workspace);
  showToast("钱包额度已保存", "success");
  await refreshBudget();
  await refreshDashboard();
}

async function refreshTeam() {
  if (!els.teamMemberTable) return;
  const { workspace, monthHistory } = await currentMonthUsage();
  renderMemberOptions(els.teamActiveMember, workspace);
  els.teamMemberTable.innerHTML = summarizeByMember(monthHistory, workspace)
    .map((row) => `
      <tr>
        <td>${escapeHtml(row.member.name)}</td>
        <td>${escapeHtml(row.member.role || "Member")}</td>
        <td>${currencySymbol(workspace.wallet.currency)}${Number(row.member.monthlyBudget || 0).toFixed(2)}</td>
        <td>${toDisplayMoney(row.cost, workspace)}</td>
        <td>${formatNumber(row.calls)}</td>
        <td>${row.member.enabled === false ? "禁用" : "启用"}</td>
      </tr>`)
    .join("");
}

async function addTeamMember() {
  const name = els.teamMemberName.value.trim();
  if (!name) {
    showToast("请填写成员名称", "warn");
    return;
  }
  const workspace = await getWorkspace();
  workspace.members.push({
    id: `m_${Date.now().toString(36)}`,
    name,
    role: els.teamMemberRole.value.trim() || "Member",
    monthlyBudget: Number(els.teamMemberBudget.value || workspace.wallet.monthlyBudget || 0),
    enabled: true,
    allowedModels: "all",
  });
  await saveWorkspace(workspace);
  els.teamMemberName.value = "";
  els.teamMemberRole.value = "";
  els.teamMemberBudget.value = "";
  showToast("成员已添加", "success");
  await refreshTeam();
  await refreshDashboard();
}

async function refreshSecurity() {
  if (!els.securityDetectSecrets) return;
  const { workspace, monthHistory } = await currentMonthUsage();
  const security = workspace.security;
  els.securityDetectSecrets.checked = !!security.detectSecrets;
  els.securityDetectPII.checked = !!security.detectPII;
  els.securityDetectCustomerData.checked = !!security.detectCustomerData;
  els.securityBlockHighRisk.checked = !!security.blockHighRisk;
  els.securityKeywords.value = security.customKeywords || "";

  const riskEntries = monthHistory.filter((entry) => entry.security?.riskLevel && entry.security.riskLevel !== "low");
  els.securitySummary.textContent = riskEntries.length
    ? `本月检测到 ${riskEntries.length} 条中高风险调用。`
    : "本月暂无中高风险调用。";
  els.securityRecentTable.innerHTML = riskEntries
    .slice()
    .reverse()
    .slice(0, 50)
    .map((entry) => {
      const date = new Date(entry.timestamp);
      const reasons = (entry.security?.reasons || []).join(" / ");
      return `
        <tr>
          <td>${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}</td>
          <td>${escapeHtml(memberForEntry(entry, workspace)?.name || "")}</td>
          <td><span class="status-badge status-warn">${escapeHtml(entry.security.riskLevel)}</span></td>
          <td>${escapeHtml(reasons)}</td>
          <td>${entry.blocked ? "已拦截" : "已提醒"}</td>
        </tr>`;
    })
    .join("");
}

async function saveSecuritySettings() {
  const workspace = await getWorkspace();
  workspace.security = {
    detectSecrets: els.securityDetectSecrets.checked,
    detectPII: els.securityDetectPII.checked,
    detectCustomerData: els.securityDetectCustomerData.checked,
    blockHighRisk: els.securityBlockHighRisk.checked,
    customKeywords: els.securityKeywords.value,
  };
  await saveWorkspace(workspace);
  showToast("安全策略已保存", "success");
  await refreshSecurity();
}

function confidenceForEntry(entry) {
  if (entry.confidence === "official") return "official";
  if (entry.observedOnly || entry.confidence === "observed") return "observed";
  if (entry.source === "Manual" || entry.estimateMode) return "estimated";
  return "exact";
}

function summarizeConfidence(entries) {
  return entries.reduce(
    (summary, entry) => {
      const tokens = Number(entry.inputTokens || 0) + Number(entry.outputTokens || 0);
      const cost = Number(entry.cost || 0);
      const confidence = confidenceForEntry(entry);
      summary.totalTokens += tokens;
      summary.totalCost += cost;
      summary.count += 1;
      if (confidence === "observed") {
        summary.observedTokens += tokens;
        summary.observedCost += cost;
        summary.observedCount += 1;
      } else if (confidence === "official") {
        summary.officialTokens += tokens;
        summary.officialCost += cost;
        summary.officialCount += 1;
      } else if (confidence === "estimated") {
        summary.estimatedTokens += tokens;
        summary.estimatedCost += cost;
        summary.estimatedCount += 1;
      } else {
        summary.exactTokens += tokens;
        summary.exactCost += cost;
        summary.exactCount += 1;
      }
      return summary;
    },
    {
      count: 0,
      totalTokens: 0,
      totalCost: 0,
      exactTokens: 0,
      exactCost: 0,
      exactCount: 0,
      observedTokens: 0,
      observedCost: 0,
      observedCount: 0,
      estimatedTokens: 0,
      estimatedCost: 0,
      estimatedCount: 0,
      officialTokens: 0,
      officialCost: 0,
      officialCount: 0,
    }
  );
}

function renderQualitySummary(summary) {
  if (!els.qualityExactTokens) return;
  const observedShare = summary.totalTokens > 0 ? summary.observedTokens / summary.totalTokens : 0;
  els.qualityExactTokens.textContent = formatNumber(summary.exactTokens + summary.officialTokens);
  els.qualityObservedTokens.textContent = formatNumber(summary.observedTokens);
  els.qualityEstimatedTokens.textContent = formatNumber(summary.estimatedTokens);

  if (summary.totalTokens === 0) {
    els.qualityStatus.textContent = "未同步";
    els.qualityWarning.textContent = "同步本地工具或接入官方账单后，这里会显示数据可信度。";
  } else if (summary.officialCount > 0 && summary.observedTokens === 0) {
    els.qualityStatus.textContent = "可对账";
    els.qualityWarning.textContent = "当前包含官方或精确记录，可用于趋势分析；最终结算仍以服务商账单为准。";
  } else if (observedShare > 0.25) {
    els.qualityStatus.textContent = "不可结算";
    els.qualityWarning.textContent = `低置信 token 占 ${Math.round(observedShare * 100)}%，当前只能做消耗审计和趋势判断，不能作为账单依据。`;
  } else {
    els.qualityStatus.textContent = "可参考";
    els.qualityWarning.textContent = "低置信占比较低，适合做趋势判断；成本仍是估算。";
  }
}

function confidenceBadge(entry) {
  const confidence = confidenceForEntry(entry);
  const labels = {
    official: "官方",
    exact: "精确",
    estimated: "估算",
    observed: "低置信",
  };
  return `<span class="confidence-badge confidence-${confidence}">${labels[confidence] || "未知"}</span>`;
}

async function refreshHistory() {
  const history = await storage.getHistory();
  const rangeDays = parseInt(els.historyRange.value) || 0;
  const now = Date.now();
  const cutoff = rangeDays > 0 ? now - rangeDays * 86400000 : 0;
  const filtered = history.filter((h) => h.timestamp >= cutoff);
  const confidence = summarizeConfidence(filtered);

  // Summary metrics
  const totalCount = filtered.length;
  const totalTokens = confidence.totalTokens;
  const totalCost = confidence.totalCost;

  // Days with data
  const daySet = new Set(filtered.map((h) => new Date(h.timestamp).toDateString()));
  const activeDays = daySet.size || 1;
  const dailyCost = totalCost / activeDays;

  els.histTotalCount.textContent = formatNumber(totalCount);
  els.histTotalTokens.textContent = formatNumber(totalTokens);
  els.histTotalCost.textContent = formatMoney(totalCost, 2);
  els.histDailyCost.textContent = formatMoney(dailyCost, 2);
  renderQualitySummary(confidence);

  // Table
  if (filtered.length === 0) {
    els.historyTable.innerHTML = "";
    els.historyEmpty.classList.add("visible");
  } else {
    els.historyEmpty.classList.remove("visible");
    els.historyTable.innerHTML = filtered
      .slice()
      .reverse()
      .slice(0, 200)
      .map((h) => {
        const date = new Date(h.timestamp);
        const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
        const sourceLabel = h.source || "Manual";
        const modelMeta = h.estimateMode ? `<small>${h.estimateMode}</small>` : "";
        return `
          <tr>
            <td>${timeStr}</td>
            <td>${sourceLabel}</td>
            <td>${escapeHtml(h.memberName || h.memberId || "我")}</td>
            <td><span class="provider-tag provider-${(h.provider || "").toLowerCase()}">${h.provider || ""}</span> ${h.model || ""} ${modelMeta}</td>
            <td>${formatNumber(h.inputTokens)}</td>
            <td>${formatNumber(h.outputTokens)}</td>
            <td>${confidenceBadge(h)}</td>
            <td>${formatMoney(h.cost)}</td>
          </tr>`;
      })
      .join("");
  }

  // Chart
  renderCostChart(filtered);
}

/* ── Canvas chart ── */

function renderCostChart(data) {
  const canvas = els.costChart;
  const ctx = canvas.getContext("2d");

  // High-DPI support
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  const W = rect.width;
  const H = rect.height;

  ctx.clearRect(0, 0, W, H);

  if (data.length === 0) {
    els.chartEmpty.classList.add("visible");
    return;
  }
  els.chartEmpty.classList.remove("visible");

  // Aggregate by day
  const dailyMap = {};
  data.forEach((h) => {
    const key = new Date(h.timestamp).toISOString().split("T")[0];
    dailyMap[key] = (dailyMap[key] || 0) + (h.cost || 0);
  });

  const sortedDays = Object.keys(dailyMap).sort();
  const values = sortedDays.map((d) => dailyMap[d]);

  // Read CSS vars for colors
  const style = getComputedStyle(document.documentElement);
  const green = style.getPropertyValue("--green").trim() || "#2f8f83";
  const muted = style.getPropertyValue("--muted").trim() || "#667085";
  const line = style.getPropertyValue("--line").trim() || "#d9dfd4";
  const ink = style.getPropertyValue("--ink").trim() || "#1c2430";

  // Chart dimensions
  const padLeft = 60;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 40;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const maxVal = Math.max(...values, 0.001);

  // Grid lines
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.5;
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const y = padTop + (chartH / gridLines) * i;
    ctx.beginPath();
    ctx.moveTo(padLeft, y);
    ctx.lineTo(padLeft + chartW, y);
    ctx.stroke();

    // Y-axis labels
    const val = maxVal - (maxVal / gridLines) * i;
    ctx.fillStyle = muted;
    ctx.font = "11px Inter, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(`$${val.toFixed(2)}`, padLeft - 8, y + 4);
  }

  // Plot line
  if (sortedDays.length === 1) {
    // Single point - draw a dot
    const x = padLeft + chartW / 2;
    const y = padTop + chartH * (1 - values[0] / maxVal);
    ctx.fillStyle = green;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const step = chartW / (sortedDays.length - 1);

    // Area fill
    ctx.beginPath();
    ctx.moveTo(padLeft, padTop + chartH);
    sortedDays.forEach((_, i) => {
      const x = padLeft + step * i;
      const y = padTop + chartH * (1 - values[i] / maxVal);
      ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + step * (sortedDays.length - 1), padTop + chartH);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, padTop, 0, padTop + chartH);
    grad.addColorStop(0, green + "33");
    grad.addColorStop(1, green + "05");
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    ctx.strokeStyle = green;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    sortedDays.forEach((_, i) => {
      const x = padLeft + step * i;
      const y = padTop + chartH * (1 - values[i] / maxVal);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Dots
    sortedDays.forEach((_, i) => {
      const x = padLeft + step * i;
      const y = padTop + chartH * (1 - values[i] / maxVal);
      ctx.fillStyle = green;
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  // X-axis labels (show up to ~10 labels)
  ctx.fillStyle = muted;
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "center";
  const labelStep = Math.max(1, Math.ceil(sortedDays.length / 10));
  const xStep = sortedDays.length > 1 ? chartW / (sortedDays.length - 1) : 0;
  sortedDays.forEach((day, i) => {
    if (i % labelStep === 0 || i === sortedDays.length - 1) {
      const x = sortedDays.length === 1 ? padLeft + chartW / 2 : padLeft + xStep * i;
      const parts = day.split("-");
      ctx.fillText(`${parts[1]}/${parts[2]}`, x, H - padBottom + 18);
    }
  });
}

/* ── Budget page ── */

function buildSyncAuditNote(result) {
  const audit = result?.audit?.codex;
  if (!audit?.observedTotal?.records) return "";
  const exactTotal = Number(audit.exact?.totalTokens || 0);
  const observedTotal = Number(audit.observedTotal?.totalUsageTokens || 0);
  if (observedTotal > exactTotal * 1.15) {
    return `；审计另见 ${formatNumber(observedTotal)} total-only token，已按低置信用量补齐`;
  }
  return "";
}

async function syncLocalUsage(source, options = {}) {
  const labels = { codex: "Codex", claude: "Claude Code", all: "全部来源" };
  if (!isProUser()) {
    if (!options.silent) requirePro("connectors", `${labels[source] || source} 同步`);
    return { success: false, error: "需要 Pro" };
  }
  if (!options.silent && els.syncStatus) {
    els.syncStatus.textContent = `正在同步 ${labels[source] || source}...`;
  }
  const result = await storage.scanLocalUsage(source);
  if (!result.success) {
    if (!options.silent) showToast(result.error || "同步失败", "warn");
    if (!options.silent && els.syncStatus) {
      els.syncStatus.textContent = result.error || "同步失败";
    }
    return;
  }

  const auditNote = buildSyncAuditNote(result);
  if (result.audit) lastUsageAudit = result.audit;
  const message = `已扫描 ${result.scanned} 条，新增 ${result.imported} 条${auditNote}`;
  if (!options.silent) {
    showToast(message, result.imported > 0 ? "success" : "info");
  }
  if (!options.silent && els.syncStatus) {
    els.syncStatus.textContent = `${labels[source] || source}：${message}。`;
  }
  await refreshHistory();
  await refreshBudget();
  return result;
}

async function autoSyncLocalUsage() {
  if (!storage.isElectron) return;
  const result = await syncLocalUsage("all", { silent: true });
  if (result?.imported > 0 && document.querySelector("#pageConnectors.active")) {
    await refreshConnectors();
  }
}

async function refreshBudget() {
  const budget = await storage.getBudget();
  const workspace = await getWorkspace();
  const amount = budget.amount || 50;
  const threshold = budget.threshold || 80;
  els.budgetAmount.value = amount;
  els.budgetThreshold.value = threshold;

  // Current month
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStart = new Date(year, month, 1).getTime();
  const monthEnd = new Date(year, month + 1, 0).getTime();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const dayOfMonth = now.getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  els.budgetPeriod.textContent = `${year} 年 ${month + 1} 月`;

  // Filter history for current month
  const history = await storage.getHistory();
  const monthHistory = history.filter(
    (h) => h.timestamp >= monthStart && h.timestamp <= monthEnd + 86400000
  );
  await refreshWalletPanel(workspace, monthHistory);
  const confidence = summarizeConfidence(monthHistory);

  const totalUsed = confidence.totalCost;
  const pct = amount > 0 ? (totalUsed / amount) * 100 : 0;
  const dailyAvg = dayOfMonth > 0 ? totalUsed / dayOfMonth : 0;
  const projected = dailyAvg * daysInMonth;
  const remaining = Math.max(0, amount - totalUsed);

  els.budgetUsed.textContent = formatMoney(totalUsed, 2);
  els.budgetTotal.textContent = formatMoney(amount, 2);
  els.budgetPct.textContent = `${Math.min(pct, 999).toFixed(1)}%`;
  els.budgetFill.style.width = `${Math.min(pct, 100)}%`;
  els.budgetFill.className = "budget-progress-fill" +
    (pct >= 100 ? " danger" : pct >= threshold ? " warn" : "");

  els.budgetDailyAvg.textContent = formatMoney(dailyAvg, 2);
  els.budgetProjected.textContent = formatMoney(projected, 2);
  els.budgetRemaining.textContent = formatMoney(remaining, 2);
  els.budgetDaysLeft.textContent = String(daysLeft);
  if (els.budgetQualityNote) {
    const observedShare = confidence.totalTokens > 0 ? confidence.observedTokens / confidence.totalTokens : 0;
    els.budgetQualityNote.textContent = confidence.totalTokens === 0
      ? "本页展示估算成本；官方账单接入前请不要用于结算或报销。"
      : `本月 ${Math.round(observedShare * 100)}% token 为低置信记录，预算仅用于趋势预警，不能作为官方账单。`;
  }
  renderCostDiagnosis(monthHistory, amount, projected);

  // Provider breakdown
  const providerTotals = {};
  monthHistory.forEach((h) => {
    const p = h.provider || "Unknown";
    providerTotals[p] = (providerTotals[p] || 0) + (h.cost || 0);
  });

  const providerEntries = Object.entries(providerTotals).sort((a, b) => b[1] - a[1]);
  const maxProvider = providerEntries.length > 0 ? providerEntries[0][1] : 1;

  if (providerEntries.length === 0) {
    els.providerBars.innerHTML = "";
    els.providerEmpty.classList.add("visible");
  } else {
    els.providerEmpty.classList.remove("visible");
    els.providerBars.innerHTML = providerEntries
      .map(([name, cost]) => {
        const pct = (cost / maxProvider) * 100;
        const color = providerColors[name] || "#888";
        return `
          <div class="provider-bar-row">
            <span>${name}</span>
            <div class="provider-bar-track">
              <div class="provider-bar-fill" style="width:${pct}%; background:${color}"></div>
            </div>
            <strong>${formatMoney(cost, 2)}</strong>
          </div>`;
      })
      .join("");
  }

  // Budget warning
  if (pct >= threshold && pct < 100) {
    showToast(`预算已使用 ${pct.toFixed(0)}%，接近预警阈值`, "warn");
  } else if (pct >= 100) {
    showToast("本月预算已超支！", "warn");
  }
}

/* ── Settings ── */

async function loadSettings() {
  const settings = await storage.getSettings();
  licenseStatus = settings.licenseStatus || await storage.getLicenseStatus();
  renderLicenseStatus();
  els.settingClipboard.checked = settings.clipboardWatch !== false;
  els.settingAutoSave.checked = !!settings.autoSave;
  els.settingStartMin.checked = !!settings.startMinimized;
  if (settings.proxy) {
    els.proxyPort.value = settings.proxy.port || 8787;
    els.proxyTarget.value = settings.proxy.targetBaseUrl || "http://127.0.0.1:11434";
    els.proxyProvider.value = settings.proxy.provider || "Local";
  }
  if (storage.isElectron && settings.hasOpenAIKey) {
    els.openaiKey.value = "";
    els.openaiKey.dataset.hasSaved = "true";
    els.openaiKey.placeholder = "已安全保存，留空使用已保存密钥";
  } else if (!storage.isElectron) {
    els.openaiKey.value = sessionStorage.getItem("tt-session-openai-key") || "";
    els.openaiKey.dataset.hasSaved = "";
  } else {
    els.openaiKey.value = "";
    els.openaiKey.dataset.hasSaved = "";
    els.openaiKey.placeholder = "sk-...";
  }
  await refreshProxyStatus();
}

function proxyConfigFromInputs() {
  return {
    port: parseInt(els.proxyPort.value, 10) || 8787,
    targetBaseUrl: els.proxyTarget.value.trim() || "http://127.0.0.1:11434",
    provider: els.proxyProvider.value,
  };
}

function renderProxyStatus(status) {
  const config = status.config || proxyConfigFromInputs();
  const baseUrl = status.proxyBaseUrl || `http://127.0.0.1:${config.port || 8787}`;
  els.proxyPort.value = config.port || 8787;
  els.proxyTarget.value = config.targetBaseUrl || "http://127.0.0.1:11434";
  els.proxyProvider.value = config.provider || "Local";
  els.proxyStatus.textContent = status.running ? "运行中" : "未运行";
  els.proxyStatus.style.color = status.running ? "var(--green)" : "var(--muted)";
  els.proxyBaseUrl.textContent = baseUrl;
}

async function refreshProxyStatus() {
  const status = await storage.getProxyStatus();
  renderProxyStatus(status);
  renderChatProxyStatus(status);
}

/* ── CSV export ── */

function csvEscape(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

async function exportCsv() {
  if (!requirePro("exportData", "CSV 导出")) return;
  const history = await storage.getHistory();
  if (history.length === 0) {
    showToast("暂无数据可导出", "warn");
    return;
  }

  const header = "timestamp,source,model,provider,estimateMode,inputTokens,lowerInputTokens,upperInputTokens,outputTokens,cost,cacheRatio,externalId";
  const rows = history.map((h) =>
    [
      new Date(h.timestamp).toISOString(),
      h.source || "",
      h.model || "",
      h.provider || "",
      h.estimateMode || "",
      h.inputTokens || 0,
      h.lowerInputTokens || "",
      h.upperInputTokens || "",
      h.outputTokens || 0,
      (h.cost || 0).toFixed(6),
      h.cacheRatio || 0,
      h.externalId || "",
    ].map(csvEscape).join(",")
  );
  const csv = [header, ...rows].join("\n");
  downloadFile(csv, `tokentotal-history-${new Date().toISOString().split("T")[0]}.csv`, "text/csv");
  showToast("CSV 已导出", "success");
}

/* ── CSV import ── */

async function importCsv(file) {
  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length < 2) {
    showToast("CSV 文件为空", "warn");
    return;
  }

  const headers = rows[0].map((h) => h.trim().toLowerCase());
  const entries = [];

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];
    if (values.length < 3) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = values[idx]?.trim() || "";
    });
    const parsedTime = obj.timestamp ? new Date(obj.timestamp).getTime() : Date.now();

    entries.push({
      timestamp: Number.isFinite(parsedTime) ? parsedTime : Date.now(),
      source: obj.source || "CSV",
      model: obj.model || "Unknown",
      provider: obj.provider || "Unknown",
      estimateMode: obj.estimatemode || obj.estimate_mode || "",
      inputTokens: parseInt(obj.inputtokens || obj.input_tokens || "0") || 0,
      lowerInputTokens: parseInt(obj.lowerinputtokens || obj.lower_input_tokens || "0") || 0,
      upperInputTokens: parseInt(obj.upperinputtokens || obj.upper_input_tokens || "0") || 0,
      outputTokens: parseInt(obj.outputtokens || obj.output_tokens || "0") || 0,
      cost: parseFloat(obj.cost || "0") || 0,
      cacheRatio: parseFloat(obj.cacheratio || obj.cache_ratio || "0") || 0,
      externalId: obj.externalid || obj.external_id || "",
    });
  }

  if (entries.length > 0) {
    await storage.importHistory(entries);
    showToast(`已导入 ${entries.length} 条记录`, "success");
  } else {
    showToast("未找到有效记录", "warn");
  }
}

/* ── Data export/clear ── */

function withoutSecrets(data) {
  const copy = JSON.parse(JSON.stringify(data || {}));
  if (copy.settings?.openaiKey) {
    copy.settings.openaiKey = "[redacted]";
  }
  if (copy.settings?.licenseKey) {
    copy.settings.licenseKey = "[redacted]";
  }
  if (copy.settings?.licenseKeyEncrypted) {
    copy.settings.licenseKeyEncrypted = "[redacted]";
  }
  return copy;
}

async function exportAllData() {
  if (!requirePro("exportData", "全部数据导出")) return;
  const data = withoutSecrets(await storage.getAllData());
  const json = JSON.stringify(data, null, 2);
  downloadFile(json, `tokentotal-data-${new Date().toISOString().split("T")[0]}.json`, "application/json");
  showToast("数据已导出", "success");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/* ── Events ── */

function bindEvents() {
  // Tab navigation
  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  // Estimate page inputs
  [
    els.sourceText,
    els.modelSelect,
    els.estimateMode,
    els.outputTokens,
    els.contextLimit,
    els.cacheRatio,
    els.dailyCalls,
    els.workDays,
    els.chatMode,
    els.messageOverhead,
  ].forEach((el) => el.addEventListener("input", update));

  els.modelSelect.addEventListener("change", () => {
    els.contextLimit.value = selectedModel().context;
    update();
  });

  els.filePicker.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    els.sourceText.value = await file.text();
    event.target.value = "";
    update();
  });

  els.loadSample.addEventListener("click", () => {
    els.sourceText.value = sampleText;
    update();
  });

  els.clearInput.addEventListener("click", () => {
    els.sourceText.value = "";
    update();
  });

  els.copyReport.addEventListener("click", copyReport);
  els.promptSlimRun?.addEventListener("click", runPromptSlim);
  els.promptSlimEnglish?.addEventListener("click", convertPromptToEnglish);
  els.promptSlimCopy?.addEventListener("click", copyPromptSlimResult);
  els.promptSlimApply?.addEventListener("click", applyPromptSlimResult);
  els.promptSlimMode?.addEventListener("change", () => {
    if (els.sourceText.value.trim()) runPromptSlim();
  });
  els.themeToggle.addEventListener("click", toggleTheme);
  els.recordEstimate.addEventListener("click", recordEstimation);

  // Click model row to select
  els.modelTable.addEventListener("click", (e) => {
    const row = e.target.closest("tr[data-model-id]");
    if (!row) return;
    els.modelSelect.value = row.dataset.modelId;
    els.contextLimit.value = selectedModel().context;
    update();
  });

  // Chat page
  els.refreshChatModels?.addEventListener("click", () => loadChatModels(true));
  els.clearChat?.addEventListener("click", () => {
    chatMessages = [];
    renderChatStats();
    renderChatMessages();
    showToast("会话已清空", "info");
  });
  els.chatStartProxy?.addEventListener("click", startChatProxy);
  els.chatSend?.addEventListener("click", sendChatMessage);
  els.chatInput?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && event.ctrlKey) {
      event.preventDefault();
      sendChatMessage();
    }
  });
  els.chatTemperature?.addEventListener("input", () => {
    els.chatTemperatureLabel.textContent = Number(els.chatTemperature.value).toFixed(1);
  });

  els.dashboardMemberSelect?.addEventListener("change", () => setActiveMember(els.dashboardMemberSelect.value));
  els.saveWallet?.addEventListener("click", saveWalletSettings);
  els.walletTokenModel?.addEventListener("change", async () => {
    const workspace = await getWorkspace();
    workspace.wallet.tokenModelId = els.walletTokenModel.value;
    renderWalletTokenCapacity(workspace);
  });
  els.teamAddMember?.addEventListener("click", addTeamMember);
  els.teamActiveMember?.addEventListener("change", () => setActiveMember(els.teamActiveMember.value));
  els.saveSecurity?.addEventListener("click", saveSecuritySettings);

  // Connectors page
  els.refreshConnectors?.addEventListener("click", () => refreshConnectors(true));
  els.connectorSyncAll?.addEventListener("click", async () => {
    await syncLocalUsage("all");
    await refreshConnectors();
  });
  els.connectorCopyProxy?.addEventListener("click", copyProxyAddress);
  els.connEnableOllama?.addEventListener("click", async () => {
    await startChatProxy();
    await refreshConnectors();
  });
  els.connRefreshOllama?.addEventListener("click", () => refreshConnectors(true));
  els.connCopyCompatible?.addEventListener("click", copyProxyAddress);
  els.connOpenRouterCopy?.addEventListener("click", copyProxyAddress);
  els.connOpenProxySettings?.addEventListener("click", openSettingsForProxy);
  els.connOpenAISettings?.addEventListener("click", openSettingsForKey);
  els.connAnthropicSettings?.addEventListener("click", () => {
    showToast("Anthropic 官方成本接口会在下一批连接器里接入", "info");
  });
  els.connSyncCodex?.addEventListener("click", async () => {
    await syncLocalUsage("codex");
    await refreshConnectors();
  });
  els.connSyncClaude?.addEventListener("click", async () => {
    await syncLocalUsage("claude");
    await refreshConnectors();
  });

  // History page
  els.historyRange.addEventListener("change", refreshHistory);
  els.exportCsv.addEventListener("click", exportCsv);
  els.clearHistory.addEventListener("click", async () => {
    if (confirm("确定要清除所有历史记录吗？此操作不可撤销。")) {
      await storage.clearHistory();
      showToast("历史已清除", "success");
      refreshHistory();
    }
  });

  // Budget page
  els.saveBudget.addEventListener("click", async () => {
    const amount = parseFloat(els.budgetAmount.value) || 50;
    const threshold = parseInt(els.budgetThreshold.value) || 80;
    await storage.setBudget({ amount, threshold });
    showToast("预算已保存", "success");
    refreshBudget();
  });

  els.syncCodex?.addEventListener("click", () => syncLocalUsage("codex"));
  els.syncClaude?.addEventListener("click", () => syncLocalUsage("claude"));
  els.syncAllUsage?.addEventListener("click", () => syncLocalUsage("all"));

  // Settings page
  els.licenseActivate?.addEventListener("click", activateLicenseFromInput);
  els.licenseKey?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") activateLicenseFromInput();
  });
  els.licenseDeactivate?.addEventListener("click", deactivateLicense);
  els.licenseBuy?.addEventListener("click", openPurchasePage);

  els.settingClipboard.addEventListener("change", async () => {
    await storage.setSetting("clipboardWatch", els.settingClipboard.checked);
  });

  els.settingAutoSave.addEventListener("change", async () => {
    await storage.setSetting("autoSave", els.settingAutoSave.checked);
  });

  els.settingStartMin.addEventListener("change", async () => {
    await storage.setSetting("startMinimized", els.settingStartMin.checked);
  });

  els.openaiKey.addEventListener("change", async () => {
    const result = await storage.setSetting("openaiKey", els.openaiKey.value);
    if (storage.isElectron && result?.success && els.openaiKey.value) {
      els.openaiKey.value = "";
      els.openaiKey.dataset.hasSaved = "true";
      els.openaiKey.placeholder = "已安全保存，留空使用已保存密钥";
      showToast("API Key 已安全保存", "success");
    } else if (storage.isElectron && result?.success && !result.hasOpenAIKey) {
      els.openaiKey.dataset.hasSaved = "";
      els.openaiKey.placeholder = "sk-...";
      showToast("API Key 已清除", "info");
    } else if (storage.isElectron && result?.error) {
      showToast(result.error, "warn");
    } else if (!storage.isElectron && els.openaiKey.value) {
      showToast("浏览器版已临时保存到当前会话", "info");
    }
  });

  [els.proxyPort, els.proxyTarget, els.proxyProvider].forEach((el) => {
    el?.addEventListener("change", async () => {
      await storage.setSetting("proxy", { ...proxyConfigFromInputs(), enabled: false });
      await refreshProxyStatus();
    });
  });

  els.startProxy?.addEventListener("click", async () => {
    if (!requirePro("connectors", "本地代理")) return;
    const status = await storage.startProxy(proxyConfigFromInputs());
    if (status.error) {
      showToast(status.error, "warn");
    } else {
      renderProxyStatus(status);
      renderChatProxyStatus(status);
      showToast("本地代理已启动", "success");
    }
  });

  els.stopProxy?.addEventListener("click", async () => {
    const status = await storage.stopProxy();
    renderProxyStatus(status);
    renderChatProxyStatus(status);
    showToast("本地代理已停止", "info");
  });

  els.copyProxyUrl?.addEventListener("click", () => {
    const url = els.proxyBaseUrl.textContent;
    const copied = () => showToast("代理地址已复制", "success");
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(copied).catch(() => copyWithFallback(url, copied));
    } else {
      copyWithFallback(url, copied);
    }
  });

  els.fetchUsage.addEventListener("click", async () => {
    if (!requirePro("cloudUsage", "官方用量拉取")) return;
    const key = els.openaiKey.value.trim();
    const hasSavedKey = storage.isElectron && els.openaiKey.dataset.hasSaved === "true";
    if (!key && !hasSavedKey) {
      showToast("请先填入 API Key", "warn");
      return;
    }
    if (storage.isElectron) {
      showToast("正在拉取...", "info");
      const result = await window.electronAPI.fetchOpenAIUsage(key || "");
      if (result.success) {
        showToast("用量数据拉取成功", "success");
      } else {
        showToast(`拉取失败: ${result.error}`, "warn");
      }
    } else {
      showToast("API 拉取仅在桌面应用中可用", "warn");
    }
  });

  els.csvPicker.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    await importCsv(file);
    event.target.value = "";
    refreshHistory();
  });

  els.exportAllData.addEventListener("click", exportAllData);

  els.clearAllData.addEventListener("click", async () => {
    if (confirm("确定要清除全部数据吗？包括历史、预算和设置。此操作不可撤销。")) {
      await storage.clearAllData();
      els.openaiKey.value = "";
      await loadSettings();
      refreshHistory();
      refreshBudget();
      showToast("全部数据已清除", "success");
    }
  });

  // Clipboard monitoring (Electron)
  if (storage.isElectron) {
    window.electronAPI.onClipboardText(handleClipboardText);
  }

  // Chart resize
  window.addEventListener("resize", () => {
    const activePage = document.querySelector(".tab-page.active");
    if (activePage && activePage.id === "pageHistory") {
      refreshHistory();
    }
  });
}

/* ── Init ── */

updateThemeIcon();
setupModels();
renderChatMessages();
renderChatStats();
bindEvents();
update();
loadSettings().then(() => {
  refreshDashboard();
  refreshChatProxyStatus();
  if (storage.isElectron) {
    autoSyncLocalUsage();
    setInterval(autoSyncLocalUsage, 5 * 60 * 1000);
  }
});
