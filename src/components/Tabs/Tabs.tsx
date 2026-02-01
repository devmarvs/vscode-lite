import React, { useEffect, useRef, useState } from 'react';
import { useFileStore } from '../../store/useFileStore';
import { X } from 'lucide-react';
import clsx from 'clsx';
import { useShallow } from 'zustand/shallow';

export const Tabs: React.FC = () => {
  const { files, activeFileId, setActiveFile, deleteFile } = useFileStore(
    useShallow((state) => ({
      files: state.files,
      activeFileId: state.activeFileId,
      setActiveFile: state.setActiveFile,
      deleteFile: state.deleteFile,
    }))
  );
  const tabRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [tabFocusIndex, setTabFocusIndex] = useState(0);

  useEffect(() => {
    const nextIndex = Math.max(0, files.findIndex((file) => file.id === activeFileId));
    setTabFocusIndex((prev) => (prev !== nextIndex && nextIndex >= 0 ? nextIndex : prev));
  }, [files, activeFileId]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (files.length === 0) {
      return;
    }

    const lastIndex = files.length - 1;
    let nextIndex = tabFocusIndex;

    switch (event.key) {
      case 'ArrowLeft':
        nextIndex = tabFocusIndex <= 0 ? lastIndex : tabFocusIndex - 1;
        break;
      case 'ArrowRight':
        nextIndex = tabFocusIndex >= lastIndex ? 0 : tabFocusIndex + 1;
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
        setActiveFile(files[tabFocusIndex].id);
        return;
      default:
        return;
    }

    event.preventDefault();
    setTabFocusIndex(nextIndex);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div
      className="h-9 bg-[#252526] flex items-center overflow-x-auto no-scrollbar border-b border-vscode-border"
      role="tablist"
      aria-label="Open files"
      onKeyDown={handleTabKeyDown}
    >
      {files.map((file, index) => (
        <div
          key={file.id}
          ref={(el) => {
            tabRefs.current[index] = el;
          }}
          className={clsx(
            "h-full flex items-center px-3 min-w-[120px] max-w-[200px] border-r border-vscode-border cursor-pointer select-none group",
            activeFileId === file.id ? "bg-vscode-bg text-white border-t-2 border-t-vscode-statusBar" : "bg-[#2d2d2d] text-gray-400 hover:bg-[#252526]"
          )}
          onClick={() => setActiveFile(file.id)}
          role="tab"
          tabIndex={tabFocusIndex === index ? 0 : -1}
          aria-selected={activeFileId === file.id}
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
