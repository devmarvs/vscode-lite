import React, { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  FileCode,
  FilePlus,
  Folder,
  FolderPlus,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import { useShallow } from 'zustand/shallow';
import {
  getFileNameFromPath,
  getParentFolderPath,
  isFileDirty,
  useFileStore,
} from '../../store/useFileStore';
import { Search } from './Search';
import { SourceControl } from './SourceControl';
import { Extensions } from './Extensions';
import { Settings } from './Settings';
import { CodexPanel } from '../Codex/CodexPanel';

type ExplorerFolderNode = {
  path: string;
  name: string;
  folders: ExplorerFolderNode[];
  files: Array<ReturnType<typeof useFileStore.getState>['files'][number]>;
};

type ExplorerEditState =
  | {
      type: 'file';
      id: string;
      parentPath: string;
      value: string;
    }
  | {
      type: 'folder';
      id: string;
      parentPath: string;
      value: string;
    };

const sortByName = (left: string, right: string) =>
  left.localeCompare(right, undefined, { sensitivity: 'base' });

const buildExplorerTree = (
  files: Array<ReturnType<typeof useFileStore.getState>['files'][number]>,
  folders: string[]
) => {
  const root: ExplorerFolderNode = { path: '', name: '', folders: [], files: [] };
  const folderMap = new Map<string, ExplorerFolderNode>([['', root]]);

  const sortedFolders = [...folders].sort((left, right) => {
    const leftDepth = left.split('/').length;
    const rightDepth = right.split('/').length;
    if (leftDepth === rightDepth) {
      return sortByName(left, right);
    }
    return leftDepth - rightDepth;
  });

  sortedFolders.forEach((folderPath) => {
    if (folderMap.has(folderPath)) {
      return;
    }

    const name = getFileNameFromPath(folderPath);
    const parentPath = getParentFolderPath(folderPath);
    const parent = folderMap.get(parentPath) ?? root;
    const node: ExplorerFolderNode = {
      path: folderPath,
      name,
      folders: [],
      files: [],
    };
    parent.folders.push(node);
    folderMap.set(folderPath, node);
  });

  files.forEach((file) => {
    const parentPath = getParentFolderPath(file.path);
    const parent = folderMap.get(parentPath) ?? root;
    parent.files.push(file);
  });

  const sortNodes = (node: ExplorerFolderNode) => {
    node.folders.sort((left, right) => sortByName(left.name, right.name));
    node.files.sort((left, right) => sortByName(left.name, right.name));
    node.folders.forEach(sortNodes);
  };

  sortNodes(root);
  return root;
};

const Explorer: React.FC = () => {
  const {
    files,
    folders,
    activeFileId,
    setActiveFile,
    deleteFile,
    addFile,
    addFolder,
    renameFile,
    renameFolder,
    setSidebarVisible,
  } = useFileStore(
    useShallow((state) => ({
      files: state.files,
      folders: state.folders,
      activeFileId: state.activeFileId,
      setActiveFile: state.setActiveFile,
      deleteFile: state.deleteFile,
      addFile: state.addFile,
      addFolder: state.addFolder,
      renameFile: state.renameFile,
      renameFolder: state.renameFolder,
      setSidebarVisible: state.setSidebarVisible,
    }))
  );
  const [createMode, setCreateMode] = useState<'file' | 'folder' | null>(null);
  const [createValue, setCreateValue] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editing, setEditing] = useState<ExplorerEditState | null>(null);

  const tree = useMemo(() => buildExplorerTree(files, folders), [files, folders]);

  const openFile = (fileId: string) => {
    setActiveFile(fileId);
    if (window.innerWidth < 768) {
      setSidebarVisible(false);
    }
  };

  const toggleFolder = (path: string) => {
    setCollapsedFolders((state) => ({
      ...state,
      [path]: !state[path],
    }));
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = createValue.trim();
    if (!trimmed || !createMode) {
      return;
    }

    if (createMode === 'file') {
      addFile(trimmed);
    } else {
      addFolder(trimmed);
    }

    setCreateValue('');
    setCreateMode(null);
  };

  const startFileRename = (fileId: string, path: string) => {
    setEditing({
      type: 'file',
      id: fileId,
      parentPath: getParentFolderPath(path),
      value: getFileNameFromPath(path),
    });
  };

  const startFolderRename = (path: string) => {
    setEditing({
      type: 'folder',
      id: path,
      parentPath: getParentFolderPath(path),
      value: getFileNameFromPath(path),
    });
  };

  const handleRenameSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) {
      return;
    }

    const cleanName = editing.value.trim().replace(/[\\/]+/g, '');
    if (!cleanName) {
      setEditing(null);
      return;
    }

    const nextPath = editing.parentPath ? `${editing.parentPath}/${cleanName}` : cleanName;
    if (editing.type === 'file') {
      renameFile(editing.id, nextPath);
    } else {
      renameFolder(editing.id, nextPath);
    }

    setEditing(null);
  };

  const renderFile = (file: ReturnType<typeof useFileStore.getState>['files'][number], depth: number) => {
    const isEditing = editing?.type === 'file' && editing.id === file.id;
    const rowPaddingLeft = 10 + depth * 14;

    return (
      <div key={file.id}>
        <div
          className={clsx(
            'group flex items-center gap-2 py-1.5 pr-2 text-sm cursor-pointer transition-colors duration-150',
            activeFileId === file.id
              ? 'bg-vscode-hover text-white'
              : 'text-vscode-text hover:bg-vscode-hover/50 hover:text-white'
          )}
          style={{ paddingLeft: rowPaddingLeft }}
          onClick={() => openFile(file.id)}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              openFile(file.id);
            }
          }}
          title={file.path}
        >
          <FileCode size={14} className="opacity-70 shrink-0" />
          {isEditing ? (
            <form className="flex-1 min-w-0" onSubmit={handleRenameSubmit}>
              <input
                autoFocus
                value={editing.value}
                onBlur={handleRenameSubmit}
                onChange={(event) =>
                  setEditing((state) => (state && state.id === file.id ? { ...state, value: event.target.value } : state))
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setEditing(null);
                  }
                }}
                className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-statusBar focus:outline-none rounded"
              />
            </form>
          ) : (
            <>
              <span className="truncate flex-1">{file.name}</span>
              {isFileDirty(file) && <span className="text-yellow-400 text-[10px] leading-none">●</span>}
            </>
          )}
          {!isEditing && (
            <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
              <button
                className="hover:text-white p-1"
                onClick={(event) => {
                  event.stopPropagation();
                  startFileRename(file.id, file.path);
                }}
                title="Rename"
              >
                <Pencil size={12} />
              </button>
              <button
                className="hover:text-red-400 p-1"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteFile(file.id);
                }}
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderFolder = (folder: ExplorerFolderNode, depth: number) => {
    const isCollapsed = collapsedFolders[folder.path] ?? false;
    const isEditing = editing?.type === 'folder' && editing.id === folder.path;
    const rowPaddingLeft = 8 + depth * 14;

    return (
      <div key={folder.path}>
        <div
          className="group flex items-center gap-1.5 py-1.5 pr-2 text-sm text-vscode-text hover:bg-vscode-hover/40 hover:text-white transition-colors duration-150"
          style={{ paddingLeft: rowPaddingLeft }}
          title={folder.path}
        >
          <button
            className="p-0.5 rounded hover:bg-white/10"
            onClick={() => toggleFolder(folder.path)}
            aria-label={isCollapsed ? 'Expand folder' : 'Collapse folder'}
          >
            {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
          <Folder size={14} className="text-blue-300 shrink-0" />
          {isEditing ? (
            <form className="flex-1 min-w-0" onSubmit={handleRenameSubmit}>
              <input
                autoFocus
                value={editing.value}
                onBlur={handleRenameSubmit}
                onChange={(event) =>
                  setEditing((state) =>
                    state && state.id === folder.path ? { ...state, value: event.target.value } : state
                  )
                }
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setEditing(null);
                  }
                }}
                className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-statusBar focus:outline-none rounded"
              />
            </form>
          ) : (
            <span
              className="truncate flex-1 cursor-pointer"
              onClick={() => toggleFolder(folder.path)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  toggleFolder(folder.path);
                }
              }}
            >
              {folder.name}
            </span>
          )}
          {!isEditing && (
            <button
              className="opacity-0 group-hover:opacity-100 hover:text-white p-1 transition-opacity duration-150"
              onClick={(event) => {
                event.stopPropagation();
                startFolderRename(folder.path);
              }}
              title="Rename folder"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>

        {!isCollapsed && (
          <>
            {folder.folders.map((childFolder) => renderFolder(childFolder, depth + 1))}
            {folder.files.map((file) => renderFile(file, depth + 1))}
          </>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      <div className="panel-header">
        <span className="panel-title">Explorer</span>
        <div className="panel-actions">
          <button
            onClick={() => {
              setCreateMode('file');
              setCreateValue('');
            }}
            className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
            title="New File"
          >
            <FilePlus size={16} />
          </button>
          <button
            onClick={() => {
              setCreateMode('folder');
              setCreateValue('');
            }}
            className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
            title="New Folder"
          >
            <FolderPlus size={16} />
          </button>
          <button
            onClick={() => setSidebarVisible(false)}
            className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
            title="Close"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {createMode && (
          <form onSubmit={handleCreate} className="px-2 py-1">
            <input
              autoFocus
              type="text"
              className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-statusBar focus:outline-none rounded"
              placeholder={createMode === 'file' ? 'src/new-file.ts' : 'src/new-folder'}
              value={createValue}
              onChange={(event) => setCreateValue(event.target.value)}
              onBlur={() => setCreateMode(null)}
            />
          </form>
        )}

        {tree.folders.map((folder) => renderFolder(folder, 0))}
        {tree.files.map((file) => renderFile(file, 0))}
        {tree.folders.length === 0 && tree.files.length === 0 && (
          <div className="px-4 py-2 text-sm text-gray-500">No files yet. Create a file to get started.</div>
        )}
      </div>
    </div>
  );
};

export const Sidebar: React.FC = () => {
  const { sidebarVisible, activeActivityBarItem, sidebarWidth } = useFileStore(
    useShallow((state) => ({
      sidebarVisible: state.sidebarVisible,
      activeActivityBarItem: state.activeActivityBarItem,
      sidebarWidth: state.sidebarWidth,
    }))
  );

  if (!sidebarVisible) return null;

  return (
    <div
      className="layout-pane sidebar-resizable h-full border-r border-vscode-border flex flex-col shrink-0 absolute top-0 left-0 md:relative z-50 shadow-2xl md:shadow-none pt-[env(safe-area-inset-top)]"
      style={{ backgroundColor: '#252526', ['--sidebar-width' as string]: `${sidebarWidth}px` }}
    >
      {activeActivityBarItem === 'explorer' && <Explorer />}
      {activeActivityBarItem === 'search' && <Search />}
      {activeActivityBarItem === 'git' && <SourceControl />}
      {activeActivityBarItem === 'extensions' && <Extensions />}
      {activeActivityBarItem === 'codex' && <CodexPanel />}
      {activeActivityBarItem === 'settings' && <Settings />}
    </div>
  );
};
