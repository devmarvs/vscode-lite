import React, { useEffect, useRef } from 'react';
import Editor, { type OnMount } from '@monaco-editor/react';
import type { editor as MonacoEditor } from 'monaco-editor';
import { useFileStore } from '../../store/useFileStore';

export const CodeEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, editorSettings } = useFileStore();
  const activeFile = files.find(f => f.id === activeFileId);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);

  const handleEditorChange = (value: string | undefined) => {
    if (activeFileId && value !== undefined) {
      updateFileContent(activeFileId, value);
    }
  };

  const applyEditorSettings = (editor: MonacoEditor.IStandaloneCodeEditor) => {
    editor.updateOptions({
      minimap: { enabled: editorSettings.minimap },
      fontSize: editorSettings.fontSize,
      wordWrap: editorSettings.wordWrap ? 'on' : 'off',
      lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
      renderWhitespace: editorSettings.renderWhitespace,
      detectIndentation: false,
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 16 },
      contextmenu: true,
    });

    const model = editor.getModel();
    if (model) {
      model.updateOptions({
        tabSize: editorSettings.tabSize,
        indentSize: editorSettings.tabSize,
        insertSpaces: true,
      });
    }
  };

  const handleEditorDidMount: OnMount = (editor) => {
    editorRef.current = editor;
    applyEditorSettings(editor);
  };

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    applyEditorSettings(editorRef.current);
  }, [editorSettings, activeFileId]);

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
          minimap: { enabled: editorSettings.minimap },
          fontSize: editorSettings.fontSize,
          wordWrap: editorSettings.wordWrap ? 'on' : 'off',
          lineNumbers: editorSettings.lineNumbers ? 'on' : 'off',
          renderWhitespace: editorSettings.renderWhitespace,
          detectIndentation: false,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16 },
          contextmenu: true,
        }}
      />
    </div>
  );
};
