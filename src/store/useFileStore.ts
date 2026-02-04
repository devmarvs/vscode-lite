import { create } from 'zustand';

export type ActivityBarItem = 'explorer' | 'search' | 'git' | 'extensions' | 'settings' | 'codex';

export type EditorWhitespace = 'none' | 'boundary' | 'all';

export interface EditorSettings {
  fontSize: number;
  wordWrap: boolean;
  minimap: boolean;
  lineNumbers: boolean;
  tabSize: number;
  renderWhitespace: EditorWhitespace;
}

export interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  savedContent: string;
  language: string;
}

export const isFileDirty = (file: File) => file.content !== file.savedContent;

export interface CodexFileEdit {
  path: string;
  content: string;
}

export type GitChangeType = 'added' | 'modified' | 'deleted';

export interface GitChange {
  path: string;
  type: GitChangeType;
  staged: boolean;
}

export interface GitCommit {
  id: string;
  branch: string;
  message: string;
  timestamp: number;
  changes: Array<{ path: string; type: GitChangeType }>;
}

export interface NativeGitSummary {
  branch: string;
  staged: number;
  unstaged: number;
}

interface GitBranchState {
  tree: Record<string, string>;
  commits: GitCommit[];
}

interface PersistedGitState {
  currentBranch: string;
  branches: Record<string, GitBranchState>;
  stagedPaths: string[];
}

export const normalizeWorkspacePath = (rawPath: string) =>
  rawPath
    .replace(/\\/g, '/')
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join('/');

export const getFileNameFromPath = (path: string) => {
  const normalized = normalizeWorkspacePath(path);
  const segments = normalized.split('/');
  return segments[segments.length - 1] ?? normalized;
};

export const getParentFolderPath = (path: string) => {
  const normalized = normalizeWorkspacePath(path);
  const segments = normalized.split('/');
  segments.pop();
  return segments.join('/');
};

const collectFolderHierarchy = (path: string) => {
  const normalized = normalizeWorkspacePath(path);
  if (!normalized) {
    return [] as string[];
  }

  const segments = normalized.split('/');
  const folders: string[] = [];
  for (let index = 1; index <= segments.length; index += 1) {
    folders.push(segments.slice(0, index).join('/'));
  }
  return folders;
};

const collectAncestorFolders = (path: string) => collectFolderHierarchy(getParentFolderPath(path));

const splitFileName = (name: string) => {
  const lastDot = name.lastIndexOf('.');
  if (lastDot <= 0) {
    return { base: name, extension: '' };
  }

  return {
    base: name.slice(0, lastDot),
    extension: name.slice(lastDot),
  };
};

const sortPaths = (paths: string[]) =>
  [...paths].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

const mergeFolderPaths = (...groups: string[][]) => {
  const all = new Set<string>();
  groups.forEach((group) => {
    group
      .map((path) => normalizeWorkspacePath(path))
      .filter(Boolean)
      .forEach((path) => {
        all.add(path);
      });
  });
  return sortPaths(Array.from(all));
};

const ensureUniquePath = (path: string, hasPath: (candidate: string) => boolean) => {
  const normalized = normalizeWorkspacePath(path);
  if (!normalized || !hasPath(normalized)) {
    return normalized;
  }

  const parent = getParentFolderPath(normalized);
  const fileName = getFileNameFromPath(normalized);
  const { base, extension } = splitFileName(fileName);

  let index = 1;
  while (index < 1000) {
    const candidateName = `${base}-${index}${extension}`;
    const candidatePath = parent ? `${parent}/${candidateName}` : candidateName;
    if (!hasPath(candidatePath)) {
      return candidatePath;
    }
    index += 1;
  }

  return normalized;
};

export const inferLanguageFromPath = (path: string) => {
  const extension = getFileNameFromPath(path).split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
};

const inferFolderPathsFromFiles = (files: File[]) => {
  const folders = new Set<string>();
  files.forEach((file) => {
    collectAncestorFolders(file.path).forEach((folder) => folders.add(folder));
  });
  return sortPaths(Array.from(folders));
};

const ensureUniqueFilePath = (path: string, files: File[], excludeFileId?: string) =>
  ensureUniquePath(path, (candidate) =>
    files.some((file) => file.path === candidate && file.id !== excludeFileId)
  );

const createFile = (id: string, path: string, language: string, content: string, savedContent?: string): File => {
  const normalizedPath = normalizeWorkspacePath(path);
  return {
    id,
    path: normalizedPath,
    name: getFileNameFromPath(normalizedPath),
    content,
    savedContent: savedContent ?? content,
    language,
  };
};

const createTreeFromFiles = (files: File[], useSavedContent = false) =>
  files.reduce<Record<string, string>>((tree, file) => {
    tree[file.path] = useSavedContent ? file.savedContent : file.content;
    return tree;
  }, {});

const createFilesFromTree = (tree: Record<string, string>) =>
  sortPaths(Object.keys(tree)).map((path) =>
    createFile(crypto.randomUUID(), path, inferLanguageFromPath(path), tree[path], tree[path])
  );

