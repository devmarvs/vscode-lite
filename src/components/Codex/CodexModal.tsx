import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { CodexConversation } from './CodexConversation';
import { useShallow } from 'zustand/shallow';

export const CodexModal: React.FC = () => {
  const { codexModalOpen, closeCodexModal } = useFileStore(
    useShallow((state) => ({
      codexModalOpen: state.codexModalOpen,
      closeCodexModal: state.closeCodexModal,
    }))
  );

  useEffect(() => {
    if (!codexModalOpen) {
      return;
    }

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeCodexModal();
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [codexModalOpen, closeCodexModal]);

  if (!codexModalOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center px-4"
      onClick={closeCodexModal}
    >
      <div
        className="layout-pane w-full max-w-[720px] h-[70vh] bg-[#1f1f1f] border border-vscode-border rounded-md shadow-2xl flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-vscode-sidebar border-b border-vscode-border flex items-center justify-between">
          <span>Codex: Ask</span>
          <button
            onClick={closeCodexModal}
            className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
          >
            <X size={14} />
          </button>
        </div>
        <div className="flex-1 min-h-0 px-4 py-3">
          <CodexConversation autoFocus />
        </div>
      </div>
    </div>
  );
};
