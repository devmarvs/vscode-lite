import React, { useEffect, useRef } from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { CodeEditor } from '../Editor/CodeEditor';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { CodexDrawer } from '../Codex/CodexDrawer';
import { CodexModal } from '../Codex/CodexModal';
import { StatusBar } from '../StatusBar/StatusBar';
import { Terminal } from '../Terminal/Terminal';
import { Tabs } from '../Tabs/Tabs';
import { useFileStore, type ActivityBarItem } from '../../store/useFileStore';
import { Search, Settings, Files, GitBranch, Puzzle } from 'lucide-react';
import clsx from 'clsx';
import { getCodexExtensionMetadata, isCodexInstalled } from '../../utils/codex';
import { CodexIcon } from '../Codex/CodexIcon';
import { useShallow } from 'zustand/shallow';

export const Layout: React.FC = () => {
  const { toggleSidebar, sidebarVisible, activeActivityBarItem, setActiveActivityBarItem, installedExtensions, installedExtensionMetadata, sidebarWidth, setSidebarWidth, terminalOpen, terminalHeight, setTerminalHeight } = useFileStore(
    useShallow((state) => ({
      toggleSidebar: state.toggleSidebar,
      sidebarVisible: state.sidebarVisible,
      activeActivityBarItem: state.activeActivityBarItem,
      setActiveActivityBarItem: state.setActiveActivityBarItem,
      installedExtensions: state.installedExtensions,
      installedExtensionMetadata: state.installedExtensionMetadata,
      sidebarWidth: state.sidebarWidth,
      setSidebarWidth: state.setSidebarWidth,
      terminalOpen: state.terminalOpen,
      terminalHeight: state.terminalHeight,
      setTerminalHeight: state.setTerminalHeight,
    }))
  );
  const codexInstalled = isCodexInstalled(installedExtensions);
  const codexMetadata = getCodexExtensionMetadata(installedExtensionMetadata);
  const dragRef = useRef<{
    type: 'sidebar' | 'terminal';
    startX?: number;
    startY?: number;
    startSize: number;
  } | null>(null);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }

      if (drag.type === 'sidebar' && typeof drag.startX === 'number') {
        const delta = event.clientX - drag.startX;
        const maxWidth = Math.max(240, Math.floor(window.innerWidth * 0.6));
        setSidebarWidth(Math.min(maxWidth, drag.startSize + delta));
      }

      if (drag.type === 'terminal' && typeof drag.startY === 'number') {
        const delta = drag.startY - event.clientY;
        const maxHeight = Math.max(200, Math.floor(window.innerHeight * 0.6));
        setTerminalHeight(Math.min(maxHeight, drag.startSize + delta));
      }
    };

    const handlePointerUp = () => {
      if (!dragRef.current) {
        return;
      }
      dragRef.current = null;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [setSidebarWidth, setTerminalHeight]);

  const beginSidebarResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragRef.current = { type: 'sidebar', startX: event.clientX, startSize: sidebarWidth };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';
  };

  const beginTerminalResize = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    dragRef.current = { type: 'terminal', startY: event.clientY, startSize: terminalHeight };
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  };

  const handleActivityClick = (item: ActivityBarItem) => {
    if (activeActivityBarItem === item && sidebarVisible) {
      toggleSidebar(); // Toggle off if clicking same active item
    } else {
      setActiveActivityBarItem(item); // Switch item and ensure sidebar is on
    }
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-vscode-bg text-vscode-text overflow-hidden flex flex-col">
      <CommandPalette />
      <CodexModal />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Activity Bar */}
        <div className="layout-pane w-12 bg-vscode-activityBar flex flex-col items-center py-2 gap-1 shrink-0 z-50 border-r border-vscode-border pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => handleActivityClick('explorer')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-colors duration-150",
              activeActivityBarItem === 'explorer' && sidebarVisible && "text-white bg-white/5"
            )}
          >
            <Files size={24} strokeWidth={1.5} />
            {activeActivityBarItem === 'explorer' && sidebarVisible && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
            )}
          </button>
          <button
            onClick={() => handleActivityClick('search')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-colors duration-150",
              activeActivityBarItem === 'search' && sidebarVisible && "text-white bg-white/5"
            )}
          >
            <Search size={24} strokeWidth={1.5} />
            {activeActivityBarItem === 'search' && sidebarVisible && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
            )}
          </button>
          <button
            onClick={() => handleActivityClick('git')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-colors duration-150",
              activeActivityBarItem === 'git' && sidebarVisible && "text-white bg-white/5"
            )}
          >
            <GitBranch size={24} strokeWidth={1.5} />
            {activeActivityBarItem === 'git' && sidebarVisible && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
            )}
          </button>
          <button
            onClick={() => handleActivityClick('extensions')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-colors duration-150",
              activeActivityBarItem === 'extensions' && sidebarVisible && "text-white bg-white/5"
            )}
          >
            <Puzzle size={24} strokeWidth={1.5} />
            {activeActivityBarItem === 'extensions' && sidebarVisible && (
              <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
            )}
          </button>
          {codexInstalled && (
            <button
              onClick={() => handleActivityClick('codex')}
              className={clsx(
                "text-gray-400 hover:text-white p-2.5 relative rounded transition-colors duration-150",
                activeActivityBarItem === 'codex' && sidebarVisible && "text-white bg-white/5"
              )}
            >
              <CodexIcon iconUrl={codexMetadata?.icon} size={24} className="text-white" />
              {activeActivityBarItem === 'codex' && sidebarVisible && (
                <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
              )}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => handleActivityClick('settings')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-colors duration-150",
              activeActivityBarItem === 'settings' && sidebarVisible && "text-white bg-white/5"
            )}
          >
            <Settings size={24} strokeWidth={1.5} />
          </button>
        </div>

        {/* Sidebar & Editor Container */}
        <div className="flex flex-1 relative overflow-hidden">
          {/* Sidebar */}
          <Sidebar />
          {sidebarVisible && (
            <div
              className="hidden md:block w-1 cursor-col-resize hover:bg-white/10"
              onPointerDown={beginSidebarResize}
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize sidebar"
              style={{ touchAction: 'none' }}
            />
          )}

          {/* Editor Area */}
          <div className="layout-pane flex-1 flex flex-col min-w-0 bg-vscode-bg">
            <Tabs />
            <div className="flex-1 min-h-0">
              <CodeEditor />
            </div>
            {terminalOpen && (
              <div
                className="h-1 cursor-row-resize hover:bg-white/10"
                onPointerDown={beginTerminalResize}
                role="separator"
                aria-orientation="horizontal"
                aria-label="Resize terminal"
                style={{ touchAction: 'none' }}
              />
            )}
            <Terminal />
          </div>

          {/* Overlay for mobile when sidebar is open */}
          {sidebarVisible && (
            <div
              className="md:hidden absolute inset-0 bg-black/50 z-40"
              onClick={toggleSidebar}
            />
          )}

          <CodexDrawer />
        </div>
      </div>

      <StatusBar />
    </div>
  );
};
