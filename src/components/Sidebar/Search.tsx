import React, { useRef, useState } from 'react';
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
  const [resultFocusIndex, setResultFocusIndex] = useState(0);
  const resultRefs = useRef<Array<HTMLDivElement | null>>([]);

  const results = query 
    ? files.filter(f => f.content.toLowerCase().includes(query.toLowerCase()) || f.name.toLowerCase().includes(query.toLowerCase()))
    : [];
  const effectiveFocusIndex = results.length === 0 ? 0 : Math.min(resultFocusIndex, results.length - 1);

  const openResult = (fileId: string) => {
    setActiveFile(fileId);
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  };

  const handleResultsKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (results.length === 0) {
      return;
    }

    const lastIndex = results.length - 1;
    let nextIndex = effectiveFocusIndex;

    switch (event.key) {
      case 'ArrowUp':
        nextIndex = effectiveFocusIndex <= 0 ? lastIndex : effectiveFocusIndex - 1;
        break;
      case 'ArrowDown':
        nextIndex = effectiveFocusIndex >= lastIndex ? 0 : effectiveFocusIndex + 1;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = lastIndex;
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        openResult(results[effectiveFocusIndex].id);
        return;
      default:
        return;
    }

    event.preventDefault();
    setResultFocusIndex(nextIndex);
    resultRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="panel-header">
        <span className="panel-title">Search</span>
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
            onChange={(e) => {
              setQuery(e.target.value);
              setResultFocusIndex(0);
            }}
          />
          <div className="flex justify-end gap-1 mt-1 text-gray-500">
             <CaseSensitive size={14} className="hover:text-white cursor-pointer" />
             <WholeWord size={14} className="hover:text-white cursor-pointer" />
             <Regex size={14} className="hover:text-white cursor-pointer" />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Search results" onKeyDown={handleResultsKeyDown}>
        {query && results.length === 0 && (
           <div className="px-4 text-sm opacity-70">No results found.</div>
        )}
        
        {results.map((file, index) => (
          <div key={file.id} className="flex flex-col mb-2">
             <div className="px-4 py-1 bg-[#37373d] flex items-center text-sm font-bold text-gray-300">
                <ArrowRight size={12} className="mr-1" />
                {file.name}
             </div>
             <div 
               ref={(el) => {
                 resultRefs.current[index] = el;
               }}
               className="px-8 py-1 text-sm text-gray-400 hover:text-white cursor-pointer truncate font-mono"
               onClick={() => openResult(file.id)}
               role="option"
               aria-selected={effectiveFocusIndex === index}
               tabIndex={effectiveFocusIndex === index ? 0 : -1}
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
