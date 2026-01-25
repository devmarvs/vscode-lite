import React from 'react';
import Editor from '@monaco-editor/react';
import { useFileStore } from '../../store/useFileStore';

export const CodeEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, editorSettings } = useFileStore();
  const activeFile = files.find(f => f.id === activeFileId);

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  if (!activeFile) {
    return (
      <div className="flex-1 flex items-center justify-center bg-vscode-bg text-vscode-text">
        <div className="text-center">
          <p className="mb-2">No file open</p>
          <p className="text-sm opacity-50">Select a file from the explorer</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-vscode-bg">
      <Editor
        height="100%"
        theme="vs-dark"
        path={activeFile.name} // Helps Monaco determine language for some ext
        defaultLanguage={activeFile.language}
        language={activeFile.language}
        value={activeFile.content}
        onChange={handleEditorChange}
        options={{
          minimap: { enabled: editorSettings.minimap },
          fontSize: editorSettings.fontSize,
          wordWrap: editorSettings.wordWrap ? 'on' : 'off',
          lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
          tabSize: editorSettings.tabSize,
          renderWhitespace: editorSettings.renderWhitespace,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 },
          contextmenu: true,
        }}
      />
    </div>
  );
};
