import React from 'react';
import clsx from 'clsx';
import { GitBranch, Bell, AlertTriangle, Sparkles } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { isCodexInstalled } from '../../utils/codex';

export const StatusBar: React.FC = () => {
  const { installedExtensions, toggleCodexDrawer, codexDrawerOpen } = useFileStore();
  const codexInstalled = isCodexInstalled(installedExtensions);

  return (
    <div className="h-6 bg-vscode-statusBar text-white flex items-center justify-between px-3 text-xs select-none shrink-0 z-40">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150">
          <GitBranch size={12} />
          <span>main*</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150">
          <AlertTriangle size={12} />
          <span>0</span>
          <div className="w-[1px] h-3 bg-white/30 mx-1" />
          <AlertTriangle size={12} />
          <span>0</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150 hidden md:block">
          Ln 12, Col 45
        </div>
        <div className="hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150 hidden md:block">
          UTF-8
        </div>
        <div className="hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150 hidden md:block">
          TypeScript React
        </div>
        {codexInstalled && (
          <div
            className={clsx(
              "flex items-center gap-1 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150",
              codexDrawerOpen ? "bg-white/20" : "hover:bg-white/20"
            )}
            onClick={toggleCodexDrawer}
          >
            <Sparkles size={12} />
            <span className="hidden sm:block">Codex</span>
          </div>
        )}
        <div className="hover:bg-white/20 px-1.5 py-0.5 rounded cursor-pointer transition-colors duration-150">
          <Bell size={12} />
        </div>
      </div>
    </div>
  );
};
