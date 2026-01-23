import { create } from 'zustand';

export type ActivityBarItem = 'explorer' | 'search' | 'git' | 'extensions' | 'settings';

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
  
  // Actions
  addFile: (name: string, language: string) => void;
  deleteFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  toggleTerminal: () => void;
  setActiveActivityBarItem: (item: ActivityBarItem) => void;
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
}));
