import React from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { CodeEditor } from '../Editor/CodeEditor';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { CodexDrawer } from '../Codex/CodexDrawer';
import { CodexModal } from '../Codex/CodexModal';
import { StatusBar } from '../StatusBar/StatusBar';
import { Terminal } from '../Terminal/Terminal';
import { Tabs } from '../Tabs/Tabs';
import { useFileStore, type ActivityBarItem } from '../../store/useFileStore';
import { Search, Settings, Files, GitBranch, Puzzle, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { isCodexInstalled } from '../../utils/codex';

export const Layout: React.FC = () => {
  const { toggleSidebar, sidebarVisible, activeActivityBarItem, setActiveActivityBarItem, installedExtensions } = useFileStore();
  const codexInstalled = isCodexInstalled(installedExtensions);

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
        <div className="w-12 bg-vscode-activityBar flex flex-col items-center py-2 gap-1 shrink-0 z-50 border-r border-vscode-border pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] pt-[env(safe-area-inset-top)]">
          <button
            onClick={() => handleActivityClick('explorer')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-all duration-150",
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
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-all duration-150",
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
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-all duration-150",
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
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-all duration-150",
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
                "text-gray-400 hover:text-white p-2.5 relative rounded transition-all duration-150",
                activeActivityBarItem === 'codex' && sidebarVisible && "text-white bg-white/5"
              )}
            >
              <Sparkles size={24} strokeWidth={1.5} />
              {activeActivityBarItem === 'codex' && sidebarVisible && (
                <div className="absolute left-0 top-1 bottom-1 w-[2px] bg-white rounded-r" />
              )}
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={() => handleActivityClick('settings')}
            className={clsx(
              "text-gray-400 hover:text-white p-2.5 relative rounded transition-all duration-150",
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

          {/* Editor Area */}
          <div className="flex-1 flex flex-col min-w-0 bg-vscode-bg">
            <Tabs />
            <CodeEditor />
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
