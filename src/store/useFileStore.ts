import { create } from 'zustand';

export type ActivityBarItem = 'explorer' | 'search' | 'git' | 'extensions' | 'settings';

export type EditorWhitespace = 'none' | 'boundary' | 'all';

export interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  tabSize: number;
  renderWhitespace: EditorWhitespace;
}

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  tabSize: 2,
  renderWhitespace: 'boundary',
};

const SETTINGS_STORAGE_KEY = 'lite_vscode_editor_settings';

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

export interface File {
  id: string;
  name: string;
  content: string;
  language: string;
}

interface FileStore {
  files: File[];
  activeFileId: string | null;
  sidebarVisible: boolean;
  terminalOpen: boolean;
  activeActivityBarItem: ActivityBarItem;
  editorSettings: EditorSettings;
  
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
}

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

export const useFileStore = create<FileStore>((set) => ({
  files: initialFiles,
  activeFileId: '1',
  sidebarVisible: true,
  terminalOpen: false,
  activeActivityBarItem: 'explorer',
  editorSettings: loadEditorSettings(),

  addFile: (name, language) => set((state) => {
    const newFile: File = {
      id: crypto.randomUUID(),
      name,
      language,
      content: ''
    };
    return { files: [...state.files, newFile], activeFileId: newFile.id };
  }),

  deleteFile: (id) => set((state) => ({
    files: state.files.filter(f => f.id !== id),
    activeFileId: state.activeFileId === id ? null : state.activeFileId
  })),

  updateFileContent: (id, content) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, content } : f)
  })),

  setActiveFile: (id) => set({ activeFileId: id }),
  
  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
  
  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),
  
  toggleTerminal: () => set((state) => ({ terminalOpen: !state.terminalOpen })),

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
}));