const resolveGitChangeType = (baseContent: string | undefined, workingContent: string | undefined): GitChangeType | null => {
  if (baseContent === undefined && workingContent !== undefined) {
    return 'added';
  }
  if (baseContent !== undefined && workingContent === undefined) {
    return 'deleted';
  }
  if (baseContent !== undefined && workingContent !== undefined && baseContent !== workingContent) {
    return 'modified';
  }
  return null;
};

export const getGitChanges = (
  files: File[],
  headTree: Record<string, string>,
  stagedPaths: string[] = []
): GitChange[] => {
  const workingTree = createTreeFromFiles(files);
  const stagedSet = new Set(stagedPaths.map((path) => normalizeWorkspacePath(path)).filter(Boolean));
  const allPaths = sortPaths(Array.from(new Set([...Object.keys(headTree), ...Object.keys(workingTree)])));

  return allPaths
    .map((path) => {
      const type = resolveGitChangeType(headTree[path], workingTree[path]);
      if (!type) {
        return null;
      }

      return {
        path,
        type,
        staged: stagedSet.has(path),
      } satisfies GitChange;
    })
    .filter((change): change is GitChange => Boolean(change));
};

const sanitizeBranchName = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, '-');
  if (!trimmed) {
    return '';
  }

  if (!/^[A-Za-z0-9._/-]+$/.test(trimmed)) {
    return '';
  }

  return normalizeWorkspacePath(trimmed);
};

export const DEFAULT_EDITOR_SETTINGS: EditorSettings = {
  fontSize: 14,
  wordWrap: true,
  minimap: false,
  lineNumbers: true,
  tabSize: 2,
  renderWhitespace: 'boundary',
};

export interface CodexSettings {
  model: string;
}

export const DEFAULT_CODEX_SETTINGS: CodexSettings = {
  model: 'gpt-5.1-codex',
};

const SETTINGS_STORAGE_KEY = 'lite_vscode_editor_settings';
const EXTENSIONS_STORAGE_KEY = 'installed_extensions';
const EXTENSION_METADATA_STORAGE_KEY = 'installed_extension_metadata';
const CODEX_SETTINGS_STORAGE_KEY = 'lite_vscode_codex_settings';
const CODEX_API_KEY_SESSION_KEY = 'lite_vscode_codex_api_key';
const SIDEBAR_WIDTH_STORAGE_KEY = 'lite_vscode_sidebar_width';
const TERMINAL_HEIGHT_STORAGE_KEY = 'lite_vscode_terminal_height';
const FILES_STORAGE_KEY = 'lite_vscode_files';
const FOLDERS_STORAGE_KEY = 'lite_vscode_folders';
const ACTIVE_FILE_STORAGE_KEY = 'lite_vscode_active_file';
const TERMINAL_OPEN_STORAGE_KEY = 'lite_vscode_terminal_open';
const GIT_STATE_STORAGE_KEY = 'lite_vscode_git_state';

const normalizeEditorSettings = (settings: Partial<EditorSettings>): EditorSettings => {
  const fontSizeRaw = typeof settings.fontSize === 'number' ? settings.fontSize : DEFAULT_EDITOR_SETTINGS.fontSize;
  const tabSizeRaw = typeof settings.tabSize === 'number' ? settings.tabSize : DEFAULT_EDITOR_SETTINGS.tabSize;
  const renderWhitespace = settings.renderWhitespace;

  return {
    fontSize: Math.min(24, Math.max(12, fontSizeRaw)),
    tabSize: tabSizeRaw === 2 || tabSizeRaw === 4 || tabSizeRaw === 8 ? tabSizeRaw : DEFAULT_EDITOR_SETTINGS.tabSize,
    wordWrap: settings.wordWrap ?? DEFAULT_EDITOR_SETTINGS.wordWrap,
    minimap: settings.minimap ?? DEFAULT_EDITOR_SETTINGS.minimap,
    lineNumbers: settings.lineNumbers ?? DEFAULT_EDITOR_SETTINGS.lineNumbers,
    renderWhitespace:
      renderWhitespace === 'none' || renderWhitespace === 'boundary' || renderWhitespace === 'all'
        ? renderWhitespace
        : DEFAULT_EDITOR_SETTINGS.renderWhitespace,
  };
};

const clampSidebarWidth = (value: number) => Math.min(520, Math.max(200, value));
const clampTerminalHeight = (value: number) => Math.min(480, Math.max(120, value));

const initialFiles: File[] = [
  createFile(
    '1',
    'src/App.tsx',
    'typescript',
    `import React from 'react';

export default function App() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Hello World</h1>
    </div>
  );
}`
  ),
  createFile('2', 'src/utils.ts', 'typescript', `export const add = (a: number, b: number) => a + b;`),
  createFile('3', 'src/styles.css', 'css', `body { background: #1e1e1e; color: #fff; }`),
];

const loadEditorSettings = (): EditorSettings => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }

  try {
    const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_EDITOR_SETTINGS };
    }

    return normalizeEditorSettings(JSON.parse(stored) as Partial<EditorSettings>);
  } catch {
    return { ...DEFAULT_EDITOR_SETTINGS };
  }
};

