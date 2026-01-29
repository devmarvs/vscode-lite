import React, { useState } from 'react';
import clsx from 'clsx';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { useShallow } from 'zustand/shallow';

type CodexAuthPanelProps = {
  compact?: boolean;
};

export const CodexAuthPanel: React.FC<CodexAuthPanelProps> = ({ compact = false }) => {
  const { setCodexApiKey } = useFileStore(
    useShallow((state) => ({
      setCodexApiKey: state.setCodexApiKey,
    }))
  );
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [showKey, setShowKey] = useState(false);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) {
      setError('Enter an API key to continue.');
      return;
    }

    setCodexApiKey(trimmed);
    setDraft('');
    setError('');
  };

  return (
    <div className={clsx("border border-vscode-border/60 rounded-md bg-[#1e1e1e]", compact ? "p-3" : "p-4")}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
        Connect Codex
      </div>
      <form onSubmit={handleSubmit} className="space-y-2">
        <label className="text-[11px] text-gray-400 flex items-center gap-2">
          <KeyRound size={12} className="text-gray-500" />
          OpenAI API key
        </label>
        <div className="flex items-center gap-2">
          <input
            type={showKey ? 'text' : 'password'}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="sk-..."
            className="flex-1 bg-vscode-input text-xs text-white px-2.5 py-2 border border-vscode-border rounded focus:outline-none focus:border-vscode-statusBar"
          />
          <button
            type="button"
            onClick={() => setShowKey((value) => !value)}
            className="h-8 w-8 flex items-center justify-center rounded border border-vscode-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors duration-150"
            aria-label={showKey ? 'Hide API key' : 'Show API key'}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button
            type="submit"
            className="h-8 px-3 bg-vscode-statusBar text-white text-xs font-semibold rounded hover:bg-blue-500 transition-colors duration-150"
          >
            Save
          </button>
        </div>
        {error && <div className="text-[11px] text-red-400">{error}</div>}
      </form>
      <div className="text-[10px] text-gray-500 mt-2">
        Stored in this browser session only. Use a server-side proxy for production.
      </div>
      <div className="mt-3 flex items-center gap-2 opacity-60">
        <button
          type="button"
          className="h-7 px-2.5 rounded border border-vscode-border text-xs text-gray-300 cursor-not-allowed"
          disabled
          title="ChatGPT sign-in requires OAuth configuration."
        >
          Sign in with ChatGPT
        </button>
        <span className="text-[10px] text-gray-500">OAuth setup required.</span>
      </div>
    </div>
  );
};
