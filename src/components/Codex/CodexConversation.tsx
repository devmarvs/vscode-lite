import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Send, Sparkles } from 'lucide-react';
import { useFileStore, type CodexMessage } from '../../store/useFileStore';

type CodexConversationProps = {
  autoFocus?: boolean;
  compact?: boolean;
};

const buildAssistantReply = (prompt: string) =>
  `Codex is running in local demo mode. I received:\n\n${prompt}\n\n` +
  `Wire up an API to get real responses.`;

export const CodexConversation: React.FC<CodexConversationProps> = ({ autoFocus = false, compact = false }) => {
  const { codexMessages, addCodexMessage } = useFileStore();
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [codexMessages.length, waiting]);

  const submitMessage = (content: string) => {
    const text = content.trim();
    if (!text) {
      return;
    }

    const userMessage: CodexMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    addCodexMessage(userMessage);
    setDraft('');
    setWaiting(true);

    window.setTimeout(() => {
      const reply: CodexMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: buildAssistantReply(text),
        timestamp: Date.now(),
      };
      addCodexMessage(reply);
      setWaiting(false);
    }, 500);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    submitMessage(draft);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitMessage(draft);
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {codexMessages.length === 0 && !waiting && (
          <div className="text-sm text-gray-400 border border-dashed border-vscode-border/60 rounded-md p-3">
            Start a conversation with Codex. Messages are stored locally in this demo.
          </div>
        )}

        {codexMessages.map((message) => (
          <div
            key={message.id}
            className={clsx(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={clsx(
                "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed border",
                message.role === 'user'
                  ? "bg-vscode-statusBar text-white border-vscode-statusBar/70"
                  : "bg-[#2d2d30] text-gray-200 border-vscode-border/60"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}

        {waiting && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Sparkles size={12} className="animate-pulse" />
            Codex is thinking...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className={clsx("pt-3", compact ? "space-y-2" : "space-y-3")}>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            placeholder="Ask Codex..."
            className="flex-1 bg-vscode-input text-sm text-white px-3 py-2 border border-vscode-border rounded focus:outline-none focus:border-vscode-statusBar"
          />
          <button
            type="submit"
            className="bg-vscode-statusBar text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-500 transition-colors duration-150"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="text-[10px] text-gray-500">
          Local mock responses only. Hook up an API to enable real answers.
        </div>
      </form>
    </div>
  );
};