const persistEditorSettings = (settings: EditorSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures (private mode, quota, etc).
  }
};

const loadInstalledExtensions = (): Record<string, boolean> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(EXTENSIONS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
};

const loadCodexSettings = (): CodexSettings => {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_CODEX_SETTINGS };
  }

  try {
    const stored = window.localStorage.getItem(CODEX_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_CODEX_SETTINGS };
    }

    const parsed = JSON.parse(stored) as Partial<CodexSettings>;
    const model =
      typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : DEFAULT_CODEX_SETTINGS.model;
    return { model };
  } catch {
    return { ...DEFAULT_CODEX_SETTINGS };
  }
};

const persistCodexSettings = (settings: CodexSettings) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(CODEX_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage failures.
  }
};

const loadCodexApiKey = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    return window.sessionStorage.getItem(CODEX_API_KEY_SESSION_KEY);
  } catch {
    return null;
  }
};

const persistCodexApiKey = (key: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (key) {
      window.sessionStorage.setItem(CODEX_API_KEY_SESSION_KEY, key);
    } else {
      window.sessionStorage.removeItem(CODEX_API_KEY_SESSION_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
};

const loadSidebarWidth = (): number => {
  if (typeof window === 'undefined') {
    return 260;
  }

  try {
    const stored = window.localStorage.getItem(SIDEBAR_WIDTH_STORAGE_KEY);
    const parsed = stored ? Number(stored) : Number.NaN;
    if (!Number.isFinite(parsed)) {
      return 260;
    }
    return clampSidebarWidth(parsed);
  } catch {
    return 260;
  }
};

const persistSidebarWidth = (width: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SIDEBAR_WIDTH_STORAGE_KEY, String(width));
  } catch {
    // Ignore storage failures.
  }
};

const loadTerminalHeight = (): number => {
  if (typeof window === 'undefined') {
    return 192;
  }

  try {
    const stored = window.localStorage.getItem(TERMINAL_HEIGHT_STORAGE_KEY);
    const parsed = stored ? Number(stored) : Number.NaN;
    if (!Number.isFinite(parsed)) {
      return 192;
    }
    return clampTerminalHeight(parsed);
  } catch {
    return 192;
  }
};

const persistTerminalHeight = (height: number) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TERMINAL_HEIGHT_STORAGE_KEY, String(height));
  } catch {
    // Ignore storage failures.
  }
};

const normalizeStoredFile = (value: unknown): File | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const maybeFile = value as Partial<File> & { path?: string; name?: string };
  if (typeof maybeFile.id !== 'string' || typeof maybeFile.content !== 'string') {
    return null;
  }

  const pathRaw = typeof maybeFile.path === 'string' ? maybeFile.path : maybeFile.name;
  if (typeof pathRaw !== 'string') {
    return null;
  }

  const path = normalizeWorkspacePath(pathRaw);
  if (!path) {
    return null;
  }

  const savedContent = typeof maybeFile.savedContent === 'string' ? maybeFile.savedContent : maybeFile.content;
  const language = typeof maybeFile.language === 'string' ? maybeFile.language : inferLanguageFromPath(path);
  return createFile(maybeFile.id, path, language, maybeFile.content, savedContent);
};

const loadFiles = (): File[] => {
  if (typeof window === 'undefined') {
    return [...initialFiles];
  }

  try {
    const stored = window.localStorage.getItem(FILES_STORAGE_KEY);
    if (!stored) {
      return [...initialFiles];
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return [...initialFiles];
    }

    const files = parsed
      .map((entry) => normalizeStoredFile(entry))
      .filter((entry): entry is File => Boolean(entry));

    return files.length > 0 ? files : [...initialFiles];
  } catch {
    return [...initialFiles];
  }
};

const persistFiles = (files: File[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(FILES_STORAGE_KEY, JSON.stringify(files));
  } catch {
    // Ignore storage failures.
  }
};

const loadFolders = (files: File[]) => {
  const inferred = inferFolderPathsFromFiles(files);
  if (typeof window === 'undefined') {
    return inferred;
  }

  try {
    const stored = window.localStorage.getItem(FOLDERS_STORAGE_KEY);
    if (!stored) {
      return inferred;
    }

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return inferred;
    }

    const storedPaths = parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => normalizeWorkspacePath(entry))
      .filter(Boolean);

    return mergeFolderPaths(storedPaths, inferred);
  } catch {
    return inferred;
  }
};

const persistFolders = (folders: string[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(FOLDERS_STORAGE_KEY, JSON.stringify(folders));
  } catch {
    // Ignore storage failures.
  }
};

const createDefaultGitState = (files: File[]): PersistedGitState => ({
  currentBranch: 'main',
  branches: {
    main: {
      tree: createTreeFromFiles(files, true),
      commits: [],
    },
  },
  stagedPaths: [],
});

