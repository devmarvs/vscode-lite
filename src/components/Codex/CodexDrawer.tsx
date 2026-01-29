import React from 'react';
import { X } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { CodexConversation } from './CodexConversation';
import { useShallow } from 'zustand/shallow';

export const CodexDrawer: React.FC = () => {
  const { codexDrawerOpen, toggleCodexDrawer } = useFileStore(
    useShallow((state) => ({
      codexDrawerOpen: state.codexDrawerOpen,
      toggleCodexDrawer: state.toggleCodexDrawer,
    }))
  );

  if (!codexDrawerOpen) return null;

  return (
    <>
      <div
        className="md:hidden absolute inset-0 bg-black/40 z-40"
        onClick={toggleCodexDrawer}
      />
      <div className="layout-pane absolute right-0 top-0 h-full w-full md:w-[360px] bg-[#1f1f1f] border-l border-vscode-border z-50 shadow-2xl flex flex-col">
        <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-vscode-sidebar border-b border-vscode-border flex items-center justify-between">
          <span>Codex Drawer</span>
          <button
            onClick={toggleCodexDrawer}
            className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-4 py-3">
          <CodexConversation compact />
        </div>
      </div>
    </>
  );
};
