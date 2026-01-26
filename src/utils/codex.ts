export const isCodexExtensionId = (id: string) => {
  const normalized = id.toLowerCase();
  return normalized.includes('codex') || normalized.includes('openai');
};

export const isCodexInstalled = (installedExtensions: Record<string, boolean>) =>
  Object.entries(installedExtensions).some(([id, installed]) => installed && isCodexExtensionId(id));
