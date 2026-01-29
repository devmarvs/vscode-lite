import React from 'react';
import clsx from 'clsx';
import { RotateCcw, X } from 'lucide-react';
import { useFileStore, DEFAULT_EDITOR_SETTINGS, type EditorSettings } from '../../store/useFileStore';
import { useShallow } from 'zustand/shallow';

type ToggleRowProps = {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
};

const ToggleRow: React.FC<ToggleRowProps> = ({ label, description, checked, onToggle }) => (
  <div className="flex items-center justify-between gap-4 bg-vscode-hover/40 border border-vscode-border/50 rounded px-3 py-2">
    <div>
      <div className="text-sm text-gray-200">{label}</div>
      {description && <div className="text-[11px] text-gray-500">{description}</div>}
    </div>
    <button
      type="button"
      aria-pressed={checked}
      onClick={onToggle}
      className={clsx(
        "relative h-5 w-9 rounded-full border transition-colors duration-150",
        checked ? "bg-vscode-statusBar border-vscode-statusBar" : "bg-vscode-input border-vscode-border"
      )}
    >
      <span
        className={clsx(
          "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-150",
          checked && "translate-x-4"
        )}
      />
    </button>
  </div>
);

type RangeRowProps = {
  label: string;
  description?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (value: number) => void;
};

const RangeRow: React.FC<RangeRowProps> = ({
  label,
  description,
  value,
  min,
  max,
  step = 1,
  onChange,
}) => (
  <div className="flex items-center justify-between gap-4 bg-vscode-hover/40 border border-vscode-border/50 rounded px-3 py-2">
    <div>
      <div className="text-sm text-gray-200">{label}</div>
      {description && <div className="text-[11px] text-gray-500">{description}</div>}
    </div>
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="accent-vscode-statusBar w-28"
      />
      <div className="text-xs text-gray-400 w-6 text-right">{value}</div>
    </div>
  </div>
);

type SelectRowProps = {
  label: string;
  description?: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
};

const SelectRow: React.FC<SelectRowProps> = ({ label, description, value, options, onChange }) => (
  <div className="flex items-center justify-between gap-4 bg-vscode-hover/40 border border-vscode-border/50 rounded px-3 py-2">
    <div>
      <div className="text-sm text-gray-200">{label}</div>
      {description && <div className="text-[11px] text-gray-500">{description}</div>}
    </div>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="bg-vscode-input border border-vscode-border text-xs text-gray-200 px-2 py-1 rounded focus:outline-none focus:border-vscode-statusBar"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export const Settings: React.FC = () => {
  const { editorSettings, updateEditorSettings, resetEditorSettings, setSidebarVisible } = useFileStore(
    useShallow((state) => ({
      editorSettings: state.editorSettings,
      updateEditorSettings: state.updateEditorSettings,
      resetEditorSettings: state.resetEditorSettings,
      setSidebarVisible: state.setSidebarVisible,
    }))
  );
  const settingsKeys = Object.keys(DEFAULT_EDITOR_SETTINGS) as (keyof EditorSettings)[];
  const isDefault = settingsKeys.every((key) => editorSettings[key] === DEFAULT_EDITOR_SETTINGS[key]);

  const updateSetting = <K extends keyof EditorSettings>(key: K, value: EditorSettings[K]) => {
    updateEditorSettings({ [key]: value } as Pick<EditorSettings, K>);
  };

  return (
    <div className="flex flex-col h-full text-vscode-text">
      <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider bg-vscode-sidebar border-b border-vscode-border flex justify-between items-center">
        <span>Settings</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetEditorSettings}
            disabled={isDefault}
            title="Reset editor settings"
            className={clsx(
              "p-1 rounded transition-colors duration-150",
              isDefault ? "opacity-50 cursor-not-allowed" : "hover:text-white hover:bg-white/10"
            )}
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={() => setSidebarVisible(false)}
            className="md:hidden hover:text-white transition-colors duration-150 p-1 hover:bg-white/10 rounded"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-6">
        <section className="space-y-3">
          <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Editor</div>
          <ToggleRow
            label="Word Wrap"
            description="Wrap long lines to stay within the editor width."
            checked={editorSettings.wordWrap}
            onToggle={() => updateSetting('wordWrap', !editorSettings.wordWrap)}
          />
          <ToggleRow
            label="Minimap"
            description="Show the code overview on the right."
            checked={editorSettings.minimap}
            onToggle={() => updateSetting('minimap', !editorSettings.minimap)}
          />
          <ToggleRow
            label="Line Numbers"
            description="Display line numbers in the gutter."
            checked={editorSettings.lineNumbers}
            onToggle={() => updateSetting('lineNumbers', !editorSettings.lineNumbers)}
          />
          <RangeRow
            label="Font Size"
            description="Adjust the editor text size."
            value={editorSettings.fontSize}
            min={12}
            max={22}
            onChange={(value) => updateSetting('fontSize', value)}
          />
          <SelectRow
            label="Tab Size"
            description="Number of spaces per indentation level."
            value={String(editorSettings.tabSize)}
            options={[
              { label: '2', value: '2' },
              { label: '4', value: '4' },
              { label: '8', value: '8' },
            ]}
            onChange={(value) => updateSetting('tabSize', Number(value))}
          />
          <SelectRow
            label="Render Whitespace"
            description="Choose how whitespace characters are shown."
            value={editorSettings.renderWhitespace}
            options={[
              { label: 'None', value: 'none' },
              { label: 'Boundary', value: 'boundary' },
              { label: 'All', value: 'all' },
            ]}
            onChange={(value) => updateSetting('renderWhitespace', value as EditorSettings['renderWhitespace'])}
          />
        </section>
      </div>
    </div>
  );
};
