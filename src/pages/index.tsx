import { useState, useCallback, useRef, useEffect } from "react";
import { WebContainer } from "@webcontainer/api";
import type { Terminal as XTerminal } from "@xterm/xterm";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { toast } from "sonner";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import TopBar from "@/components/TopBar";
import Sidebar from "@/components/Sidebar";
import EditorPanel from "@/components/EditorPanel";
import PreviewPanel from "@/components/PreviewPanel";
import TerminalPanel from "@/components/TerminalPanel";
import SettingsDialog from "@/components/SettingsDialog";
import type { EditorSettings } from "@/components/SettingsDialog";

// ── Starter project files for the WebContainer ──
const STARTER_FILES: Record<string, string> = {
  "package.json": JSON.stringify(
    {
      name: "zicon-project",
      private: true,
      version: "1.0.0",
      type: "module",
      scripts: {
        dev: "vite",
        build: "vite build",
        preview: "vite preview",
      },
      dependencies: {
        react: "^18.2.0",
        "react-dom": "^18.2.0",
      },
      devDependencies: {
        "@vitejs/plugin-react": "^4.2.1",
        vite: "^5.1.0",
      },
    },
    null,
    2
  ),
  "vite.config.js": `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});`,
  "index.html": `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Zicon Project</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
</body>
</html>`,
  "src/main.jsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
  "src/App.jsx": `import { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="app">
      <header className="header">
        <h1>Welcome to Zicon-IDE</h1>
        <p>Edit <code>src/App.jsx</code> and save to see changes!</p>
      </header>
      <div className="card">
        <button onClick={() => setCount(c => c + 1)}>
          Count: {count}
        </button>
      </div>
    </div>
  );
}

export default App;`,
  "src/App.css": `.app {
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

.header h1 {
  font-size: 2.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header p {
  color: #666;
  margin-top: 0.5rem;
}

code {
  background: #f0f0f0;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.9rem;
}

.card {
  margin-top: 2rem;
}

.card button {
  padding: 0.8rem 1.6rem;
  font-size: 1rem;
  border: none;
  border-radius: 8px;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}

.card button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}`,
  "src/index.css": `*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fafafa;
}`,
};

// ── Helper: convert flat file map to WebContainer FileSystemTree ──
function filesToTree(files: Record<string, string>) {
  const tree: Record<string, unknown> = {};
  for (const [path, contents] of Object.entries(files)) {
    const parts = path.split("/");
    let current = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) {
        current[parts[i]] = { directory: {} };
      }
      current = (current[parts[i]] as { directory: Record<string, unknown> })
        .directory;
    }
    current[parts[parts.length - 1]] = {
      file: { contents },
    };
  }
  return tree;
}

