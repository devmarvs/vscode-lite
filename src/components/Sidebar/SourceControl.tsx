import React from 'react';
import { GitCommit, RefreshCw, Check, Plus, MoreHorizontal, X } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { useShallow } from 'zustand/shallow';

export const SourceControl: React.FC = () => {
  const { setSidebarVisible } = useFileStore(
    useShallow((state) => ({
      setSidebarVisible: state.setSidebarVisible,
    }))
  );
  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="panel-header">
        <span className="panel-title">Source Control</span>
        <div className="panel-actions">
           <button onClick={() => setSidebarVisible(false)} className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded mr-2">
             <X size={16} />
           </button>
           <RefreshCw size={14} className="hover:text-white cursor-pointer" />
           <Check size={14} className="hover:text-white cursor-pointer" />
           <MoreHorizontal size={14} className="hover:text-white cursor-pointer" />
        </div>
      </div>
      
      <div className="px-4 py-2">
        <div className="flex gap-2 mb-2">
           <input 
              className="flex-1 bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar"
              placeholder="Message (Ctrl+Enter to commit)"
           />
        </div>
        <button className="w-full bg-vscode-statusBar text-white py-1 px-2 text-sm font-medium hover:bg-opacity-90 flex items-center justify-center gap-2">
           <GitCommit size={14} /> Commit
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto mt-2">
         <div className="px-4 py-1 panel-section-title text-blue-400">Changes</div>
         <div className="px-4 py-1 text-sm hover:bg-vscode-hover cursor-pointer flex items-center group">
            <span className="text-yellow-500 mr-2">M</span>
            <span className="text-gray-300 group-hover:text-white">App.tsx</span>
            <span className="ml-auto text-gray-500 text-xs">src</span>
            <div className="flex gap-1 ml-2 opacity-0 group-hover:opacity-100">
               <Plus size={14} />
               <RefreshCw size={14} />
            </div>
         </div>
      </div>
    </div>
  );
};
