import React, { useEffect, useRef, useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { useFileStore } from '../../store/useFileStore';
import { isCodexExtensionId } from '../../utils/codex';
import { useShallow } from 'zustand/shallow';

interface Extension {
  name: string;
  displayName?: string;
  description: string;
  version: string;
  namespace: string;
  downloadCount: number;
  files?: {
    icon?: string;
  };
}

export const Extensions: React.FC = () => {
  const [search, setSearch] = useState('');
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [listFocusIndex, setListFocusIndex] = useState(0);
  const listItemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const { installedExtensions, installedExtensionMetadata, installExtension, uninstallExtension, setActiveActivityBarItem } = useFileStore(
    useShallow((state) => ({
      installedExtensions: state.installedExtensions,
      installedExtensionMetadata: state.installedExtensionMetadata,
      installExtension: state.installExtension,
      uninstallExtension: state.uninstallExtension,
      setActiveActivityBarItem: state.setActiveActivityBarItem,
    }))
  );

  // Track installation state
  const [installing, setInstalling] = useState<Record<string, boolean>>({});

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch extensions
  useEffect(() => {
    const fetchExtensions = async () => {
      setLoading(true);
      try {
        let query = debouncedSearch || 'tag:featured'; // Default to featured if empty

        // Improve search quality by removing common filler words that confuse the API
        if (debouncedSearch) {
          const cleanQuery = debouncedSearch
            .replace(/\b(plugin|extension|vscode|vs code)\b/gi, '')
            .trim();
          if (cleanQuery) {
            query = cleanQuery;
          }
        }

        const response = await fetch(`https://open-vsx.org/api/-/search?query=${query}&size=20`);
        const data = await response.json();
        setExtensions(data.extensions || []);
      } catch (error) {
        console.error('Failed to fetch extensions:', error);
        setExtensions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchExtensions();
  }, [debouncedSearch]);

  useEffect(() => {
    if (extensions.length === 0) {
      return;
    }

    extensions.forEach((extension) => {
      const id = `${extension.namespace}.${extension.name}`;
      const existing = installedExtensionMetadata[id];
      const icon = extension.files?.icon;
      if (!installedExtensions[id] || !icon || existing?.icon) {
        return;
      }

      installExtension(id, {
        id,
        name: extension.name,
        displayName: extension.displayName,
        namespace: extension.namespace,
        version: extension.version,
        icon,
      });
    });
  }, [extensions, installedExtensionMetadata, installedExtensions, installExtension]);

  const triggerInstall = (extension: Extension) => {
    const id = `${extension.namespace}.${extension.name}`;
    if (installedExtensions[id]) return;

    setInstalling(prev => ({ ...prev, [id]: true }));

    // Simulate installation
    setTimeout(() => {
      setInstalling(prev => ({ ...prev, [id]: false }));
      installExtension(id, {
        id,
        name: extension.name,
        displayName: extension.displayName,
        namespace: extension.namespace,
        version: extension.version,
        icon: extension.files?.icon,
      });
    }, 1500);
  };

  const handleInstall = (extension: Extension, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerInstall(extension);
  };

  const triggerUninstall = (id: string) => {
    if (window.confirm('Are you sure you want to uninstall this extension?')) {
      uninstallExtension(id);
    }
  };

  const handleUninstall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    triggerUninstall(id);
  };

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  const installedEntries = Object.keys(installedExtensions)
    .filter((id) => installedExtensions[id])
    .map((id) => {
      const metadata = installedExtensionMetadata[id];
      const displayName = metadata?.displayName || metadata?.name || id.split('.').pop() || id;
      const namespace = metadata?.namespace || id.split('.')[0] || '';
      const icon = metadata?.icon;
      const isCodex = isCodexExtensionId(id) || displayName.toLowerCase().includes('codex');
      return { id, displayName, namespace, icon, isCodex };
    });

  const hasMarketplaceResults = !loading && extensions.length > 0;
  const focusableItemCount = installedEntries.length + (hasMarketplaceResults ? extensions.length : 0);
  const effectiveFocusIndex = focusableItemCount === 0 ? 0 : Math.min(listFocusIndex, focusableItemCount - 1);

  const handleListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (focusableItemCount === 0) {
      return;
    }

    const lastIndex = focusableItemCount - 1;
    let nextIndex = effectiveFocusIndex;

    switch (event.key) {
      case 'ArrowUp':
        nextIndex = effectiveFocusIndex <= 0 ? lastIndex : effectiveFocusIndex - 1;
        break;
      case 'ArrowDown':
        nextIndex = effectiveFocusIndex >= lastIndex ? 0 : effectiveFocusIndex + 1;
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
        if (effectiveFocusIndex < installedEntries.length) {
          const installed = installedEntries[effectiveFocusIndex];
          if (installed.isCodex) {
            setActiveActivityBarItem('codex');
          } else {
            triggerUninstall(installed.id);
          }
          return;
        }

        if (hasMarketplaceResults) {
          const extension = extensions[effectiveFocusIndex - installedEntries.length];
          const id = `${extension.namespace}.${extension.name}`;
          if (installedExtensions[id]) {
            const displayName = extension.displayName || extension.name;
            if (isCodexExtensionId(id) || displayName.toLowerCase().includes('codex')) {
              setActiveActivityBarItem('codex');
            } else {
              triggerUninstall(id);
            }
          } else {
            triggerInstall(extension);
          }
        }
        return;
      default:
        return;
    }

    event.preventDefault();
    setListFocusIndex(nextIndex);
    listItemRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="panel-header">
        <span className="panel-title">Extensions</span>
      </div>
      <div className="px-4 py-2">
        <input
          className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar"
          placeholder="Search Extensions in Marketplace"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setListFocusIndex(0);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Extensions list" onKeyDown={handleListKeyDown}>
        {installedEntries.length > 0 && (
          <div className="border-b border-vscode-border/40">
            <div className="px-4 py-2 panel-section-title">
              Installed
            </div>
            {installedEntries.map((ext, index) => (
              <div
                key={ext.id}
                ref={(el) => {
                  listItemRefs.current[index] = el;
                }}
                className="px-3 py-2.5 hover:bg-vscode-hover flex gap-3 border-t border-vscode-border/20 items-center transition-colors duration-150"
                role="option"
                aria-selected={effectiveFocusIndex === index}
                tabIndex={effectiveFocusIndex === index ? 0 : -1}
              >
                <div
                  className="shrink-0 bg-gray-700 flex items-center justify-center overflow-hidden rounded"
                  style={{ width: '36px', height: '36px', minWidth: '36px', minHeight: '36px' }}
                >
                  {ext.icon ? (
                    <img
                      src={ext.icon}
                      alt={ext.displayName}
                      style={{ width: '36px', height: '36px', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-300">{ext.displayName.substring(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="font-semibold text-xs text-white truncate leading-tight">
                    {ext.displayName}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate leading-tight">{ext.namespace}</div>
                </div>
                <div className="shrink-0 flex items-center gap-1">
                  {ext.isCodex && (
                    <button
                      onClick={() => setActiveActivityBarItem('codex')}
                      className="h-6 px-2.5 flex items-center justify-center bg-vscode-statusBar text-white text-xs rounded hover:bg-blue-500 transition-all duration-150"
                      title="Open Codex"
                    >
                      Open
                    </button>
                  )}
                  <button
                    onClick={(e) => handleUninstall(ext.id, e)}
                    className="h-6 px-2.5 flex items-center justify-center bg-transparent text-gray-400 text-xs rounded border border-vscode-border hover:bg-vscode-hover hover:text-white hover:border-gray-500 transition-all duration-150"
                    title="Uninstall"
                  >
                    Installed
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500">
            <Loader2 className="animate-spin mb-2" size={24} />
            <span className="text-xs">Loading extensions...</span>
          </div>
        ) : extensions.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No extensions found.
          </div>
        ) : (
          extensions.map((ext, index) => {
            const id = `${ext.namespace}.${ext.name}`;
            const isInstalled = installedExtensions[id];
            const isInstalling = installing[id];
            const displayName = ext.displayName || ext.name;
            const isCodex = isCodexExtensionId(id) || displayName.toLowerCase().includes('codex');
            const listIndex = installedEntries.length + index;

            return (
              <div
                key={`${id}-${index}`}
                ref={(el) => {
                  listItemRefs.current[listIndex] = el;
                }}
                className="px-3 py-2.5 hover:bg-vscode-hover cursor-pointer flex gap-3 border-b border-vscode-border/20 group items-center transition-colors duration-150"
                role="option"
                aria-selected={effectiveFocusIndex === listIndex}
                tabIndex={effectiveFocusIndex === listIndex ? 0 : -1}
              >
                {/* Extension Icon */}
                <div
                  className="shrink-0 bg-gray-700 flex items-center justify-center overflow-hidden rounded"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                >
                  {ext.files?.icon ? (
                    <img
                      src={ext.files?.icon}
                      alt={ext.displayName || ext.name}
                      style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                    />
                  ) : (
                    <span className="text-xs font-bold text-gray-300">{(ext.displayName || ext.name).substring(0, 2).toUpperCase()}</span>
                  )}
                </div>

                {/* Extension Info */}
                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <div className="font-semibold text-xs text-white truncate leading-tight">
                    {ext.displayName || ext.name}
                  </div>
                  <div className="text-[10px] text-gray-400 truncate leading-tight">{ext.description}</div>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500">
                    <span className="font-medium text-gray-300 truncate max-w-[80px]">
                      {ext.namespace}
                    </span>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <Download size={10} /> {formatDownloads(ext.downloadCount)}
                    </span>
                  </div>
                </div>

                {/* Install/Uninstall Button */}
                <div className="shrink-0 flex items-center">
                  {isInstalled ? (
                    <div className="flex items-center gap-1">
                      {isCodex && (
                        <button
                          onClick={() => setActiveActivityBarItem('codex')}
                          className="h-6 px-2.5 flex items-center justify-center bg-vscode-statusBar text-white text-xs rounded hover:bg-blue-500 transition-all duration-150"
                          title="Open Codex"
                        >
                          Open
                        </button>
                      )}
                      <button
                        onClick={(e) => handleUninstall(id, e)}
                        className="h-6 px-2.5 flex items-center justify-center bg-transparent text-gray-400 text-xs rounded border border-vscode-border hover:bg-vscode-hover hover:text-white hover:border-gray-500 transition-all duration-150"
                        title="Uninstall"
                      >
                        Installed
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => handleInstall(ext, e)}
                      disabled={isInstalling}
                      className={`h-6 px-3 text-white text-xs font-medium rounded whitespace-nowrap transition-all duration-150 ${isInstalling
                          ? 'bg-transparent border border-vscode-statusBar text-vscode-statusBar cursor-wait'
                          : 'bg-vscode-statusBar hover:bg-blue-500 active:scale-95'
                        }`}
                    >
                      {isInstalling ? 'Installing...' : 'Install'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  );
};
