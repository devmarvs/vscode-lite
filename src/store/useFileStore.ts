import { create } from 'zustand';

export type ActivityBarItem = 'explorer' | 'search' | 'git' | 'extensions' | 'settings' | 'codex';

export type EditorWhitespace = 'none' | 'boundary' | 'all';

export interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  tabSize: number;
  renderWhitespace: EditorWhitespace;
}

export interface File {
  id: string;
  name: string;
  content: string;
  language: string;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  tabSize: 2,
  renderWhitespace: 'boundary',
};

export interface CodexSettings {
  model: string;
}

export const DEFAULT_CODEX_SETTINGS: CodexSettings = {
  model: 'gpt-5.1-codex',
};

const SETTINGS_STORAGE_KEY = 'lite_vscode_editor_settings';
const EXTENSIONS_STORAGE_KEY = 'installed_extensions';
const EXTENSION_METADATA_STORAGE_KEY = 'installed_extension_metadata';
const CODEX_SETTINGS_STORAGE_KEY = 'lite_vscode_codex_settings';
const CODEX_API_KEY_SESSION_KEY = 'lite_vscode_codex_api_key';
const SIDEBAR_WIDTH_STORAGE_KEY = 'lite_vscode_sidebar_width';
const TERMINAL_HEIGHT_STORAGE_KEY = 'lite_vscode_terminal_height';
const FILES_STORAGE_KEY = 'lite_vscode_files';
const ACTIVE_FILE_STORAGE_KEY = 'lite_vscode_active_file';
const TERMINAL_OPEN_STORAGE_KEY = 'lite_vscode_terminal_open';

const normalizeEditorSettings = (settings: Partial<EditorSettings>): EditorSettings => {
  const fontSizeRaw = typeof settings.fontSize === 'number' ? settings.fontSize : DEFAULT_EDITOR_SETTINGS.fontSize;
  const tabSizeRaw = typeof settings.tabSize === 'number' ? settings.tabSize : DEFAULT_EDITOR_SETTINGS.tabSize;
  const renderWhitespace = settings.renderWhitespace;

  return {
    fontSize: Math.min(24, Math.max(12, fontSizeRaw)),
    tabSize: tabSizeRaw === 2 || tabSizeRaw === 4 || tabSizeRaw === 8 ? tabSizeRaw : DEFAULT_EDITOR_SETTINGS.tabSize,
    wordWrap: settings.wordWrap ?? DEFAULT_EDITOR_SETTINGS.wordWrap,
    minimap: settings.minimap ?? DEFAULT_EDITOR_SETTINGS.minimap,
    lineNumbers: settings.lineNumbers ?? DEFAULT_EDITOR_SETTINGS.lineNumbers,
    renderWhitespace: renderWhitespace === 'none' || renderWhitespace === 'boundary' || renderWhitespace === 'all'
      ? renderWhitespace
      : DEFAULT_EDITOR_SETTINGS.renderWhitespace,
  };
};

const clampSidebarWidth = (value: number) => Math.min(520, Math.max(200, value));
const clampTerminalHeight = (value: number) => Math.min(480, Math.max(120, value));

const initialFiles: File[] = [
  {
    id: '1',
    name: 'App.tsx',
    language: 'typescript',
    content: `import React from 'react';

export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
    </div>
  );
}`
  },
  {
    id: '2',
    name: 'utils.ts',
    language: 'typescript',
    content: `export const add = (a: number, b: number) => a + b;`
  },
  {
    id: '3',
    name: 'styles.css',
    language: 'css',
    content: `body { background: #1e1e1e; color: #fff; }`
  }
];

const loadEditorSettings = (): EditorSettings => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_EDITOR_SETTINGS };
    }

    return normalizeEditorSettings(JSON.parse(stored) as Partial<EditorSettings>);
  } catch {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
};

const persistEditorSettings = (settings: EditorSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
};

const loadInstalledExtensions = (): Record<string, boolean> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(EXTENSIONS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

const loadCodexSettings = (): CodexSettings => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_CODEX_SETTINGS };
  }

  try {
    const stored = window.localStorage.getItem(CODEX_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_CODEX_SETTINGS };
    }

    const parsed = JSON.parse(stored) as Partial<CodexSettings>;
    const model = typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : DEFAULT_CODEX_SETTINGS.model;
    return { model };
  } catch {
    return { ...DEFAULT_CODEX_SETTINGS };
  }
};

const persistCodexSettings = (settings: CodexSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CODEX_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures.
  }
};

const loadCodexApiKey = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage.getItem(CODEX_API_KEY_SESSION_KEY);
  } catch {
    return null;
  }
};

