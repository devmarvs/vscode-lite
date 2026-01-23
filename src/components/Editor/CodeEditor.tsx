import React from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import { useFileStore } from '../../store/useFileStore';

export const CodeEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent } = useFileStore();
  const activeFile = files.find(f => f.id === activeFileId);

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    // Configure Monaco for mobile/touch
    editor.updateOptions({
      minimap: { enabled: false }, // Save space on mobile
      wordWrap: 'on',
      fontSize: 14,
      padding: { top: 16 },
      automaticLayout: true,
      contextmenu: true, // Useful on mobile
    });
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
        onMount={handleEditorDidMount}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          scrollBeyondLastLine: false,
          automaticLayout: true,
        }}
      />
    </div>
  );
};
