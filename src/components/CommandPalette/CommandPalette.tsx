import React, { useState, useEffect } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { Search } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { files, setActiveFile, addFile, toggleTerminal, toggleSidebar } = useFileStore();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'p' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  if (!open) return null;

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
  
  const commands = [
    { name: 'Toggle Terminal', action: () => toggleTerminal() },
    { name: 'Toggle Sidebar', action: () => toggleSidebar() },
    { name: 'New File', action: () => {
       const name = prompt('File name?');
       if (name) addFile(name, 'typescript');
    }},
  ].filter(c => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/50" onClick={() => setOpen(false)}>
      <div className="w-[600px] max-w-[90%] bg-[#252526] shadow-2xl rounded-md overflow-hidden border border-[#454545]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 border-b border-[#454545]">
          <Search size={16} className="text-gray-400 mr-2" />
          <input
            className="w-full bg-transparent text-white h-10 focus:outline-none placeholder-gray-500"
            placeholder="Search files and commands..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
        </div>
        <div className="max-h-[300px] overflow-y-auto py-2">
          {filteredFiles.map(file => (
            <div
              key={file.id}
              className="px-4 py-2 hover:bg-[#2a2d2e] cursor-pointer text-white flex justify-between group"
              onClick={() => {
                setActiveFile(file.id);
                setOpen(false);
              }}
            >
              <span>{file.name}</span>
              <span className="text-gray-500 text-xs group-hover:text-gray-300">File</span>
            </div>
          ))}
          {commands.map((cmd, i) => (
            <div
              key={i}
              className="px-4 py-2 hover:bg-[#2a2d2e] cursor-pointer text-white flex justify-between group"
              onClick={() => {
                cmd.action();
                setOpen(false);
              }}
            >
              <span>{'>'} {cmd.name}</span>
              <span className="text-gray-500 text-xs group-hover:text-gray-300">Command</span>
            </div>
          ))}
          {filteredFiles.length === 0 && commands.length === 0 && (
             <div className="px-4 py-2 text-gray-500 text-sm">No results found.</div>
          )}
        </div>
      </div>
    </div>
  );
};
