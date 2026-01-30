import React, { useState } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { FileCode, FilePlus, Trash2, X } from 'lucide-react';
import { Search } from './Search';
import { SourceControl } from './SourceControl';
import { Extensions } from './Extensions';
import { Settings } from './Settings';
import { CodexPanel } from '../Codex/CodexPanel';
import clsx from 'clsx';
import { useShallow } from 'zustand/shallow';

const Explorer: React.FC = () => {
  const { files, activeFileId, setActiveFile, deleteFile, addFile, setSidebarVisible } = useFileStore(
    useShallow((state) => ({
      files: state.files,
      activeFileId: state.activeFileId,
      setActiveFile: state.setActiveFile,
      deleteFile: state.deleteFile,
      addFile: state.addFile,
      setSidebarVisible: state.setSidebarVisible,
    }))
  );
  const [newFileName, setNewFileName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFileName) {
      const ext = newFileName.split('.').pop();
      let lang = 'plaintext';
      if (ext === 'ts' || ext === 'tsx') lang = 'typescript';
      if (ext === 'js' || ext === 'jsx') lang = 'javascript';
      if (ext === 'css') lang = 'css';
      if (ext === 'html') lang = 'html';
      if (ext === 'json') lang = 'json';

      addFile(newFileName, lang);
      setNewFileName('');
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Explorer</span>
        <div className="panel-actions">
          <button onClick={() => setIsCreating(true)} className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded">
            <FilePlus size={16} />
          </button>
          <button onClick={() => setSidebarVisible(false)} className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded">
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {isCreating && (
          <form onSubmit={handleCreate} className="px-2 py-1">
            <input
              autoFocus
              type="text"
              className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-statusBar focus:outline-none rounded"
              placeholder="filename.ts"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onBlur={() => setIsCreating(false)}
            />
          </form>
        )}

        {files.map((file) => (
          <div
            key={file.id}
            className={clsx(
              "flex items-center px-4 py-1.5 cursor-pointer text-sm group transition-colors duration-150",
              activeFileId === file.id ? "bg-vscode-hover text-white" : "text-vscode-text hover:bg-vscode-hover/50 hover:text-white"
            )}
            onClick={() => {
              setActiveFile(file.id);
              if (window.innerWidth < 768) setSidebarVisible(false);
            }}
          >
            <FileCode size={14} className="mr-2 opacity-70" />
            <span className="truncate flex-1">{file.name}</span>
            <button
              className="opacity-0 group-hover:opacity-100 hover:text-red-400 p-1 transition-opacity duration-150"
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(file.id);
              }}
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarVisible, activeActivityBarItem, sidebarWidth } = useFileStore(
    useShallow((state) => ({
      sidebarVisible: state.sidebarVisible,
      activeActivityBarItem: state.activeActivityBarItem,
      sidebarWidth: state.sidebarWidth,
    }))
  );

  if (!sidebarVisible) return null;

  return (
    <div
      className="layout-pane sidebar-resizable h-full border-r border-vscode-border flex flex-col shrink-0 absolute top-0 left-0 md:relative z-50 shadow-2xl md:shadow-none pt-[env(safe-area-inset-top)]"
      style={{ backgroundColor: '#252526', ['--sidebar-width' as string]: `${sidebarWidth}px` }}
    >
      {activeActivityBarItem === 'explorer' && <Explorer />}
      {activeActivityBarItem === 'search' && <Search />}
      {activeActivityBarItem === 'git' && <SourceControl />}
      {activeActivityBarItem === 'extensions' && <Extensions />}
      {activeActivityBarItem === 'codex' && <CodexPanel />}
      {activeActivityBarItem === 'settings' && <Settings />}
    </div>
  );
};
