import { useRef, useEffect } from "react";
import Editor from "@monaco-editor/react";

const getLanguage = (fileName) => {
  const ext = fileName.split(".").pop();
  const languageMap = {
    js: "javascript",
    jsx: "javascript",
    ts: "typescript",
    tsx: "typescript",
    json: "json",
    md: "markdown",
    py: "python",
    html: "html",
    css: "css",
    scss: "scss",
    yaml: "yaml",
    yml: "yaml",
    sh: "shell",
    bash: "shell",
  };
  return languageMap[ext] || "plaintext";
};

export const CodeEditor = ({ file, onChange, config }) => {
  const editorRef = useRef(null);

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;

    // Define SYNTHESUS theme
    monaco.editor.defineTheme("synthesus", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "6A737D", fontStyle: "italic" },
        { token: "keyword", foreground: "FF007F" },
        { token: "string", foreground: "FFB800" },
        { token: "number", foreground: "FF7A00" },
        { token: "type", foreground: "FFD700" },
        { token: "function", foreground: "FF007F" },
        { token: "variable", foreground: "FFFFFF" },
        { token: "constant", foreground: "FF7A00" },
        { token: "operator", foreground: "A1A1AA" },
        { token: "delimiter", foreground: "A1A1AA" },
        { token: "tag", foreground: "FF007F" },
        { token: "attribute.name", foreground: "FFB800" },
        { token: "attribute.value", foreground: "FFD700" },
      ],
      colors: {
        "editor.background": "#0B0B14",
        "editor.foreground": "#FFFFFF",
        "editor.lineHighlightBackground": "#FF007F10",
        "editor.selectionBackground": "#FF007F40",
        "editor.inactiveSelectionBackground": "#FF007F20",
        "editorCursor.foreground": "#FF007F",
        "editorLineNumber.foreground": "#71717A",
        "editorLineNumber.activeForeground": "#FF007F",
        "editorIndentGuide.background": "#FFFFFF10",
        "editorIndentGuide.activeBackground": "#FF007F40",
        "editor.selectionHighlightBackground": "#FFD70020",
        "editorBracketMatch.background": "#FF007F30",
        "editorBracketMatch.border": "#FF007F",
        "editorGutter.background": "#0B0B14",
        "editorWidget.background": "#0B0B14",
        "editorWidget.border": "#FFFFFF10",
        "editorSuggestWidget.background": "#0B0B14",
        "editorSuggestWidget.border": "#FFFFFF10",
        "editorSuggestWidget.foreground": "#FFFFFF",
        "editorSuggestWidget.highlightForeground": "#FF007F",
        "editorSuggestWidget.selectedBackground": "#FF007F30",
        "scrollbarSlider.background": "#FFFFFF20",
        "scrollbarSlider.hoverBackground": "#FFFFFF40",
        "scrollbarSlider.activeBackground": "#FF007F60",
      },
    });

    monaco.editor.setTheme("synthesus");

    // Configure auto-completion
    editor.updateOptions({
      quickSuggestions: true,
      suggestOnTriggerCharacters: true,
      acceptSuggestionOnEnter: "on",
      tabCompletion: "on",
    });
  };

  const handleEditorChange = (value) => {
    if (onChange) {
      onChange(value);
    }
  };

  if (!file) return null;

  return (
    <div data-testid="code-editor" className="h-full w-full">
      <Editor
        height="100%"
        language={getLanguage(file.name)}
        value={file.content}
        onChange={handleEditorChange}
        onMount={handleEditorDidMount}
        theme="synthesus"
        options={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          fontLigatures: true,
          lineHeight: 22,
          minimap: {
            enabled: true,
            maxColumn: 80,
            renderCharacters: false,
          },
          scrollbar: {
            verticalScrollbarSize: 6,
            horizontalScrollbarSize: 6,
          },
          padding: {
            top: 16,
            bottom: 16,
          },
          lineNumbers: "on",
          renderLineHighlight: "line",
          cursorBlinking: "smooth",
          cursorSmoothCaretAnimation: "on",
          smoothScrolling: true,
          folding: true,
          foldingHighlight: true,
          bracketPairColorization: {
            enabled: true,
          },
          autoIndent: "full",
          formatOnPaste: true,
          formatOnType: true,
          wordWrap: "on",
          tabSize: 2,
          insertSpaces: true,
          automaticLayout: true,
        }}
      />
    </div>
  );
};

export default CodeEditor;