const normalizeStoredGitBranch = (branchName: string, value: unknown): GitBranchState | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<GitBranchState>;
  if (!candidate.tree || typeof candidate.tree !== 'object') {
    return null;
  }

  const tree = Object.entries(candidate.tree as Record<string, unknown>).reduce<Record<string, string>>(
    (acc, [path, content]) => {
      const normalizedPath = normalizeWorkspacePath(path);
      if (!normalizedPath || typeof content !== 'string') {
        return acc;
      }
      acc[normalizedPath] = content;
      return acc;
    },
    {}
  );

  const commits = Array.isArray(candidate.commits)
    ? candidate.commits
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const commit = entry as Partial<GitCommit>;
          if (
            typeof commit.id !== 'string'
            || typeof commit.message !== 'string'
            || typeof commit.timestamp !== 'number'
            || !Array.isArray(commit.changes)
          ) {
            return null;
          }

          const changes = commit.changes
            .map((change) => {
              if (!change || typeof change !== 'object') {
                return null;
              }

              const next = change as Partial<{ path: string; type: GitChangeType }>;
              if (
                typeof next.path !== 'string'
                || (next.type !== 'added' && next.type !== 'modified' && next.type !== 'deleted')
              ) {
                return null;
              }

              const normalizedPath = normalizeWorkspacePath(next.path);
              if (!normalizedPath) {
                return null;
              }

              return { path: normalizedPath, type: next.type };
            })
            .filter((change): change is { path: string; type: GitChangeType } => Boolean(change));

          return {
            id: commit.id,
            branch: typeof commit.branch === 'string' ? commit.branch : branchName,
            message: commit.message,
            timestamp: commit.timestamp,
            changes,
          } satisfies GitCommit;
        })
        .filter((entry): entry is GitCommit => Boolean(entry))
    : [];

  return { tree, commits };
};

const loadGitState = (files: File[]): PersistedGitState => {
  const fallback = createDefaultGitState(files);
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const stored = window.localStorage.getItem(GIT_STATE_STORAGE_KEY);
    if (!stored) {
      return fallback;
    }

    const parsed = JSON.parse(stored) as Partial<PersistedGitState>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.currentBranch !== 'string' || !parsed.branches) {
      return fallback;
    }

    const branches = Object.entries(parsed.branches).reduce<Record<string, GitBranchState>>((acc, [name, value]) => {
      const branchName = sanitizeBranchName(name);
      if (!branchName) {
        return acc;
      }

      const normalized = normalizeStoredGitBranch(branchName, value);
      if (!normalized) {
        return acc;
      }

      acc[branchName] = normalized;
      return acc;
    }, {});

    if (!Object.keys(branches).length) {
      return fallback;
    }

    const currentBranch = sanitizeBranchName(parsed.currentBranch);
    const resolvedCurrentBranch = currentBranch && branches[currentBranch] ? currentBranch : Object.keys(branches)[0];
    const stagedPaths = Array.isArray(parsed.stagedPaths)
      ? parsed.stagedPaths
          .filter((path): path is string => typeof path === 'string')
          .map((path) => normalizeWorkspacePath(path))
          .filter(Boolean)
      : [];

    return {
      currentBranch: resolvedCurrentBranch,
      branches,
      stagedPaths: sortPaths(Array.from(new Set(stagedPaths))),
    };
  } catch {
    return fallback;
  }
};

const persistGitState = (state: PersistedGitState) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(GIT_STATE_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage failures.
  }
};

const loadActiveFileId = (files: File[]): string | null => {
  if (typeof window === 'undefined') {
    return files[0]?.id ?? null;
  }

  try {
    const stored = window.localStorage.getItem(ACTIVE_FILE_STORAGE_KEY);
    if (stored && files.some((file) => file.id === stored)) {
      return stored;
    }
  } catch {
    // Ignore storage failures.
  }

  return files[0]?.id ?? null;
};

const persistActiveFileId = (id: string | null) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (id) {
      window.localStorage.setItem(ACTIVE_FILE_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(ACTIVE_FILE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
};

const loadTerminalOpen = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    const stored = window.localStorage.getItem(TERMINAL_OPEN_STORAGE_KEY);
    return stored === 'true';
  } catch {
    return false;
  }
};

const persistTerminalOpen = (open: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TERMINAL_OPEN_STORAGE_KEY, String(open));
  } catch {
    // Ignore storage failures.
  }
};

export interface InstalledExtensionMetadata {
  id: string;
  name?: string;
  displayName?: string;
  namespace?: string;
  version?: string;
  icon?: string;
}

const loadInstalledExtensionMetadata = (): Record<string, InstalledExtensionMetadata> => {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const stored = window.localStorage.getItem(EXTENSION_METADATA_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as Record<string, InstalledExtensionMetadata>) : {};
  } catch {
    return {};
  }
};

const persistInstalledExtensions = (extensions: Record<string, boolean>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(EXTENSIONS_STORAGE_KEY, JSON.stringify(extensions));
  } catch {
    // Ignore storage failures.
  }
};

const persistInstalledExtensionMetadata = (metadata: Record<string, InstalledExtensionMetadata>) => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(EXTENSION_METADATA_STORAGE_KEY, JSON.stringify(metadata));
  } catch {
    // Ignore storage failures.
  }
};

