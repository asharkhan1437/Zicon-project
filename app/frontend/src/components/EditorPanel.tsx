import { X, FileCode, FileJson, FileType, File } from "lucide-react";
import { useRef, useCallback, useEffect, useState } from "react";
import type { EditorSettings } from "./SettingsDialog";

interface EditorPanelProps {
  activeFile: string;
  content: string;
  openFiles: string[];
  settings: EditorSettings;
  onContentChange: (content: string) => void;
  onFileSelect: (filepath: string) => void;
  onCloseFile: (filepath: string) => void;
}

export default function EditorPanel({
  activeFile,
  content,
  openFiles,
  settings,
  onContentChange,
  onFileSelect,
  onCloseFile,
}: EditorPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);

  const lines = content.split("\n");
  const lineCount = lines.length;

  const getFileIcon = (filename: string) => {
    const name = filename.split("/").pop() || filename;
    const ext = name.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        return <FileCode className="w-3.5 h-3.5 text-[#E34C26]" />;
      case "css":
        return <FileType className="w-3.5 h-3.5 text-[#264DE4]" />;
      case "js":
      case "jsx":
        return <FileCode className="w-3.5 h-3.5 text-[#F7DF1E]" />;
      case "ts":
      case "tsx":
        return <FileCode className="w-3.5 h-3.5 text-[#3178C6]" />;
      case "json":
        return <FileJson className="w-3.5 h-3.5 text-[#4EC9B0]" />;
      default:
        return <File className="w-3.5 h-3.5 text-[#858585]" />;
    }
  };

  const getLanguage = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        return "HTML";
      case "css":
        return "CSS";
      case "js":
        return "JavaScript";
      case "jsx":
        return "JSX";
      case "ts":
        return "TypeScript";
      case "tsx":
        return "TSX";
      case "json":
        return "JSON";
      case "md":
        return "Markdown";
      default:
        return "Plain Text";
    }
  };

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = scrollTop;
    }
  }, [scrollTop]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = " ".repeat(settings.tabSize);
      const newContent =
        content.substring(0, start) + spaces + content.substring(end);
      onContentChange(newContent);
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd =
          start + settings.tabSize;
      });
    }
  };

  const displayName = (filepath: string) => filepath.split("/").pop() || filepath;

  return (
    <div className="flex-1 flex flex-col bg-[#1E1E1E] min-w-0">
      {/* Tabs */}
      <div className="h-[35px] bg-[#252526] border-b border-[#3E3E42] flex items-center overflow-x-auto scrollbar-none">
        {openFiles.map((file) => (
          <div
            key={file}
            className={`flex items-center gap-1.5 px-3 h-full border-r border-[#3E3E42] cursor-pointer shrink-0 ${
              activeFile === file
                ? "bg-[#1E1E1E] text-white"
                : "bg-[#2D2D2D] text-[#858585] hover:text-[#CCCCCC]"
            }`}
            onClick={() => onFileSelect(file)}
          >
            {getFileIcon(file)}
            <span className="text-xs">{displayName(file)}</span>
            <button
              className="hover:bg-[#333333] rounded p-0.5 ml-1"
              onClick={(e) => {
                e.stopPropagation();
                onCloseFile(file);
              }}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Editor */}
      {openFiles.length > 0 ? (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Line Numbers */}
          {settings.lineNumbers && (
            <div
              ref={lineNumbersRef}
              className="bg-[#1E1E1E] text-[#858585] text-right select-none overflow-hidden border-r border-[#3E3E42]"
              style={{
                fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
                fontSize: settings.fontSize,
                lineHeight: "1.6",
                paddingTop: 8,
                paddingRight: 8,
                paddingLeft: 8,
                minWidth: lineCount > 99 ? 56 : 44,
              }}
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
          )}

          {/* Code Area */}
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            onScroll={handleScroll}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-[#1E1E1E] text-[#CCCCCC] border-none resize-none outline-none p-2"
            style={{
              fontFamily: "'Monaco', 'Menlo', 'Consolas', monospace",
              fontSize: settings.fontSize,
              lineHeight: "1.6",
              tabSize: settings.tabSize,
              wordWrap: settings.wordWrap ? "break-word" : "normal",
              whiteSpace: settings.wordWrap ? "pre-wrap" : "pre",
              overflowWrap: settings.wordWrap ? "break-word" : "normal",
            }}
            spellCheck={false}
          />

          {/* Status indicator */}
          <div className="absolute bottom-2 right-4 text-xs text-[#858585] bg-[#252526] px-2 py-1 rounded">
            {getLanguage(activeFile)} | Ln {lines.length}, Col{" "}
            {(textareaRef.current?.selectionStart || 0) + 1}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center text-[#858585]">
          <div className="text-center space-y-2">
            <div className="text-4xl font-bold text-[#333333]">ZI</div>
            <p className="text-sm">Welcome to Zicon-IDE</p>
            <p className="text-xs">Open a file from the explorer to start editing</p>
          </div>
        </div>
      )}
    </div>
  );
}