import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, GitBranch, GitCommit, Minus, Pin, PinOff, Plus, RefreshCw, X } from 'lucide-react';
import { getGitChanges, useFileStore, type GitChange } from '../../store/useFileStore';
import {
  canUseNativeGit,
  commitNativeGitChanges,
  createNativeGitBranch,
  fetchNativeGitStatus,
  stageAllNativeGitChanges,
  stageNativeGitPath,
  switchNativeGitBranch,
  unstageAllNativeGitChanges,
  unstageNativeGitPath,
  type NativeGitStatus,
} from '../../utils/nativeGit';
import { useShallow } from 'zustand/shallow';

const STATUS_BADGE: Record<GitChange['type'], { label: string; className: string }> = {
  added: { label: 'A', className: 'text-green-400' },
  modified: { label: 'M', className: 'text-yellow-400' },
  deleted: { label: 'D', className: 'text-red-400' },
};

const NATIVE_GIT_REPO_PATH_STORAGE_KEY = 'lite_vscode_native_git_repo_path';
const NATIVE_GIT_TRUSTED_REPOS_STORAGE_KEY = 'lite_vscode_native_git_trusted_repos';
const NATIVE_GIT_RECENT_REPOS_STORAGE_KEY = 'lite_vscode_native_git_recent_repos';
const NATIVE_GIT_PINNED_REPOS_STORAGE_KEY = 'lite_vscode_native_git_pinned_repos';
const NATIVE_GIT_AUTO_REFRESH_INTERVAL_MS = 15000;
const NATIVE_GIT_EDITOR_REFRESH_DEBOUNCE_MS = 1500;
const NATIVE_GIT_MAX_RECENT_REPOS = 8;
const NATIVE_GIT_MAX_TRUSTED_REPOS = 20;
const NATIVE_GIT_MAX_PINNED_REPOS = 9;

const normalizeRepoPath = (value: string) => value.trim();

const dedupeRepoPaths = (paths: string[]) => {
  const seen = new Set<string>();
  return paths
    .map((path) => normalizeRepoPath(path))
    .filter(Boolean)
    .filter((path) => {
      if (seen.has(path)) {
        return false;
      }
      seen.add(path);
      return true;
    });
};

const loadStoredRepoPaths = (storageKey: string) => {
  if (typeof window === 'undefined') {
    return [] as string[];
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return [] as string[];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }
    return dedupeRepoPaths(parsed.filter((value): value is string => typeof value === 'string'));
  } catch {
    return [] as string[];
  }
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Git operation failed.';
};

