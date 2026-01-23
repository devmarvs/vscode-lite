import React from 'react';
import { useFileStore } from '../../store/useFileStore';
import { X } from 'lucide-react';

export const Terminal: React.FC = () => {
  const { terminalOpen, toggleTerminal } = useFileStore();

  if (!terminalOpen) return null;

  return (
    <div className="h-48 bg-vscode-bg border-t border-vscode-border flex flex-col shrink-0">
      <div className="flex items-center justify-between px-4 py-1 bg-[#252526] text-xs text-vscode-text uppercase tracking-wider border-b border-vscode-border">
        <div className="flex gap-4">
           <span className="border-b border-white text-white cursor-pointer">Terminal</span>
           <span className="cursor-pointer hover:text-white">Output</span>
           <span className="cursor-pointer hover:text-white">Problems</span>
           <span className="cursor-pointer hover:text-white">Debug Console</span>
        </div>
        <div className="flex gap-2">
           <button onClick={toggleTerminal} className="hover:text-white">
             <X size={14} />
           </button>
        </div>
      </div>
      <div className="flex-1 p-2 font-mono text-sm overflow-auto">
        <div className="flex gap-2 text-green-400">
           <span>➜</span>
           <span className="text-blue-400">~/project</span>
           <span className="text-white">npm start</span>
        </div>
        <div className="mt-1 text-gray-300">
           {'>'} lite-vscode@0.0.0 dev<br/>
           {'>'} vite
        </div>
        <div className="mt-2 text-green-500">
           Ready in 500ms
        </div>
        <div className="mt-1">
           <span className="animate-pulse">_</span>
        </div>
      </div>
    </div>
  );
};