// ── Helper: build FileNode tree for Sidebar ──
interface FileNode {
  name: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function buildFileTree(files: Record<string, string>): FileNode[] {
  const root: FileNode = { name: ".", type: "directory", children: [] };
  const dirMap: Record<string, FileNode> = { ".": root };

  const ensureDir = (dirPath: string): FileNode => {
    if (dirMap[dirPath]) return dirMap[dirPath];
    const parts = dirPath.split("/");
    const parentPath =
      parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    const parent = ensureDir(parentPath);
    const node: FileNode = {
      name: parts[parts.length - 1],
      type: "directory",
      children: [],
    };
    parent.children = parent.children || [];
    if (!parent.children.find((c) => c.name === node.name && c.type === "directory")) {
      parent.children.push(node);
    }
    dirMap[dirPath] = node;
    return node;
  };

  const sortedPaths = Object.keys(files).sort();
  for (const filepath of sortedPaths) {
    const parts = filepath.split("/");
    if (parts.length > 1) {
      const dirPath = parts.slice(0, -1).join("/");
      ensureDir(dirPath);
    }
    const parentPath =
      parts.length > 1 ? parts.slice(0, -1).join("/") : ".";
    const parent = ensureDir(parentPath);
    parent.children = parent.children || [];
    const fileName = parts[parts.length - 1];
    if (!parent.children.find((c) => c.name === fileName && c.type === "file")) {
      parent.children.push({ name: fileName, type: "file" });
    }
  }

  // Sort: directories first, then files, alphabetically
  const sortChildren = (node: FileNode) => {
    if (node.children) {
      node.children.sort((a, b) => {
        if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortChildren);
    }
  };
  sortChildren(root);

  return root.children || [];
}

export default function Index() {
  const [files, setFiles] = useState<Record<string, string>>({ ...STARTER_FILES });
  const [activeFile, setActiveFile] = useState<string>("src/App.jsx");
  const [openFiles, setOpenFiles] = useState<string[]>(["src/App.jsx"]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<EditorSettings>({
    fontSize: 14,
    tabSize: 2,
    wordWrap: false,
    minimap: false,
    lineNumbers: true,
    theme: "dark",
  });

  const wcRef = useRef<WebContainer | null>(null);
  const terminalRef = useRef<XTerminal | null>(null);
  const processRef = useRef<{ kill: () => void } | null>(null);
  const bootingRef = useRef(false);

  const fileTree = buildFileTree(files);

  // ── Boot WebContainer ──
  const bootWebContainer = useCallback(async () => {
    if (wcRef.current || bootingRef.current) return wcRef.current;
    bootingRef.current = true;

    try {
      const terminal = terminalRef.current;
      terminal?.writeln("\x1b[1;33m⚡ Booting WebContainer...\x1b[0m");

      const wc = await WebContainer.boot();
      wcRef.current = wc;

      terminal?.writeln("\x1b[1;32m✓ WebContainer booted successfully\x1b[0m");
      terminal?.writeln("");

      // Mount files
      terminal?.writeln("\x1b[1;34m📁 Mounting project files...\x1b[0m");
      await wc.mount(filesToTree(files) as Parameters<typeof wc.mount>[0]);
      terminal?.writeln(
        `\x1b[1;32m✓ Mounted ${Object.keys(files).length} files\x1b[0m`
      );
      terminal?.writeln("");

      // Listen for server-ready events
      wc.on("server-ready", (_port: number, url: string) => {
        setPreviewUrl(url);
        setIsLoading(false);
        terminal?.writeln("");
        terminal?.writeln(
          `\x1b[1;32m✓ Dev server ready at ${url}\x1b[0m`
        );
      });

      return wc;
    } catch (err) {
      const terminal = terminalRef.current;
      terminal?.writeln(
        `\x1b[1;31m✗ Failed to boot WebContainer: ${err}\x1b[0m`
      );
      bootingRef.current = false;
      return null;
    }
  }, [files]);

  // ── Run project ──
  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setIsLoading(true);
    setPreviewUrl(null);

    const terminal = terminalRef.current;
    const wc = await bootWebContainer();
    if (!wc) {
      setIsRunning(false);
      setIsLoading(false);
      toast.error("Failed to boot WebContainer");
      return;
    }

    try {
      // npm install
      terminal?.writeln("\x1b[1;34m$ npm install\x1b[0m");
      const installProcess = await wc.spawn("npm", ["install"]);

      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal?.write(data);
          },
        })
      );

      const installExitCode = await installProcess.exit;
      if (installExitCode !== 0) {
        terminal?.writeln(
          `\x1b[1;31m✗ npm install failed with exit code ${installExitCode}\x1b[0m`
        );
        setIsRunning(false);
        setIsLoading(false);
        return;
      }

      terminal?.writeln("");
      terminal?.writeln("\x1b[1;32m✓ Dependencies installed\x1b[0m");
      terminal?.writeln("");

      // npm run dev
      terminal?.writeln("\x1b[1;34m$ npm run dev\x1b[0m");
      const devProcess = await wc.spawn("npm", ["run", "dev"]);

