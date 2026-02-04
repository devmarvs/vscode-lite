import { Capacitor, registerPlugin } from '@capacitor/core';
import type { GitChangeType } from '../store/useFileStore';

export interface NativeGitChange {
  path: string;
  type: GitChangeType;
}

export interface NativeGitStatus {
  currentBranch: string;
  branches: string[];
  staged: NativeGitChange[];
  unstaged: NativeGitChange[];
}

interface NativeGitPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  status(options: { repoPath: string }): Promise<NativeGitStatus>;
  stage(options: { repoPath: string; path: string }): Promise<void>;
  unstage(options: { repoPath: string; path: string }): Promise<void>;
  stageAll(options: { repoPath: string }): Promise<void>;
  unstageAll(options: { repoPath: string }): Promise<void>;
  commit(options: { repoPath: string; message: string }): Promise<void>;
  createBranch(options: { repoPath: string; name: string }): Promise<void>;
  switchBranch(options: { repoPath: string; name: string }): Promise<void>;
}

const NativeGit = registerPlugin<NativeGitPlugin>('NativeGit');

const normalizeRepoPath = (repoPath: string) => repoPath.trim();

const assertRepoPath = (repoPath: string) => {
  const normalized = normalizeRepoPath(repoPath);
  if (!normalized) {
    throw new Error('Repository path is required.');
  }
  return normalized;
};

export const canUseNativeGit = async () => {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }

  try {
    const { available } = await NativeGit.isAvailable();
    return available;
  } catch {
    return false;
  }
};

export const fetchNativeGitStatus = async (repoPath: string) => {
  const normalized = assertRepoPath(repoPath);
  const status = await NativeGit.status({ repoPath: normalized });
  return {
    ...status,
    branches: [...status.branches].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' })),
  };
};

export const stageNativeGitPath = async (repoPath: string, path: string) =>
  NativeGit.stage({ repoPath: assertRepoPath(repoPath), path });

export const unstageNativeGitPath = async (repoPath: string, path: string) =>
  NativeGit.unstage({ repoPath: assertRepoPath(repoPath), path });

export const stageAllNativeGitChanges = async (repoPath: string) =>
  NativeGit.stageAll({ repoPath: assertRepoPath(repoPath) });

export const unstageAllNativeGitChanges = async (repoPath: string) =>
  NativeGit.unstageAll({ repoPath: assertRepoPath(repoPath) });

export const commitNativeGitChanges = async (repoPath: string, message: string) =>
  NativeGit.commit({ repoPath: assertRepoPath(repoPath), message: message.trim() });

export const createNativeGitBranch = async (repoPath: string, name: string) =>
  NativeGit.createBranch({ repoPath: assertRepoPath(repoPath), name: name.trim() });

export const switchNativeGitBranch = async (repoPath: string, name: string) =>
  NativeGit.switchBranch({ repoPath: assertRepoPath(repoPath), name: name.trim() });