export const SourceControl: React.FC = () => {
  const {
    files,
    setActiveFile,
    setSidebarVisible,
    gitBranches,
    gitCurrentBranch,
    gitStagedPaths,
    stageGitPath,
    unstageGitPath,
    stageAllGitChanges,
    unstageAllGitChanges,
    commitGitChanges,
    createGitBranch,
    switchGitBranch,
    setNativeGitSummary,
  } = useFileStore(
    useShallow((state) => ({
      files: state.files,
      setActiveFile: state.setActiveFile,
      setSidebarVisible: state.setSidebarVisible,
      gitBranches: state.gitBranches,
      gitCurrentBranch: state.gitCurrentBranch,
      gitStagedPaths: state.gitStagedPaths,
      stageGitPath: state.stageGitPath,
      unstageGitPath: state.unstageGitPath,
      stageAllGitChanges: state.stageAllGitChanges,
      unstageAllGitChanges: state.unstageAllGitChanges,
      commitGitChanges: state.commitGitChanges,
      createGitBranch: state.createGitBranch,
      switchGitBranch: state.switchGitBranch,
      setNativeGitSummary: state.setNativeGitSummary,
    }))
  );

  const [commitMessage, setCommitMessage] = useState('');
  const [branchDraft, setBranchDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [nativeAvailable, setNativeAvailable] = useState(false);
  const [nativeBusy, setNativeBusy] = useState(false);
  const [nativeStatus, setNativeStatus] = useState<NativeGitStatus | null>(null);
  const [pinnedRepos, setPinnedRepos] = useState(() => loadStoredRepoPaths(NATIVE_GIT_PINNED_REPOS_STORAGE_KEY));
  const [trustedRepos, setTrustedRepos] = useState(() => loadStoredRepoPaths(NATIVE_GIT_TRUSTED_REPOS_STORAGE_KEY));
  const [recentRepos, setRecentRepos] = useState(() => loadStoredRepoPaths(NATIVE_GIT_RECENT_REPOS_STORAGE_KEY));
  const [selectedTrustedRepo, setSelectedTrustedRepo] = useState('');
  const [nativeRepoPath, setNativeRepoPath] = useState(() => {
    if (typeof window === 'undefined') {
      return '';
    }
    try {
      return window.localStorage.getItem(NATIVE_GIT_REPO_PATH_STORAGE_KEY) ?? '';
    } catch {
      return '';
    }
  });
  const nativeRefreshInFlightRef = useRef(false);
  const skipEditorRefreshRef = useRef(true);

  const currentBranchState = gitBranches[gitCurrentBranch];
  const inMemoryChanges = useMemo(
    () => getGitChanges(files, currentBranchState?.tree ?? {}, gitStagedPaths),
    [files, currentBranchState?.tree, gitStagedPaths]
  );
  const inMemoryStagedChanges = inMemoryChanges.filter((change) => change.staged);
  const inMemoryUnstagedChanges = inMemoryChanges.filter((change) => !change.staged);
  const inMemoryBranchNames = useMemo(
    () => Object.keys(gitBranches).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
    [gitBranches]
  );
  const inMemoryLatestCommit = currentBranchState?.commits[currentBranchState.commits.length - 1];

  const trimmedNativeRepoPath = nativeRepoPath.trim();
  const usingNativeBackend = nativeAvailable && Boolean(trimmedNativeRepoPath);
  const isCurrentRepoPinned = pinnedRepos.includes(trimmedNativeRepoPath);

  const quickSwitchRepos = useMemo(
    () =>
      dedupeRepoPaths([...pinnedRepos, ...trustedRepos, ...recentRepos]).slice(
        0,
        NATIVE_GIT_MAX_PINNED_REPOS
      ),
    [pinnedRepos, trustedRepos, recentRepos]
  );

  const addRecentRepo = useCallback((path: string) => {
    const normalizedPath = normalizeRepoPath(path);
    if (!normalizedPath) {
      return;
    }

    setRecentRepos((previous) => {
      if (previous[0] === normalizedPath) {
        return previous;
      }

      const next = [normalizedPath, ...previous.filter((entry) => entry !== normalizedPath)].slice(
        0,
        NATIVE_GIT_MAX_RECENT_REPOS
      );

      if (next.length === previous.length && next.every((entry, index) => entry === previous[index])) {
        return previous;
      }

      return next;
    });
  }, []);

  const addTrustedRepo = useCallback((path: string) => {
    const normalizedPath = normalizeRepoPath(path);
    if (!normalizedPath) {
      return;
    }

    setTrustedRepos((previous) => {
      const next = [normalizedPath, ...previous.filter((entry) => entry !== normalizedPath)].slice(
        0,
        NATIVE_GIT_MAX_TRUSTED_REPOS
      );

      if (next.length === previous.length && next.every((entry, index) => entry === previous[index])) {
        return previous;
      }

      return next;
    });
  }, []);

  const removeTrustedRepo = useCallback((path: string) => {
    const normalizedPath = normalizeRepoPath(path);
    if (!normalizedPath) {
      return;
    }

    setTrustedRepos((previous) => previous.filter((entry) => entry !== normalizedPath));
  }, []);

  const addPinnedRepo = useCallback((path: string) => {
    const normalizedPath = normalizeRepoPath(path);
    if (!normalizedPath) {
      return;
    }

    setPinnedRepos((previous) => {
      if (previous[0] === normalizedPath) {
        return previous;
      }

      const next = [normalizedPath, ...previous.filter((entry) => entry !== normalizedPath)].slice(
        0,
        NATIVE_GIT_MAX_PINNED_REPOS
      );

      if (next.length === previous.length && next.every((entry, index) => entry === previous[index])) {
        return previous;
      }

      return next;
    });
  }, []);

  const removePinnedRepo = useCallback((path: string) => {
    const normalizedPath = normalizeRepoPath(path);
    if (!normalizedPath) {
      return;
    }

    setPinnedRepos((previous) => previous.filter((entry) => entry !== normalizedPath));
  }, []);

  const switchRepoPath = useCallback(
    (path: string) => {
      const normalizedPath = normalizeRepoPath(path);
      if (!normalizedPath) {
        return;
      }
      setNativeRepoPath(normalizedPath);
      if (trustedRepos.includes(normalizedPath)) {
        setSelectedTrustedRepo(normalizedPath);
      }
      addRecentRepo(normalizedPath);
      setError(null);
    },
    [addRecentRepo, trustedRepos]
  );

  const refreshNativeStatus = useCallback(async () => {
    if (!usingNativeBackend) {
      setNativeStatus(null);
      return;
    }
    if (nativeRefreshInFlightRef.current) {
      return;
    }

    nativeRefreshInFlightRef.current = true;
    setNativeBusy(true);
    try {
      const status = await fetchNativeGitStatus(trimmedNativeRepoPath);
      setNativeStatus(status);
      addRecentRepo(trimmedNativeRepoPath);
      setError(null);
    } catch (nativeError) {
      setNativeStatus(null);
      setError(getErrorMessage(nativeError));
    } finally {
      nativeRefreshInFlightRef.current = false;
      setNativeBusy(false);
    }
  }, [addRecentRepo, trimmedNativeRepoPath, usingNativeBackend]);

  useEffect(() => {
    let cancelled = false;
    const resolveAvailability = async () => {
      const available = await canUseNativeGit();
      if (!cancelled) {
        setNativeAvailable(available);
      }
    };
    resolveAvailability();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      if (nativeRepoPath.trim()) {
        window.localStorage.setItem(NATIVE_GIT_REPO_PATH_STORAGE_KEY, nativeRepoPath.trim());
      } else {
        window.localStorage.removeItem(NATIVE_GIT_REPO_PATH_STORAGE_KEY);
      }
    } catch {
      // Ignore storage failures.
    }
  }, [nativeRepoPath]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(NATIVE_GIT_PINNED_REPOS_STORAGE_KEY, JSON.stringify(dedupeRepoPaths(pinnedRepos)));
    } catch {
      // Ignore storage failures.
    }
  }, [pinnedRepos]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(NATIVE_GIT_TRUSTED_REPOS_STORAGE_KEY, JSON.stringify(dedupeRepoPaths(trustedRepos)));
    } catch {
      // Ignore storage failures.
    }
  }, [trustedRepos]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(NATIVE_GIT_RECENT_REPOS_STORAGE_KEY, JSON.stringify(dedupeRepoPaths(recentRepos)));
    } catch {
      // Ignore storage failures.
    }
  }, [recentRepos]);

  useEffect(() => {
    if (selectedTrustedRepo) {
      return;
    }
    if (trustedRepos.length === 0) {
      return;
    }
    setSelectedTrustedRepo(trustedRepos[0]);
  }, [selectedTrustedRepo, trustedRepos]);

  useEffect(() => {
    if (!usingNativeBackend) {
      setNativeStatus(null);
      skipEditorRefreshRef.current = true;
      return;
    }
    void refreshNativeStatus();
  }, [usingNativeBackend, refreshNativeStatus]);

  useEffect(() => {
    if (!usingNativeBackend) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refreshNativeStatus();
    }, NATIVE_GIT_AUTO_REFRESH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [refreshNativeStatus, usingNativeBackend]);

  useEffect(() => {
    if (!usingNativeBackend) {
      return;
    }

    const handleWindowFocus = () => {
      void refreshNativeStatus();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshNativeStatus();
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshNativeStatus, usingNativeBackend]);

  useEffect(() => {
    if (!usingNativeBackend) {
      return;
    }
    if (skipEditorRefreshRef.current) {
      skipEditorRefreshRef.current = false;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void refreshNativeStatus();
    }, NATIVE_GIT_EDITOR_REFRESH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [files, refreshNativeStatus, usingNativeBackend]);

  useEffect(() => {
    if (!nativeAvailable || quickSwitchRepos.length === 0) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      const isPrimary = event.metaKey || event.ctrlKey;
      if (!isPrimary || !event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target) {
        const tagName = target.tagName.toLowerCase();
        const isEditable =
          tagName === 'input'
          || tagName === 'textarea'
          || tagName === 'select'
          || target.isContentEditable;
        if (isEditable) {
          return;
        }
      }

      const digitMatch = event.key.match(/^[1-9]$/);
      if (digitMatch) {
        const index = Number(digitMatch[0]) - 1;
        const nextPath = quickSwitchRepos[index];
        if (!nextPath) {
          return;
        }

        event.preventDefault();
        switchRepoPath(nextPath);
        return;
      }

      if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
        return;
      }

      const currentIndex = quickSwitchRepos.findIndex((repoPath) => repoPath === trimmedNativeRepoPath);
      const startIndex = currentIndex >= 0 ? currentIndex : 0;
      const nextIndex =
        event.key === 'ArrowDown'
          ? (startIndex + 1) % quickSwitchRepos.length
          : (startIndex - 1 + quickSwitchRepos.length) % quickSwitchRepos.length;

      const nextPath = quickSwitchRepos[nextIndex];
      if (!nextPath) {
        return;
      }

      event.preventDefault();
      switchRepoPath(nextPath);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nativeAvailable, quickSwitchRepos, switchRepoPath, trimmedNativeRepoPath]);

  useEffect(() => {
    if (usingNativeBackend && nativeStatus) {
      setNativeGitSummary({
        branch: nativeStatus.currentBranch,
        staged: nativeStatus.staged.length,
        unstaged: nativeStatus.unstaged.length,
      });
      return;
    }

    setNativeGitSummary(null);
  }, [nativeStatus, setNativeGitSummary, usingNativeBackend]);

  useEffect(() => () => setNativeGitSummary(null), [setNativeGitSummary]);

  const stagedChanges = usingNativeBackend ? (nativeStatus?.staged ?? []) : inMemoryStagedChanges;
  const unstagedChanges = usingNativeBackend ? (nativeStatus?.unstaged ?? []) : inMemoryUnstagedChanges;
  const currentBranch = usingNativeBackend ? (nativeStatus?.currentBranch ?? 'main') : gitCurrentBranch;
  const branchNames = usingNativeBackend ? (nativeStatus?.branches ?? []) : inMemoryBranchNames;
  const latestCommitMessage = usingNativeBackend ? null : inMemoryLatestCommit?.message;

  const openPath = (path: string) => {
    const match = files.find((file) => file.path === path);
    if (match) {
      setActiveFile(match.id);
      if (window.innerWidth < 768) {
        setSidebarVisible(false);
      }
    }
  };

  const handleStageAll = async () => {
    if (!usingNativeBackend) {
      stageAllGitChanges();
      return;
    }

    setNativeBusy(true);
    try {
      await stageAllNativeGitChanges(trimmedNativeRepoPath);
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleUnstageAll = async () => {
    if (!usingNativeBackend) {
      unstageAllGitChanges();
      return;
    }

    setNativeBusy(true);
    try {
      await unstageAllNativeGitChanges(trimmedNativeRepoPath);
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleStagePath = async (path: string) => {
    if (!usingNativeBackend) {
      stageGitPath(path);
      return;
    }

    setNativeBusy(true);
    try {
      await stageNativeGitPath(trimmedNativeRepoPath, path);
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleUnstagePath = async (path: string) => {
    if (!usingNativeBackend) {
      unstageGitPath(path);
      return;
    }

    setNativeBusy(true);
    try {
      await unstageNativeGitPath(trimmedNativeRepoPath, path);
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleCommit = async () => {
    if (!usingNativeBackend) {
      const result = commitGitChanges(commitMessage);
      if (!result.ok) {
        setError(result.error ?? 'Commit failed.');
        return;
      }
      setCommitMessage('');
      setError(null);
      return;
    }

    setNativeBusy(true);
    try {
      await commitNativeGitChanges(trimmedNativeRepoPath, commitMessage);
      setCommitMessage('');
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleBranchSwitch = async (name: string) => {
    if (!usingNativeBackend) {
      const result = switchGitBranch(name);
      if (!result.ok) {
        setError(result.error ?? 'Failed to switch branch.');
        return;
      }
      setError(null);
      return;
    }

    setNativeBusy(true);
    try {
      await switchNativeGitBranch(trimmedNativeRepoPath, name);
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleCreateBranch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!usingNativeBackend) {
      const result = createGitBranch(branchDraft);
      if (!result.ok) {
        setError(result.error ?? 'Failed to create branch.');
        return;
      }
      setBranchDraft('');
      setError(null);
      return;
    }

    setNativeBusy(true);
    try {
      await createNativeGitBranch(trimmedNativeRepoPath, branchDraft);
      setBranchDraft('');
      await refreshNativeStatus();
      setError(null);
    } catch (nativeError) {
      setError(getErrorMessage(nativeError));
    } finally {
      setNativeBusy(false);
    }
  };

  const handleTrustCurrentRepo = () => {
    if (!trimmedNativeRepoPath) {
      setError('Enter a repository path before trusting it.');
      return;
    }
    addTrustedRepo(trimmedNativeRepoPath);
    setSelectedTrustedRepo(trimmedNativeRepoPath);
    setError(null);
  };

  const handleUseTrustedRepo = () => {
    if (!selectedTrustedRepo) {
      return;
    }
    switchRepoPath(selectedTrustedRepo);
  };

  const handleForgetTrustedRepo = () => {
    if (!selectedTrustedRepo) {
      return;
    }

    const forgotten = selectedTrustedRepo;
    removeTrustedRepo(forgotten);
    removePinnedRepo(forgotten);
    if (normalizeRepoPath(nativeRepoPath) === forgotten) {
      setNativeRepoPath('');
    }
    setSelectedTrustedRepo((previous) => (previous === forgotten ? '' : previous));
  };

  const handleTogglePinCurrentRepo = () => {
    if (!trimmedNativeRepoPath) {
      setError('Enter a repository path before pinning it.');
      return;
    }

    if (isCurrentRepoPinned) {
      removePinnedRepo(trimmedNativeRepoPath);
    } else {
      addPinnedRepo(trimmedNativeRepoPath);
    }
    setError(null);
  };

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="panel-header">
        <span className="panel-title">Source Control</span>
        <div className="panel-actions">
          <button
            onClick={() => setSidebarVisible(false)}
            className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
            title="Close"
          >
            <X size={16} />
          </button>
          <button
            onClick={handleStageAll}
            className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
            title="Stage all changes"
            disabled={nativeBusy}
          >
            <Check size={14} />
          </button>
          <button
            onClick={handleUnstageAll}
            className="hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
            title="Unstage all changes"
            disabled={nativeBusy}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {nativeAvailable && (
        <div className="px-4 py-3 border-b border-vscode-border/40 space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-gray-400">Native Git Repository</div>
          <div className="flex gap-2">
            <input
              value={nativeRepoPath}
              onChange={(event) => setNativeRepoPath(event.target.value)}
              placeholder="/absolute/path/to/repo"
              className="flex-1 bg-vscode-input text-white text-xs px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar rounded"
            />
            <button
              type="button"
              onClick={() => void refreshNativeStatus()}
              className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-hover transition-colors duration-150 disabled:opacity-50"
              disabled={!trimmedNativeRepoPath || nativeBusy}
            >
              Connect
            </button>
          </div>
          <div className="flex gap-2">
            <select
              className="flex-1 bg-vscode-input text-white text-xs px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar rounded"
              value={selectedTrustedRepo}
              onChange={(event) => setSelectedTrustedRepo(event.target.value)}
              disabled={trustedRepos.length === 0}
            >
              {trustedRepos.length === 0 ? (
                <option value="">No trusted repos</option>
              ) : (
                <>
                  <option value="">Trusted repos</option>
                  {trustedRepos.map((repoPath) => (
                    <option key={repoPath} value={repoPath}>
                      {pinnedRepos.includes(repoPath) ? `[PIN] ${repoPath}` : repoPath}
                    </option>
                  ))}
                </>
              )}
            </select>
            <button
              type="button"
              onClick={handleUseTrustedRepo}
              className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-hover transition-colors duration-150 disabled:opacity-50"
              disabled={!selectedTrustedRepo}
            >
              Use
            </button>
            <button
              type="button"
              onClick={handleForgetTrustedRepo}
              className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-hover transition-colors duration-150 disabled:opacity-50"
              disabled={!selectedTrustedRepo}
            >
              Forget
            </button>
            <button
              type="button"
              onClick={handleTogglePinCurrentRepo}
              className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-hover transition-colors duration-150 disabled:opacity-50 flex items-center gap-1"
              disabled={!trimmedNativeRepoPath}
            >
              {isCurrentRepoPinned ? <PinOff size={12} /> : <Pin size={12} />}
              {isCurrentRepoPinned ? 'Unpin' : 'Pin'}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleTrustCurrentRepo}
              className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-hover transition-colors duration-150"
            >
              Trust Current Path
            </button>
            <select
              className="flex-1 bg-vscode-input text-white text-xs px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar rounded"
              value=""
              onChange={(event) => {
                const nextRepoPath = normalizeRepoPath(event.target.value);
                if (nextRepoPath) {
                  setNativeRepoPath(nextRepoPath);
                }
              }}
              disabled={recentRepos.length === 0}
            >
              {recentRepos.length === 0 ? (
                <option value="">No recent repos</option>
              ) : (
                <>
                  <option value="">Recent repos</option>
                  {recentRepos.map((repoPath) => (
                    <option key={repoPath} value={repoPath}>
                      {pinnedRepos.includes(repoPath) ? `[PIN] ${repoPath}` : repoPath}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
          {quickSwitchRepos.length > 0 && (
            <div className="text-[10px] text-gray-500">
              Quick switch: Ctrl/Cmd+Alt+1..9 or Ctrl/Cmd+Alt+ArrowUp/ArrowDown
            </div>
          )}
          <div className="text-[10px] text-gray-500">
            {usingNativeBackend ? 'Using native git backend.' : 'No repo path configured. Falling back to in-app git.'}
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-b border-vscode-border/40 space-y-2">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-gray-400" />
          <select
            className="flex-1 bg-vscode-input text-white text-xs px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar rounded"
            value={currentBranch}
            onChange={(event) => void handleBranchSwitch(event.target.value)}
            disabled={nativeBusy || branchNames.length === 0}
          >
            {branchNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <form className="flex gap-2" onSubmit={(event) => void handleCreateBranch(event)}>
          <input
            value={branchDraft}
            onChange={(event) => setBranchDraft(event.target.value)}
            placeholder="new-branch"
            className="flex-1 bg-vscode-input text-white text-xs px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar rounded"
          />
          <button
            type="submit"
            className="px-2 py-1 text-xs rounded border border-vscode-border hover:bg-vscode-hover transition-colors duration-150 disabled:opacity-50"
            disabled={nativeBusy}
          >
            Create
          </button>
        </form>
      </div>

      <div className="px-4 py-3 border-b border-vscode-border/40 space-y-2">
        <input
          value={commitMessage}
          onChange={(event) => setCommitMessage(event.target.value)}
          onKeyDown={(event) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
              event.preventDefault();
              void handleCommit();
            }
          }}
          className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar rounded"
          placeholder="Message (Ctrl/Cmd+Enter to commit)"
        />
        <button
          onClick={() => void handleCommit()}
          disabled={nativeBusy || stagedChanges.length === 0}
          className="w-full bg-vscode-statusBar text-white py-1 px-2 text-sm font-medium hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 rounded"
        >
          <GitCommit size={14} /> Commit {stagedChanges.length > 0 ? `(${stagedChanges.length})` : ''}
        </button>
        {error && <div className="text-[11px] text-red-400">{error}</div>}
        {latestCommitMessage && (
          <div className="text-[11px] text-gray-500 truncate">
            Last: {latestCommitMessage}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-2 panel-section-title text-blue-400">
          Staged Changes ({stagedChanges.length})
        </div>
        {stagedChanges.length === 0 && (
          <div className="px-4 py-1 text-xs text-gray-500">No staged changes.</div>
        )}
        {stagedChanges.map((change) => (
          <div
            key={`staged-${change.path}`}
            className="px-4 py-1 text-sm hover:bg-vscode-hover cursor-pointer flex items-center gap-2 group"
            onClick={() => openPath(change.path)}
            title={change.path}
          >
            <span className={STATUS_BADGE[change.type].className}>{STATUS_BADGE[change.type].label}</span>
            <span className="truncate flex-1 text-gray-300 group-hover:text-white">{change.path}</span>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity duration-150"
              onClick={(event) => {
                event.stopPropagation();
                void handleUnstagePath(change.path);
              }}
              title="Unstage"
              disabled={nativeBusy}
            >
              <Minus size={13} />
            </button>
          </div>
        ))}

        <div className="px-4 py-2 panel-section-title text-blue-400 mt-2">
          Changes ({unstagedChanges.length})
        </div>
        {unstagedChanges.length === 0 && (
          <div className="px-4 py-1 text-xs text-gray-500">No unstaged changes.</div>
        )}
        {unstagedChanges.map((change) => (
          <div
            key={`unstaged-${change.path}`}
            className="px-4 py-1 text-sm hover:bg-vscode-hover cursor-pointer flex items-center gap-2 group"
            onClick={() => openPath(change.path)}
            title={change.path}
          >
            <span className={STATUS_BADGE[change.type].className}>{STATUS_BADGE[change.type].label}</span>
            <span className="truncate flex-1 text-gray-300 group-hover:text-white">{change.path}</span>
            <button
              className="opacity-0 group-hover:opacity-100 p-1 hover:text-white transition-opacity duration-150"
              onClick={(event) => {
                event.stopPropagation();
                void handleStagePath(change.path);
              }}
              title="Stage"
              disabled={nativeBusy}
            >
              <Plus size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