const persistCodexApiKey = (key: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (key) {
      window.sessionStorage.setItem(CODEX_API_KEY_SESSION_KEY, key);
    } else {
      window.sessionStorage.removeItem(CODEX_API_KEY_SESSION_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
};

const loadSidebarWidth = (): number => {
  if (typeof window === 'undefined') {
    return 260;
  }

  try {
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    if (!Number.isFinite(parsed)) {
      return 260;
    }
    return clampSidebarWidth(parsed);
  } catch {
    return 260;
  }
};

const persistSidebarWidth = (width: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Ignore storage failures.
  }
};

const loadTerminalHeight = (): number => {
  if (typeof window === 'undefined') {
    return 192;
  }

  try {
    const stored = window.localStorage.getItem(TERMINAL_HEIGHT_STORAGE_KEY);
    const parsed = stored ? Number(stored) : NaN;
    if (!Number.isFinite(parsed)) {
      return 192;
    }
    return clampTerminalHeight(parsed);
  } catch {
    return 192;
  }
};

const persistTerminalHeight = (height: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TERMINAL_HEIGHT_STORAGE_KEY, String(height));
  } catch {
    // Ignore storage failures.
  }
};

const isValidFile = (file: unknown): file is File =>
  !!file
  && typeof (file as File).id === 'string'
  && typeof (file as File).name === 'string'
  && typeof (file as File).content === 'string'
  && typeof (file as File).language === 'string';

const loadFiles = (): File[] => {
  if (typeof window === 'undefined') {
    return [...initialFiles];
  }

  try {
    const stored = window.localStorage.getItem(FILES_STORAGE_KEY);
    if (!stored) {
      return [...initialFiles];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [...initialFiles];
    }

    const next = parsed.filter(isValidFile);
    return next.length > 0 ? next : [...initialFiles];
  } catch {
    return [...initialFiles];
  }
};

const persistFiles = (files: File[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  } catch {
    // Ignore storage failures.
  }
};

const loadActiveFileId = (files: File[]): string | null => {
  if (typeof window === 'undefined') {
    return files[0]?.id ?? null;
  }

  try {
    const stored = window.localStorage.getItem(ACTIVE_FILE_STORAGE_KEY);
    if (stored && files.some((file) => file.id === stored)) {
      return stored;
    }
  } catch {
    // Ignore storage failures.
  }

  return files[0]?.id ?? null;
};

const persistActiveFileId = (id: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_FILE_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_FILE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
};

const loadTerminalOpen = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(TERMINAL_OPEN_STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
};

const persistTerminalOpen = (open: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TERMINAL_OPEN_STORAGE_KEY, String(open));
  } catch {
    // Ignore storage failures.
  }
};

export interface InstalledExtensionMetadata {
  id: string;
  name?: string;
  displayName?: string;
  namespace?: string;
  version?: string;
  icon?: string;
}

const loadInstalledExtensionMetadata = (): Record<string, InstalledExtensionMetadata> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(EXTENSION_METADATA_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, InstalledExtensionMetadata>) : {};
  } catch {
    return {};
  }
};

const persistInstalledExtensions = (extensions: Record<string, boolean>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(EXTENSIONS_STORAGE_KEY, JSON.stringify(extensions));
  } catch {
    // Ignore storage failures.
  }
};

const persistInstalledExtensionMetadata = (metadata: Record<string, InstalledExtensionMetadata>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(EXTENSION_METADATA_STORAGE_KEY, JSON.stringify(metadata));
  } catch {
    // Ignore storage failures.
  }
};

export interface CodexMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface FileStore {
  files: File[];
  activeFileId: string | null;
  sidebarVisible: boolean;
  terminalOpen: boolean;
  activeActivityBarItem: ActivityBarItem;
  editorSettings: EditorSettings;
  installedExtensions: Record<string, boolean>;
  installedExtensionMetadata: Record<string, InstalledExtensionMetadata>;
  codexSettings: CodexSettings;
  codexApiKey: string | null;
  codexDrawerOpen: boolean;
  codexModalOpen: boolean;
  codexMessages: CodexMessage[];
  sidebarWidth: number;
  terminalHeight: number;
  
  // Actions
  addFile: (name: string, language: string) => void;
  deleteFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  toggleTerminal: () => void;
  setActiveActivityBarItem: (item: ActivityBarItem) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  resetEditorSettings: () => void;
  installExtension: (id: string, metadata?: InstalledExtensionMetadata) => void;
  uninstallExtension: (id: string) => void;
  setCodexApiKey: (key: string) => void;
  clearCodexApiKey: () => void;
  setCodexModel: (model: string) => void;
  toggleCodexDrawer: () => void;
  setCodexDrawerOpen: (open: boolean) => void;
  openCodexModal: () => void;
  closeCodexModal: () => void;
  addCodexMessage: (message: CodexMessage) => void;
  clearCodexMessages: () => void;
  setSidebarWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
}

const initialFilesState = loadFiles();
const initialActiveFileId = loadActiveFileId(initialFilesState);

