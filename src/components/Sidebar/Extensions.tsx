import React, { useState, useEffect } from 'react';
import { Download, Loader2 } from 'lucide-react';

interface Extension {
  name: string;
  displayName?: string;
  description: string;
  version: string;
  namespace: string;
  downloadCount: number;
  files: {
    icon: string;
  };
}

export const Extensions: React.FC = () => {
  const [search, setSearch] = useState('');
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Track installation state
  const [installing, setInstalling] = useState<Record<string, boolean>>({});
  const [installed, setInstalled] = useState<Record<string, boolean>>(() => {
    const saved = localStorage.getItem('installed_extensions');
    return saved ? JSON.parse(saved) : {};
  });

  // Save installed extensions
  useEffect(() => {
    localStorage.setItem('installed_extensions', JSON.stringify(installed));
  }, [installed]);

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

  const handleInstall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (installed[id]) return;

    setInstalling(prev => ({ ...prev, [id]: true }));

    // Simulate installation
    setTimeout(() => {
      setInstalling(prev => ({ ...prev, [id]: false }));
      setInstalled(prev => ({ ...prev, [id]: true }));
    }, 1500);
  };

  const handleUninstall = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to uninstall this extension?')) {
      setInstalled(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const formatDownloads = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-vscode-sidebar border-b border-vscode-border flex justify-between items-center">
        <span>Extensions</span>
      </div>
      <div className="px-4 py-2">
        <input
          className="w-full bg-vscode-input text-white text-sm px-2 py-1 border border-vscode-border focus:outline-none focus:border-vscode-statusBar"
          placeholder="Search Extensions in Marketplace"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="flex-1 overflow-y-auto">
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
            const isInstalled = installed[id];
            const isInstalling = installing[id];

            return (
              <div key={`${id}-${index}`} className="px-3 py-2.5 hover:bg-vscode-hover cursor-pointer flex gap-3 border-b border-vscode-border/20 group items-center transition-colors duration-150">
                {/* Extension Icon */}
                <div
                  className="shrink-0 bg-gray-700 flex items-center justify-center overflow-hidden rounded"
                  style={{ width: '40px', height: '40px', minWidth: '40px', minHeight: '40px' }}
                >
                  {ext.files.icon ? (
                    <img
                      src={ext.files.icon}
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
                    <button
                      onClick={(e) => handleUninstall(id, e)}
                      className="h-6 px-2.5 flex items-center justify-center bg-transparent text-gray-400 text-xs rounded border border-vscode-border hover:bg-vscode-hover hover:text-white hover:border-gray-500 transition-all duration-150"
                      title="Uninstall"
                    >
                      Installed
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleInstall(id, e)}
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
