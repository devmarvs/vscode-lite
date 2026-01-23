import React from 'react';
import { useFileStore } from '../../store/useFileStore';
import { X } from 'lucide-react';
import clsx from 'clsx';

export const Tabs: React.FC = () => {
  const { files, activeFileId, setActiveFile, deleteFile } = useFileStore();

  return (
    <div className="h-9 bg-[#252526] flex items-center overflow-x-auto no-scrollbar border-b border-vscode-border">
      {files.map((file) => (
        <div
          key={file.id}
          className={clsx(
            "h-full flex items-center px-3 min-w-[120px] max-w-[200px] border-r border-vscode-border cursor-pointer select-none group",
            activeFileId === file.id ? "bg-vscode-bg text-white border-t-2 border-t-vscode-statusBar" : "bg-[#2d2d2d] text-gray-400 hover:bg-[#252526]"
          )}
          onClick={() => setActiveFile(file.id)}
        >
          <div className="flex items-center gap-2 w-full">
            {/* Icon based on language would go here */}
            <span className="text-blue-400 text-xs font-bold">TS</span>
            <span className="truncate text-xs flex-1">{file.name}</span>
            <button
              className={clsx(
                "p-0.5 rounded-md hover:bg-gray-600",
                activeFileId === file.id ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                deleteFile(file.id);
              }}
            >
              <X size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
