import React from 'react';
import { X } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { CodexConversation } from './CodexConversation';
import { useShallow } from 'zustand/shallow';

export const CodexPanel: React.FC = () => {
  const { setSidebarVisible } = useFileStore(
    useShallow((state) => ({
      setSidebarVisible: state.setSidebarVisible,
    }))
  );

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="panel-header">
        <span className="panel-title">Codex</span>
        <button
          onClick={() => setSidebarVisible(false)}
          className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
        >
          <X size={16} />
        </button>
      </div>
      <div className="flex-1 min-h-0 px-4 py-3">
        <CodexConversation />
      </div>
    </div>
  );
};