      processRef.current = devProcess;

      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            terminal?.write(data);
          },
        })
      );
    } catch (err) {
      terminal?.writeln(`\x1b[1;31m✗ Error: ${err}\x1b[0m`);
      setIsRunning(false);
      setIsLoading(false);
    }
  }, [isRunning, bootWebContainer]);

  // ── Stop project ──
  const handleStop = useCallback(() => {
    if (processRef.current) {
      processRef.current.kill();
      processRef.current = null;
    }
    setIsRunning(false);
    setIsLoading(false);
    setPreviewUrl(null);
    terminalRef.current?.writeln("");
    terminalRef.current?.writeln("\x1b[1;33m■ Process stopped\x1b[0m");
  }, []);

  // ── File operations ──
  const handleFileSelect = useCallback(
    (filepath: string) => {
      setActiveFile(filepath);
      if (!openFiles.includes(filepath)) {
        setOpenFiles((prev) => [...prev, filepath]);
      }
    },
    [openFiles]
  );

  const handleCloseFile = useCallback(
    (filepath: string) => {
      setOpenFiles((prev) => {
        const next = prev.filter((f) => f !== filepath);
        if (activeFile === filepath) {
          setActiveFile(next[next.length - 1] || "");
        }
        return next;
      });
    },
    [activeFile]
  );

  const handleContentChange = useCallback(
    (content: string) => {
      setFiles((prev) => ({ ...prev, [activeFile]: content }));

      // Sync to WebContainer if booted
      if (wcRef.current && activeFile) {
        wcRef.current.fs.writeFile(activeFile, content).catch(() => {
          // silently ignore write errors
        });
      }
    },
    [activeFile]
  );

  const handleCreateFile = useCallback(
    (dirPath: string, name: string) => {
      const fullPath = dirPath === "." ? name : `${dirPath}/${name}`;
      setFiles((prev) => ({ ...prev, [fullPath]: "" }));
      handleFileSelect(fullPath);

      if (wcRef.current) {
        // Ensure parent directories exist
        const parts = fullPath.split("/");
        if (parts.length > 1) {
          const dir = parts.slice(0, -1).join("/");
          wcRef.current.fs.mkdir(dir, { recursive: true }).catch(() => {});
        }
        wcRef.current.fs.writeFile(fullPath, "").catch(() => {});
      }

      toast.success(`Created ${name}`);
    },
    [handleFileSelect]
  );

  const handleCreateFolder = useCallback((_dirPath: string, name: string) => {
    const fullPath = _dirPath === "." ? name : `${_dirPath}/${name}`;
    // Add a placeholder to represent the folder in our files map
    setFiles((prev) => {
      const next = { ...prev };
      // We track folders by having at least one file path that starts with this dir
      // Add a .gitkeep-like entry
      next[`${fullPath}/.gitkeep`] = "";
      return next;
    });

    if (wcRef.current) {
      wcRef.current.fs.mkdir(fullPath, { recursive: true }).catch(() => {});
    }

    toast.success(`Created folder ${name}`);
  }, []);

  const handleDeleteFile = useCallback(
    (filepath: string) => {
      setFiles((prev) => {
        const next = { ...prev };
        // Delete file and any children (if directory)
        for (const key of Object.keys(next)) {
          if (key === filepath || key.startsWith(filepath + "/")) {
            delete next[key];
          }
        }
        return next;
      });

      // Close if open
      setOpenFiles((prev) => prev.filter((f) => f !== filepath && !f.startsWith(filepath + "/")));
      if (activeFile === filepath || activeFile.startsWith(filepath + "/")) {
        setActiveFile("");
      }

      if (wcRef.current) {
        wcRef.current.fs.rm(filepath, { recursive: true }).catch(() => {});
      }

      toast.success(`Deleted ${filepath.split("/").pop()}`);
    },
    [activeFile]
  );

  const handleRenameFile = useCallback(
    (oldPath: string, newName: string) => {
      const parts = oldPath.split("/");
      parts[parts.length - 1] = newName;
      const newPath = parts.join("/");

      setFiles((prev) => {
        const next = { ...prev };
        if (next[oldPath] !== undefined) {
          next[newPath] = next[oldPath];
          delete next[oldPath];
        }
        return next;
      });

      setOpenFiles((prev) =>
        prev.map((f) => (f === oldPath ? newPath : f))
      );
      if (activeFile === oldPath) {
        setActiveFile(newPath);
      }

      if (wcRef.current) {
        wcRef.current.fs
          .readFile(oldPath, "utf-8")
          .then((content) => {
            return wcRef.current!.fs
              .writeFile(newPath, content)
              .then(() => wcRef.current!.fs.rm(oldPath));
          })
          .catch(() => {});
      }

      toast.success(`Renamed to ${newName}`);
    },
    [activeFile]
  );

  // ── Download as ZIP ──
  const handleDownload = useCallback(async () => {
    const zip = new JSZip();
    for (const [path, content] of Object.entries(files)) {
      zip.file(path, content);
    }
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "zicon-project.zip");
    toast.success("Project downloaded as ZIP!");
  }, [files]);

  // ── Fork ──
  const handleFork = useCallback(() => {
    const forkedFiles = { ...files };
    setFiles(forkedFiles);
    toast.success("Project forked! You're now working on a copy.");
  }, [files]);

  // ── Terminal ready callback ──
  const handleTerminalReady = useCallback((terminal: XTerminal) => {
    terminalRef.current = terminal;
  }, []);

  // ── Remount files when they change and WC is booted ──
  const prevFilesRef = useRef(files);
  useEffect(() => {
    prevFilesRef.current = files;
  }, [files]);

  return (
    <div className="h-screen flex flex-col bg-[#1E1E1E] text-[#CCCCCC] overflow-hidden">
      <TopBar
        projectName="zicon-project"
        isRunning={isRunning}
        onRun={handleRun}
        onStop={handleStop}
        onDownload={handleDownload}
        onSettingsOpen={() => setSettingsOpen(true)}
        onFork={handleFork}
      />

      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Sidebar */}
        <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
          <Sidebar
            fileTree={fileTree}
            activeFile={activeFile}
            openFiles={openFiles}
            onFileSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateFolder={handleCreateFolder}
            onDeleteFile={handleDeleteFile}
            onRenameFile={handleRenameFile}
          />
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-[#3E3E42] hover:bg-[#007ACC] transition-colors" />

        {/* Editor + Terminal */}
        <ResizablePanel defaultSize={42} minSize={20}>
          <ResizablePanelGroup direction="vertical">
            <ResizablePanel defaultSize={70} minSize={20}>
              <EditorPanel
                activeFile={activeFile}
                content={files[activeFile] || ""}
                openFiles={openFiles}
                settings={settings}
                onContentChange={handleContentChange}
                onFileSelect={handleFileSelect}
                onCloseFile={handleCloseFile}
              />
            </ResizablePanel>

            <ResizableHandle className="h-[1px] bg-[#3E3E42] hover:bg-[#007ACC] transition-colors" />

            {/* Terminal */}
            <ResizablePanel defaultSize={30} minSize={10}>
              <div className="h-full flex flex-col">
                <div className="h-[30px] bg-[#252526] border-b border-[#3E3E42] flex items-center px-3">
                  <span className="text-xs font-medium text-[#CCCCCC]">
                    Terminal
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <TerminalPanel onTerminalReady={handleTerminalReady} />
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>

        <ResizableHandle className="w-[1px] bg-[#3E3E42] hover:bg-[#007ACC] transition-colors" />

        {/* Preview */}
        <ResizablePanel defaultSize={40} minSize={20}>
          <PreviewPanel previewUrl={previewUrl} isLoading={isLoading} />
        </ResizablePanel>
      </ResizablePanelGroup>

      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSettingsChange={setSettings}
      />
    </div>
  );
}