export interface CodexMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface FileStore {
  files: File[];
  folders: string[];
  activeFileId: string | null;
  activeSelection: string;
  gitBranches: Record<string, GitBranchState>;
  gitCurrentBranch: string;
  gitStagedPaths: string[];
  nativeGitSummary: NativeGitSummary | null;
  sidebarVisible: boolean;
  terminalOpen: boolean;
  activeActivityBarItem: ActivityBarItem;
  editorSettings: EditorSettings;
  installedExtensions: Record<string, boolean>;
  installedExtensionMetadata: Record<string, InstalledExtensionMetadata>;
  codexSettings: CodexSettings;
  codexApiKey: string | null;
  codexDrawerOpen: boolean;
  codexModalOpen: boolean;
  codexMessages: CodexMessage[];
  sidebarWidth: number;
  terminalHeight: number;

  // Actions
  addFile: (path: string, language?: string) => void;
  addFolder: (path: string) => void;
  renameFile: (id: string, path: string) => void;
  renameFolder: (fromPath: string, toPath: string) => void;
  applyFileEdit: (edit: CodexFileEdit) => void;
  stageGitPath: (path: string) => void;
  unstageGitPath: (path: string) => void;
  stageAllGitChanges: () => void;
  unstageAllGitChanges: () => void;
  commitGitChanges: (message: string) => { ok: boolean; error?: string };
  createGitBranch: (name: string) => { ok: boolean; error?: string };
  switchGitBranch: (name: string) => { ok: boolean; error?: string };
  setNativeGitSummary: (summary: NativeGitSummary | null) => void;
  saveFile: (id: string) => void;
  saveActiveFile: () => void;
  deleteFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setActiveFile: (id: string) => void;
  setActiveSelection: (selection: string) => void;
  toggleSidebar: () => void;
  setSidebarVisible: (visible: boolean) => void;
  toggleTerminal: () => void;
  setActiveActivityBarItem: (item: ActivityBarItem) => void;
  updateEditorSettings: (settings: Partial<EditorSettings>) => void;
  resetEditorSettings: () => void;
  installExtension: (id: string, metadata?: InstalledExtensionMetadata) => void;
  uninstallExtension: (id: string) => void;
  setCodexApiKey: (key: string) => void;
  clearCodexApiKey: () => void;
  setCodexModel: (model: string) => void;
  toggleCodexDrawer: () => void;
  setCodexDrawerOpen: (open: boolean) => void;
  openCodexModal: () => void;
  closeCodexModal: () => void;
  addCodexMessage: (message: CodexMessage) => void;
  clearCodexMessages: () => void;
  setSidebarWidth: (width: number) => void;
  setTerminalHeight: (height: number) => void;
}

const initialFilesState = loadFiles();
const initialFoldersState = loadFolders(initialFilesState);
const initialActiveFileId = loadActiveFileId(initialFilesState);
const initialGitState = loadGitState(initialFilesState);

