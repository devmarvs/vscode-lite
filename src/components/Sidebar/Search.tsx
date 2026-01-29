import React, { useState } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { ArrowRight, CaseSensitive, Regex, WholeWord, X } from 'lucide-react';
import { useShallow } from 'zustand/shallow';

export const Search: React.FC = () => {
  const { files, setActiveFile, setSidebarVisible } = useFileStore(
    useShallow((state) => ({
      files: state.files,
      setActiveFile: state.setActiveFile,
      setSidebarVisible: state.setSidebarVisible,
    }))
  );
  const [query, setQuery] = useState('');

  const results = query 
    ? files.filter(f => f.content.toLowerCase().includes(query.toLowerCase()) || f.name.toLowerCase().includes(query.toLowerCase()))
    : [];

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider flex justify-between items-center">
        <span>Search</span>
        <button onClick={() => setSidebarVisible(false)} className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded">
          <X size={16} />
        </button>
      </div>
      <div className="px-4 pb-2">
        <div className="relative">
          <input
            className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar"
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex justify-end gap-1 mt-1 text-gray-500">
             <CaseSensitive size={14} className="hover:text-white cursor-pointer" />
             <WholeWord size={14} className="hover:text-white cursor-pointer" />
             <Regex size={14} className="hover:text-white cursor-pointer" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {query && results.length === 0 && (
           <div className="px-4 text-sm opacity-70">No results found.</div>
        )}
        
        {results.map(file => (
          <div key={file.id} className="flex flex-col mb-2">
             <div className="px-4 py-1 bg-[#37373d] flex items-center text-sm font-bold text-gray-300">
                <ArrowRight size={12} className="mr-1" />
                {file.name}
             </div>
             <div 
               className="px-8 py-1 text-sm text-gray-400 hover:text-white cursor-pointer truncate font-mono"
               onClick={() => setActiveFile(file.id)}
             >
                {/* Simple preview of match */}
                {file.content.substring(0, 40).replace(/\n/g, ' ')}...
             </div>
          </div>
        ))}
      </div>
    </div>
  );
};
