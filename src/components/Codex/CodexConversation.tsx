import React, { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { Send, Sparkles, LogOut } from 'lucide-react';
import { useFileStore, type CodexMessage } from '../../store/useFileStore';
import { buildOpenAIHeaders, getOpenAIBaseUrl } from '../../utils/codex';
import { CodexAuthPanel } from './CodexAuthPanel';

type CodexConversationProps = {
  autoFocus?: boolean;
  compact?: boolean;
};

type ResponseInputItem = {
  type: 'message';
  role: 'user' | 'assistant';
  content: Array<{ type: 'input_text' | 'output_text'; text: string }>;
};

const buildInputItems = (messages: CodexMessage[]): ResponseInputItem[] =>
  messages.map((message) => ({
    type: 'message',
    role: message.role,
    content: [
      {
        type: message.role === 'assistant' ? 'output_text' : 'input_text',
        text: message.content,
      },
    ],
  }));

const readResponseBody = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return { data: null as unknown, text: '' };
  }

  try {
    return { data: JSON.parse(text) as unknown, text };
  } catch {
    return { data: null as unknown, text };
  }
};

const buildRequestError = (response: Response, data: unknown, rawText: string) => {
  const message = (data as { error?: { message?: string } } | null)?.error?.message;

  if (response.status === 401 || response.status === 403) {
    return message || 'Invalid API key or insufficient permissions.';
  }

  if (response.status === 429) {
    return message || 'Rate limit reached. Please try again in a moment.';
  }

  return message || rawText || `Request failed with status ${response.status}.`;
};

export const CodexConversation: React.FC<CodexConversationProps> = ({ autoFocus = false, compact = false }) => {
  const { codexMessages, addCodexMessage, codexApiKey, clearCodexApiKey, codexSettings, setCodexModel } = useFileStore();
  const [draft, setDraft] = useState('');
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const signedIn = Boolean(codexApiKey);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [codexMessages.length, waiting]);

  const submitMessage = async (content: string) => {
    const text = content.trim();
    if (!text) {
      return;
    }

    if (waiting) {
      return;
    }

    if (!codexApiKey) {
      setError('Sign in with an API key to send messages.');
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
    setError(null);

    try {
      const inputItems = buildInputItems([...codexMessages, userMessage]);
      const response = await fetch(`${getOpenAIBaseUrl()}/responses`, {
        method: 'POST',
        headers: buildOpenAIHeaders(codexApiKey),
        body: JSON.stringify({
          model: codexSettings.model,
          input: inputItems,
          temperature: 0.2,
          store: false,
        }),
      });

      const { data, text: rawText } = await readResponseBody(response);

      if (!response.ok) {
        throw new Error(buildRequestError(response, data, rawText));
      }

      if (!data || typeof data !== 'object') {
        throw new Error('OpenAI returned an unreadable response.');
      }

      const outputItems = Array.isArray((data as { output?: unknown }).output)
        ? (data as { output: unknown[] }).output
        : [];
      const outputText = (data as { output_text?: string }).output_text;
      const assistantText = outputItems
        .flatMap((item: { type?: string; role?: string; content?: Array<{ type?: string; text?: string }> }) => {
          if (item?.type !== 'message' || item?.role !== 'assistant' || !Array.isArray(item.content)) {
            return [];
          }
          return item.content
            .filter((content) => content?.type === 'output_text' && typeof content.text === 'string')
            .map((content) => content.text as string);
        })
        .join('')
        .trim() || outputText || '';

      if (!assistantText) {
        throw new Error('OpenAI returned an empty response.');
      }

      const reply: CodexMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: assistantText.trim(),
        timestamp: Date.now(),
      };

      addCodexMessage(reply);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reach the OpenAI API.';
      const hint =
        err instanceof TypeError && message.toLowerCase().includes('fetch')
          ? 'Browser requests can be blocked by CORS. Set VITE_OPENAI_BASE_URL to a server-side proxy.'
          : null;
      setError(hint ? `${message} ${hint}` : message);
    } finally {
      setWaiting(false);
    }
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
      <div className={clsx("flex flex-wrap items-center justify-between gap-2 pb-2", compact ? "text-[10px]" : "text-[11px]")}>
        <div className="flex items-center gap-2 text-gray-400">
          <span className="uppercase tracking-wider">Model</span>
          <input
            type="text"
            value={codexSettings.model}
            onChange={(event) => setCodexModel(event.target.value)}
            className={clsx(
              "bg-vscode-input text-white px-2 py-1 border border-vscode-border rounded focus:outline-none focus:border-vscode-statusBar",
              compact ? "text-[10px] w-36" : "text-[11px] w-44"
            )}
          />
        </div>
        {signedIn && (
          <button
            onClick={clearCodexApiKey}
            className="flex items-center gap-1 text-gray-400 hover:text-white transition-colors duration-150"
          >
            <LogOut size={12} />
            Sign out
          </button>
        )}
      </div>
      {!signedIn && (
        <div className={clsx("pb-3", compact ? "text-[11px]" : "text-xs")}>
          <CodexAuthPanel compact={compact} />
        </div>
      )}
      <div className="flex-1 overflow-y-auto pr-1 space-y-3">
        {codexMessages.length === 0 && !waiting && (
          <div className="text-sm text-gray-400 border border-dashed border-vscode-border/60 rounded-md p-3">
            Start a conversation with Codex. Messages are stored locally in this session.
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
        {error && (
          <div className="text-[11px] text-red-400">{error}</div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              if (error) {
                setError(null);
              }
            }}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            placeholder={signedIn ? "Ask Codex..." : "Sign in to chat with Codex"}
            disabled={!signedIn || waiting}
            className="flex-1 bg-vscode-input text-sm text-white px-3 py-2 border border-vscode-border rounded focus:outline-none focus:border-vscode-statusBar disabled:opacity-60 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!signedIn || waiting}
            className="bg-vscode-statusBar text-white px-3 py-2 rounded text-sm font-medium hover:bg-blue-500 transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Send size={14} />
          </button>
        </div>
        <div className="text-[10px] text-gray-500">
          Messages are sent directly from the browser. Use a proxy for production deployments.
        </div>
      </form>
    </div>
  );
};
