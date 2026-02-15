import {
  FileCode,
  FileJson,
  FileType,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  FolderPlus,
  Trash2,
  Pencil,
  File,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ui/context-menu";

interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface SidebarProps {
  fileTree: FileNode[];
  activeFile: string;
  openFiles: string[];
  onFileSelect: (filepath: string) => void;
  onCreateFile: (dirPath: string, name: string) => void;
  onCreateFolder: (dirPath: string, name: string) => void;
  onDeleteFile: (filepath: string) => void;
  onRenameFile: (oldPath: string, newName: string) => void;
}

export default function Sidebar({
  fileTree,
  activeFile,
  onFileSelect,
  onCreateFile,
  onCreateFolder,
  onDeleteFile,
  onRenameFile,
}: SidebarProps) {
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(
    new Set([".", "src"])
  );
  const [creatingIn, setCreatingIn] = useState<{
    dir: string;
    type: "file" | "folder";
  } | null>(null);
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [creatingIn, renamingFile]);

  const toggleDir = (path: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    switch (ext) {
      case "html":
        return <FileCode className="w-4 h-4 text-[#E34C26] shrink-0" />;
      case "css":
        return <FileType className="w-4 h-4 text-[#264DE4] shrink-0" />;
      case "js":
      case "jsx":
        return <FileCode className="w-4 h-4 text-[#F7DF1E] shrink-0" />;
      case "ts":
      case "tsx":
        return <FileCode className="w-4 h-4 text-[#3178C6] shrink-0" />;
      case "json":
        return <FileJson className="w-4 h-4 text-[#4EC9B0] shrink-0" />;
      case "md":
        return <File className="w-4 h-4 text-[#519ABA] shrink-0" />;
      case "svg":
        return <File className="w-4 h-4 text-[#FFB13B] shrink-0" />;
      default:
        return <FileCode className="w-4 h-4 text-[#858585] shrink-0" />;
    }
  };

  const handleInputSubmit = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      if (creatingIn) {
        if (creatingIn.type === "file") {
          onCreateFile(creatingIn.dir, inputValue.trim());
        } else {
          onCreateFolder(creatingIn.dir, inputValue.trim());
        }
        setCreatingIn(null);
      } else if (renamingFile) {
        onRenameFile(renamingFile, inputValue.trim());
        setRenamingFile(null);
      }
      setInputValue("");
    } else if (e.key === "Escape") {
      setCreatingIn(null);
      setRenamingFile(null);
      setInputValue("");
    }
  };

  const renderNode = (node: FileNode, parentPath: string, depth: number) => {
    const fullPath =
      parentPath === "." ? node.name : `${parentPath}/${node.name}`;
    const isExpanded = expandedDirs.has(fullPath);
    const isActive = activeFile === fullPath;
    const paddingLeft = depth * 12 + 8;

    if (node.type === "directory") {
      return (
        <div key={fullPath}>
          <ContextMenu>
            <ContextMenuTrigger>
              <div
                className="flex items-center gap-1 py-1 hover:bg-[#2A2D2E] cursor-pointer text-sm"
                style={{ paddingLeft }}
                onClick={() => toggleDir(fullPath)}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[#858585] shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[#858585] shrink-0" />
                )}
                {isExpanded ? (
                  <FolderOpen className="w-4 h-4 text-[#DCAA5F] shrink-0" />
                ) : (
                  <Folder className="w-4 h-4 text-[#DCAA5F] shrink-0" />
                )}
                <span className="text-[#CCCCCC] truncate">{node.name}</span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="bg-[#252526] border-[#3E3E42]">
              <ContextMenuItem
                className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
                onClick={() => {
                  setCreatingIn({ dir: fullPath, type: "file" });
                  setInputValue("");
                  if (!isExpanded) toggleDir(fullPath);
                }}
              >
                <Plus className="w-4 h-4 mr-2" /> New File
              </ContextMenuItem>
              <ContextMenuItem
                className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
                onClick={() => {
                  setCreatingIn({ dir: fullPath, type: "folder" });
                  setInputValue("");
                  if (!isExpanded) toggleDir(fullPath);
                }}
              >
                <FolderPlus className="w-4 h-4 mr-2" /> New Folder
              </ContextMenuItem>
              {fullPath !== "." && (
                <>
                  <ContextMenuSeparator className="bg-[#3E3E42]" />
                  <ContextMenuItem
                    className="text-[#F44747] focus:bg-[#094771] focus:text-[#F44747]"
                    onClick={() => onDeleteFile(fullPath)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </ContextMenuItem>
                </>
              )}
            </ContextMenuContent>
          </ContextMenu>

          {isExpanded && (
            <div>
              {creatingIn?.dir === fullPath && (
                <div
                  className="flex items-center gap-1 py-1"
                  style={{ paddingLeft: paddingLeft + 20 }}
                >
                  {creatingIn.type === "file" ? (
                    <File className="w-4 h-4 text-[#858585] shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 text-[#DCAA5F] shrink-0" />
                  )}
                  <input
                    ref={inputRef}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleInputSubmit}
                    onBlur={() => {
                      setCreatingIn(null);
                      setInputValue("");
                    }}
                    className="bg-[#1E1E1E] border border-[#007ACC] text-[#CCCCCC] text-sm px-1 py-0 outline-none rounded w-full max-w-[160px]"
                    placeholder={
                      creatingIn.type === "file" ? "filename" : "folder name"
                    }
                  />
                </div>
              )}
              {node.children?.map((child) =>
                renderNode(child, fullPath, depth + 1)
              )}
            </div>
          )}
        </div>
      );
    }

    // File node
    return (
      <ContextMenu key={fullPath}>
        <ContextMenuTrigger>
          <div
            className={`flex items-center gap-2 py-1 hover:bg-[#2A2D2E] cursor-pointer text-sm ${
              isActive ? "bg-[#37373D]" : ""
            }`}
            style={{ paddingLeft: paddingLeft + 20 }}
            onClick={() => onFileSelect(fullPath)}
          >
            {renamingFile === fullPath ? (
              <input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleInputSubmit}
                onBlur={() => {
                  setRenamingFile(null);
                  setInputValue("");
                }}
                className="bg-[#1E1E1E] border border-[#007ACC] text-[#CCCCCC] text-sm px-1 py-0 outline-none rounded w-full max-w-[160px]"
              />
            ) : (
              <>
                {getFileIcon(node.name)}
                <span
                  className={`truncate ${isActive ? "text-white" : "text-[#CCCCCC]"}`}
                >
                  {node.name}
                </span>
              </>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="bg-[#252526] border-[#3E3E42]">
          <ContextMenuItem
            className="text-[#CCCCCC] focus:bg-[#094771] focus:text-white"
            onClick={() => {
              setRenamingFile(fullPath);
              setInputValue(node.name);
            }}
          >
            <Pencil className="w-4 h-4 mr-2" /> Rename
          </ContextMenuItem>
          <ContextMenuSeparator className="bg-[#3E3E42]" />
          <ContextMenuItem
            className="text-[#F44747] focus:bg-[#094771] focus:text-[#F44747]"
            onClick={() => onDeleteFile(fullPath)}
          >
            <Trash2 className="w-4 h-4 mr-2" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    );
  };

  return (
    <div className="h-full bg-[#252526] border-r border-[#3E3E42] flex flex-col select-none">
      <div className="p-3 border-b border-[#3E3E42] flex items-center justify-between">
        <span className="text-xs font-semibold text-[#858585] uppercase tracking-wider">
          Explorer
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setCreatingIn({ dir: ".", type: "file" });
              setInputValue("");
              if (!expandedDirs.has(".")) toggleDir(".");
            }}
            className="hover:bg-[#333333] rounded p-1"
            title="New File"
          >
            <Plus className="w-3.5 h-3.5 text-[#858585]" />
          </button>
          <button
            onClick={() => {
              setCreatingIn({ dir: ".", type: "folder" });
              setInputValue("");
              if (!expandedDirs.has(".")) toggleDir(".");
            }}
            className="hover:bg-[#333333] rounded p-1"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5 text-[#858585]" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {fileTree.map((node) => renderNode(node, ".", 0))}
      </div>
    </div>
  );
}