export const useFileStore = create<FileStore>((set) => ({
  files: initialFilesState,
  activeFileId: initialActiveFileId,
  sidebarVisible: true,
  terminalOpen: loadTerminalOpen(),
  activeActivityBarItem: 'explorer',
  editorSettings: loadEditorSettings(),
  installedExtensions: loadInstalledExtensions(),
  installedExtensionMetadata: loadInstalledExtensionMetadata(),
  codexSettings: loadCodexSettings(),
  codexApiKey: loadCodexApiKey(),
  codexDrawerOpen: false,
  codexModalOpen: false,
  codexMessages: [],
  sidebarWidth: loadSidebarWidth(),
  terminalHeight: loadTerminalHeight(),

  addFile: (name, language) => set((state) => {
    const newFile: File = {
      id: crypto.randomUUID(),
      name,
      language,
      content: ''
    };
    const nextFiles = [...state.files, newFile];
    persistFiles(nextFiles);
    persistActiveFileId(newFile.id);
    return { files: nextFiles, activeFileId: newFile.id };
  }),

  deleteFile: (id) => set((state) => {
    const nextFiles = state.files.filter(f => f.id !== id);
    const nextActive = state.activeFileId === id ? (nextFiles[0]?.id ?? null) : state.activeFileId;
    persistFiles(nextFiles);
    persistActiveFileId(nextActive);
    return {
      files: nextFiles,
      activeFileId: nextActive
    };
  }),

  updateFileContent: (id, content) => set((state) => {
    const nextFiles = state.files.map(f => f.id === id ? { ...f, content } : f);
    persistFiles(nextFiles);
    return { files: nextFiles };
  }),

  setActiveFile: (id) => set(() => {
    persistActiveFileId(id);
    return { activeFileId: id };
  }),
  
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  
  toggleTerminal: () => set((state) => {
    const next = !state.terminalOpen;
    persistTerminalOpen(next);
    return { terminalOpen: next };
  }),

  setActiveActivityBarItem: (item) => set({ activeActivityBarItem: item, sidebarVisible: true }),

  updateEditorSettings: (settings) => set((state) => {
    const next = normalizeEditorSettings({ ...state.editorSettings, ...settings });
    persistEditorSettings(next);
    return { editorSettings: next };
  }),

  resetEditorSettings: () => set(() => {
    const next = { ...DEFAULT_EDITOR_SETTINGS };
    persistEditorSettings(next);
    return { editorSettings: next };
  }),

  installExtension: (id, metadata) => set((state) => {
    const nextInstalled = { ...state.installedExtensions, [id]: true };
    const nextMetadata = metadata
      ? { ...state.installedExtensionMetadata, [id]: metadata }
      : state.installedExtensionMetadata;

    persistInstalledExtensions(nextInstalled);
    if (metadata) {
      persistInstalledExtensionMetadata(nextMetadata);
    }

    return {
      installedExtensions: nextInstalled,
      installedExtensionMetadata: nextMetadata,
    };
  }),

  uninstallExtension: (id) => set((state) => {
    const nextInstalled = { ...state.installedExtensions };
    delete nextInstalled[id];

    const nextMetadata = { ...state.installedExtensionMetadata };
    if (nextMetadata[id]) {
      delete nextMetadata[id];
      persistInstalledExtensionMetadata(nextMetadata);
    }

    persistInstalledExtensions(nextInstalled);
    return { installedExtensions: nextInstalled, installedExtensionMetadata: nextMetadata };
  }),

  setCodexApiKey: (key) => {
    const trimmed = key.trim();
    persistCodexApiKey(trimmed || null);
    set({ codexApiKey: trimmed || null });
  },

  clearCodexApiKey: () => {
    persistCodexApiKey(null);
    set({ codexApiKey: null });
  },

  setCodexModel: (model) => set((state) => {
    const trimmed = model.trim() || DEFAULT_CODEX_SETTINGS.model;
    const next = { ...state.codexSettings, model: trimmed };
    persistCodexSettings(next);
    return { codexSettings: next };
  }),

  toggleCodexDrawer: () => set((state) => ({ codexDrawerOpen: !state.codexDrawerOpen })),

  setCodexDrawerOpen: (open) => set({ codexDrawerOpen: open }),

  openCodexModal: () => set({ codexModalOpen: true }),

  closeCodexModal: () => set({ codexModalOpen: false }),

  addCodexMessage: (message) => set((state) => ({ codexMessages: [...state.codexMessages, message] })),

  clearCodexMessages: () => set({ codexMessages: [] }),

  setSidebarWidth: (width) => set(() => {
    const next = clampSidebarWidth(width);
    persistSidebarWidth(next);
    return { sidebarWidth: next };
  }),

  setTerminalHeight: (height) => set(() => {
    const next = clampTerminalHeight(height);
    persistTerminalHeight(next);
    return { terminalHeight: next };
  }),
}));
