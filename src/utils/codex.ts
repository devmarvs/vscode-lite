export const isCodexExtensionId = (id: string) => {
  const normalized = id.toLowerCase();
  return normalized.includes('codex') || normalized.includes('openai');
};

export const isCodexInstalled = (installedExtensions: Record<string, boolean>) =>
  Object.entries(installedExtensions).some(([id, installed]) => installed && isCodexExtensionId(id));

export interface CodexExtensionMetadata {
  id: string;
  icon?: string;
}

export const getCodexExtensionMetadata = <T extends CodexExtensionMetadata>(
  installedExtensionMetadata: Record<string, T>
) =>
  Object.entries(installedExtensionMetadata).find(([id]) => isCodexExtensionId(id))?.[1];

export const getOpenAIBaseUrl = () => {
  const baseUrl = (import.meta.env.VITE_OPENAI_BASE_URL as string | undefined) ?? 'https://api.openai.com/v1';
  return baseUrl.replace(/\/+$/, '');
};

export const buildOpenAIHeaders = (apiKey: string) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${apiKey}`,
  };

  const organization = import.meta.env.VITE_OPENAI_ORG_ID as string | undefined;
  const project = import.meta.env.VITE_OPENAI_PROJECT_ID as string | undefined;

  if (organization) {
    headers['OpenAI-Organization'] = organization;
  }

  if (project) {
    headers['OpenAI-Project'] = project;
  }

  return headers;
};