export const useFileStore = create<FileStore>((set, get) => ({
  files: initialFilesState,
  folders: initialFoldersState,
  activeFileId: initialActiveFileId,
  activeSelection: '',
  gitBranches: initialGitState.branches,
  gitCurrentBranch: initialGitState.currentBranch,
  gitStagedPaths: initialGitState.stagedPaths,
  nativeGitSummary: null,
  sidebarVisible: true,
  terminalOpen: loadTerminalOpen(),
  activeActivityBarItem: 'explorer',
  editorSettings: loadEditorSettings(),
  installedExtensions: loadInstalledExtensions(),
  installedExtensionMetadata: loadInstalledExtensionMetadata(),
  codexSettings: loadCodexSettings(),
  codexApiKey: loadCodexApiKey(),
  codexDrawerOpen: false,
  codexModalOpen: false,
  codexMessages: [],
  sidebarWidth: loadSidebarWidth(),
  terminalHeight: loadTerminalHeight(),

  addFile: (path, language) =>
    set((state) => {
      const normalizedPath = normalizeWorkspacePath(path);
      if (!normalizedPath) {
        return {};
      }

      const uniquePath = ensureUniqueFilePath(normalizedPath, state.files);
      const nextLanguage = language?.trim() || inferLanguageFromPath(uniquePath);
      const newFile = createFile(crypto.randomUUID(), uniquePath, nextLanguage, '', '');
      const nextFiles = [...state.files, newFile];
      const nextFolders = mergeFolderPaths(state.folders, collectAncestorFolders(uniquePath));

      persistFiles(nextFiles);
      persistFolders(nextFolders);
      persistActiveFileId(newFile.id);

      return { files: nextFiles, folders: nextFolders, activeFileId: newFile.id };
    }),

  addFolder: (path) =>
    set((state) => {
      const normalizedPath = normalizeWorkspacePath(path);
      if (!normalizedPath) {
        return {};
      }

      const nextFolders = mergeFolderPaths(state.folders, collectFolderHierarchy(normalizedPath));
      persistFolders(nextFolders);
      return { folders: nextFolders };
    }),

  renameFile: (id, path) =>
    set((state) => {
      const existing = state.files.find((file) => file.id === id);
      if (!existing) {
        return {};
      }

      const normalizedPath = normalizeWorkspacePath(path);
      if (!normalizedPath) {
        return {};
      }

      const nextPath = ensureUniqueFilePath(normalizedPath, state.files, id);
      if (nextPath === existing.path) {
        return {};
      }

      const nextFiles = state.files.map((file) =>
        file.id === id
          ? {
              ...file,
              path: nextPath,
              name: getFileNameFromPath(nextPath),
              language: inferLanguageFromPath(nextPath),
            }
          : file
      );

      const nextFolders = mergeFolderPaths(state.folders, collectAncestorFolders(nextPath));
      persistFiles(nextFiles);
      persistFolders(nextFolders);
      return { files: nextFiles, folders: nextFolders };
    }),

  renameFolder: (fromPath, toPath) =>
    set((state) => {
      const normalizedFrom = normalizeWorkspacePath(fromPath);
      const normalizedTo = normalizeWorkspacePath(toPath);

      if (!normalizedFrom || !normalizedTo || normalizedFrom === normalizedTo) {
        return {};
      }

      if (normalizedTo.startsWith(`${normalizedFrom}/`)) {
        return {};
      }

      const allFolders = mergeFolderPaths(state.folders, inferFolderPathsFromFiles(state.files));
      const moveFolder = (path: string) => path === normalizedFrom || path.startsWith(`${normalizedFrom}/`);
      if (!allFolders.some(moveFolder)) {
        return {};
      }

      const movedFileIds = new Set(
        state.files.filter((file) => file.path.startsWith(`${normalizedFrom}/`)).map((file) => file.id)
      );
      const usedPaths = new Set(state.files.filter((file) => !movedFileIds.has(file.id)).map((file) => file.path));

      const nextFiles = state.files.map((file) => {
        if (!movedFileIds.has(file.id)) {
          return file;
        }

        const desiredPath = `${normalizedTo}${file.path.slice(normalizedFrom.length)}`;
        const uniquePath = ensureUniquePath(desiredPath, (candidate) => usedPaths.has(candidate));
        usedPaths.add(uniquePath);

        return {
          ...file,
          path: uniquePath,
          name: getFileNameFromPath(uniquePath),
          language: inferLanguageFromPath(uniquePath),
        };
      });

      const movedFolders = allFolders.filter(moveFolder).map((path) => `${normalizedTo}${path.slice(normalizedFrom.length)}`);
      const untouchedFolders = allFolders.filter((path) => !moveFolder(path));
      const nextFolders = mergeFolderPaths(
        untouchedFolders,
        movedFolders,
        collectFolderHierarchy(normalizedTo),
        inferFolderPathsFromFiles(nextFiles)
      );

      persistFiles(nextFiles);
      persistFolders(nextFolders);
      return { files: nextFiles, folders: nextFolders };
    }),

  applyFileEdit: (edit) =>
    set((state) => {
      const normalizedPath = normalizeWorkspacePath(edit.path);
      if (!normalizedPath) {
        return {};
      }

      const existing = state.files.find((file) => file.path === normalizedPath);
      const nextFiles = existing
        ? state.files.map((file) =>
            file.id === existing.id ? { ...file, content: edit.content } : file
          )
        : [
            ...state.files,
            createFile(
              crypto.randomUUID(),
              normalizedPath,
              inferLanguageFromPath(normalizedPath),
              edit.content,
              edit.content
            ),
          ];
      const nextActiveId = existing?.id ?? nextFiles[nextFiles.length - 1]?.id ?? state.activeFileId;
      const nextFolders = mergeFolderPaths(state.folders, collectAncestorFolders(normalizedPath));

      persistFiles(nextFiles);
      persistFolders(nextFolders);
      persistActiveFileId(nextActiveId);
      return { files: nextFiles, folders: nextFolders, activeFileId: nextActiveId };
    }),

  stageGitPath: (path) =>
    set((state) => {
      const normalizedPath = normalizeWorkspacePath(path);
      if (!normalizedPath) {
        return {};
      }

      const currentBranch = state.gitBranches[state.gitCurrentBranch];
      const changes = getGitChanges(state.files, currentBranch?.tree ?? {}, state.gitStagedPaths);
      if (!changes.some((change) => change.path === normalizedPath)) {
        return {};
      }

      const nextStagedPaths = sortPaths(Array.from(new Set([...state.gitStagedPaths, normalizedPath])));
      persistGitState({
        currentBranch: state.gitCurrentBranch,
        branches: state.gitBranches,
        stagedPaths: nextStagedPaths,
      });
      return { gitStagedPaths: nextStagedPaths };
    }),

  unstageGitPath: (path) =>
    set((state) => {
      const normalizedPath = normalizeWorkspacePath(path);
      if (!normalizedPath || !state.gitStagedPaths.includes(normalizedPath)) {
        return {};
      }

      const nextStagedPaths = state.gitStagedPaths.filter((entry) => entry !== normalizedPath);
      persistGitState({
        currentBranch: state.gitCurrentBranch,
        branches: state.gitBranches,
        stagedPaths: nextStagedPaths,
      });
      return { gitStagedPaths: nextStagedPaths };
    }),

  stageAllGitChanges: () =>
    set((state) => {
      const currentBranch = state.gitBranches[state.gitCurrentBranch];
      const allChangedPaths = getGitChanges(state.files, currentBranch?.tree ?? {}).map((change) => change.path);
      const nextStagedPaths = sortPaths(Array.from(new Set(allChangedPaths)));
      persistGitState({
        currentBranch: state.gitCurrentBranch,
        branches: state.gitBranches,
        stagedPaths: nextStagedPaths,
      });
      return { gitStagedPaths: nextStagedPaths };
    }),

  unstageAllGitChanges: () =>
    set((state) => {
      if (state.gitStagedPaths.length === 0) {
        return {};
      }

      persistGitState({
        currentBranch: state.gitCurrentBranch,
        branches: state.gitBranches,
        stagedPaths: [],
      });
      return { gitStagedPaths: [] };
    }),

  commitGitChanges: (message) => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      return { ok: false, error: 'Commit message is required.' };
    }

    const state = get();
    const currentBranchState = state.gitBranches[state.gitCurrentBranch];
    if (!currentBranchState) {
      return { ok: false, error: 'Current branch is unavailable.' };
    }

    const stagedChanges = getGitChanges(state.files, currentBranchState.tree, state.gitStagedPaths)
      .filter((change) => change.staged);
    if (stagedChanges.length === 0) {
      return { ok: false, error: 'Stage at least one change before committing.' };
    }

    const workingTree = createTreeFromFiles(state.files);
    const nextTree = { ...currentBranchState.tree };
    stagedChanges.forEach((change) => {
      if (change.type === 'deleted') {
        delete nextTree[change.path];
        return;
      }

      const content = workingTree[change.path];
      if (typeof content === 'string') {
        nextTree[change.path] = content;
      }
    });

    const commit: GitCommit = {
      id: crypto.randomUUID(),
      branch: state.gitCurrentBranch,
      message: trimmedMessage,
      timestamp: Date.now(),
      changes: stagedChanges.map((change) => ({ path: change.path, type: change.type })),
    };

    const nextBranches: Record<string, GitBranchState> = {
      ...state.gitBranches,
      [state.gitCurrentBranch]: {
        tree: nextTree,
        commits: [...currentBranchState.commits, commit],
      },
    };

    set({
      gitBranches: nextBranches,
      gitStagedPaths: [],
    });

    persistGitState({
      currentBranch: state.gitCurrentBranch,
      branches: nextBranches,
      stagedPaths: [],
    });

    return { ok: true };
  },

  createGitBranch: (name) => {
    const normalizedName = sanitizeBranchName(name);
    if (!normalizedName) {
      return { ok: false, error: 'Branch name can only contain letters, numbers, ., _, -, and /.' };
    }

    const state = get();
    if (state.gitBranches[normalizedName]) {
      return { ok: false, error: `Branch "${normalizedName}" already exists.` };
    }

    const sourceBranch = state.gitBranches[state.gitCurrentBranch];
    if (!sourceBranch) {
      return { ok: false, error: 'Current branch is unavailable.' };
    }

    const nextBranches: Record<string, GitBranchState> = {
      ...state.gitBranches,
      [normalizedName]: {
        tree: { ...sourceBranch.tree },
        commits: [...sourceBranch.commits],
      },
    };

    set({ gitBranches: nextBranches });
    persistGitState({
      currentBranch: state.gitCurrentBranch,
      branches: nextBranches,
      stagedPaths: state.gitStagedPaths,
    });
    return { ok: true };
  },

  switchGitBranch: (name) => {
    const normalizedName = sanitizeBranchName(name);
    if (!normalizedName) {
      return { ok: false, error: 'Branch name is invalid.' };
    }

    const state = get();
    const targetBranch = state.gitBranches[normalizedName];
    if (!targetBranch) {
      return { ok: false, error: `Branch "${normalizedName}" does not exist.` };
    }

    if (normalizedName === state.gitCurrentBranch) {
      return { ok: true };
    }

    const currentBranch = state.gitBranches[state.gitCurrentBranch];
    const pendingChanges = getGitChanges(state.files, currentBranch?.tree ?? {}, state.gitStagedPaths);
    if (pendingChanges.length > 0) {
      return { ok: false, error: 'Commit or unstage changes before switching branches.' };
    }

    const nextFiles = createFilesFromTree(targetBranch.tree);
    const nextFolders = inferFolderPathsFromFiles(nextFiles);
    const nextActiveFileId = nextFiles[0]?.id ?? null;

    set({
      files: nextFiles,
      folders: nextFolders,
      activeFileId: nextActiveFileId,
      gitCurrentBranch: normalizedName,
      gitStagedPaths: [],
      activeSelection: '',
    });

    persistFiles(nextFiles);
    persistFolders(nextFolders);
    persistActiveFileId(nextActiveFileId);
    persistGitState({
      currentBranch: normalizedName,
      branches: state.gitBranches,
      stagedPaths: [],
    });

    return { ok: true };
  },

  saveFile: (id) =>
    set((state) => {
      let changed = false;
      const nextFiles = state.files.map((file) => {
        if (file.id !== id || file.savedContent === file.content) {
          return file;
        }
        changed = true;
        return { ...file, savedContent: file.content };
      });

      if (!changed) {
        return {};
      }

      persistFiles(nextFiles);
      return { files: nextFiles };
    }),

  saveActiveFile: () => {
    const activeFileId = get().activeFileId;
    if (!activeFileId) {
      return;
    }
    get().saveFile(activeFileId);
  },

  deleteFile: (id) =>
    set((state) => {
      const nextFiles = state.files.filter((file) => file.id !== id);
      const nextActive = state.activeFileId === id ? (nextFiles[0]?.id ?? null) : state.activeFileId;

      persistFiles(nextFiles);
      persistActiveFileId(nextActive);
      return {
        files: nextFiles,
        activeFileId: nextActive,
      };
    }),

  updateFileContent: (id, content) =>
    set((state) => {
      const nextFiles = state.files.map((file) => (file.id === id ? { ...file, content } : file));
      persistFiles(nextFiles);
      return { files: nextFiles };
    }),

  setActiveFile: (id) =>
    set((state) => {
      if (!state.files.some((file) => file.id === id)) {
        return {};
      }

      persistActiveFileId(id);
      return { activeFileId: id, activeSelection: '' };
    }),

  setActiveSelection: (selection) => set({ activeSelection: selection }),

  setNativeGitSummary: (summary) => set({ nativeGitSummary: summary }),

  toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),

  setSidebarVisible: (visible) => set({ sidebarVisible: visible }),

  toggleTerminal: () =>
    set((state) => {
      const next = !state.terminalOpen;
      persistTerminalOpen(next);
      return { terminalOpen: next };
    }),

  setActiveActivityBarItem: (item) => set({ activeActivityBarItem: item, sidebarVisible: true }),

  updateEditorSettings: (settings) =>
    set((state) => {
      const next = normalizeEditorSettings({ ...state.editorSettings, ...settings });
      persistEditorSettings(next);
      return { editorSettings: next };
    }),

  resetEditorSettings: () =>
    set(() => {
      const next = { ...DEFAULT_EDITOR_SETTINGS };
      persistEditorSettings(next);
      return { editorSettings: next };
    }),

  installExtension: (id, metadata) =>
    set((state) => {
      const nextInstalled = { ...state.installedExtensions, [id]: true };
      const nextMetadata = metadata
        ? { ...state.installedExtensionMetadata, [id]: metadata }
        : state.installedExtensionMetadata;

      persistInstalledExtensions(nextInstalled);
      if (metadata) {
        persistInstalledExtensionMetadata(nextMetadata);
      }

      return {
        installedExtensions: nextInstalled,
        installedExtensionMetadata: nextMetadata,
      };
    }),

  uninstallExtension: (id) =>
    set((state) => {
      const nextInstalled = { ...state.installedExtensions };
      delete nextInstalled[id];

      const nextMetadata = { ...state.installedExtensionMetadata };
      if (nextMetadata[id]) {
        delete nextMetadata[id];
        persistInstalledExtensionMetadata(nextMetadata);
      }

      persistInstalledExtensions(nextInstalled);
      return { installedExtensions: nextInstalled, installedExtensionMetadata: nextMetadata };
    }),

  setCodexApiKey: (key) => {
    const trimmed = key.trim();
    persistCodexApiKey(trimmed || null);
    set({ codexApiKey: trimmed || null });
  },

  clearCodexApiKey: () => {
    persistCodexApiKey(null);
    set({ codexApiKey: null });
  },

  setCodexModel: (model) =>
    set((state) => {
      const trimmed = model.trim() || DEFAULT_CODEX_SETTINGS.model;
      const next = { ...state.codexSettings, model: trimmed };
      persistCodexSettings(next);
      return { codexSettings: next };
    }),

  toggleCodexDrawer: () => set((state) => ({ codexDrawerOpen: !state.codexDrawerOpen })),

  setCodexDrawerOpen: (open) => set({ codexDrawerOpen: open }),

  openCodexModal: () => set({ codexModalOpen: true }),

  closeCodexModal: () => set({ codexModalOpen: false }),

  addCodexMessage: (message) => set((state) => ({ codexMessages: [...state.codexMessages, message] })),

  clearCodexMessages: () => set({ codexMessages: [] }),

  setSidebarWidth: (width) =>
    set(() => {
      const next = clampSidebarWidth(width);
      persistSidebarWidth(next);
      return { sidebarWidth: next };
    }),

  setTerminalHeight: (height) =>
    set(() => {
      const next = clampTerminalHeight(height);
      persistTerminalHeight(next);
      return { terminalHeight: next };
    }),
}));
