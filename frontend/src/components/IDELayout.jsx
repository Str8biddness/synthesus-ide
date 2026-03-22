import { useState, useCallback, useMemo } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Folder,
  File,
  ChevronRight,
  ChevronDown,
  Settings,
  Puzzle,
  MessageSquare,
  Terminal as TerminalIcon,
  Play,
  X,
  Sparkles,
  Code2,
  FileCode,
  FileJson,
  FileText,
  FolderOpen,
  Search,
  GitBranch,
  Cpu,
} from "lucide-react";
import { motion } from "framer-motion";
import CodeEditor from "@/components/CodeEditor";
import AIChat from "@/components/AIChat";
import TerminalPanel from "@/components/TerminalPanel";
import ModelSelector from "@/components/ModelSelector";
import { useAIConfig } from "@/hooks/useAIConfig";

// Flatten file structure for simpler rendering
const FLAT_FILES = [
  { name: "synthesus-project", type: "folder", path: "/synthesus-project", level: 0 },
  { name: "src", type: "folder", path: "/synthesus-project/src", level: 1, parent: "/synthesus-project" },
  { name: "index.js", type: "file", path: "/synthesus-project/src/index.js", level: 2, parent: "/synthesus-project/src", 
    content: `// SYNTHESUS AI IDE - Entry Point
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);` },
  { name: "App.jsx", type: "file", path: "/synthesus-project/src/App.jsx", level: 2, parent: "/synthesus-project/src",
    content: `// Main Application Component
import { useState, useEffect } from 'react';

export default function App() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    fetchData();
  }, []);
  
  const fetchData = async () => {
    try {
      const response = await fetch('/api/data');
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };
  
  return (
    <div className="app">
      <h1>Hello World</h1>
    </div>
  );
}` },
  { name: "utils.js", type: "file", path: "/synthesus-project/src/utils.js", level: 2, parent: "/synthesus-project/src",
    content: `// Utility Functions

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US').format(new Date(date));
};

export const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};` },
  { name: "package.json", type: "file", path: "/synthesus-project/package.json", level: 1, parent: "/synthesus-project",
    content: `{
  "name": "synthesus-project",
  "version": "1.0.0",
  "dependencies": {
    "react": "^19.0.0"
  }
}` },
  { name: "README.md", type: "file", path: "/synthesus-project/README.md", level: 1, parent: "/synthesus-project",
    content: `# SYNTHESUS Project

A cosmic journey into AI-powered development.

## Getting Started

\`\`\`bash
npm install
npm start
\`\`\`` },
];

const getFileIcon = (fileName) => {
  const ext = fileName.split(".").pop();
  if (ext === "js" || ext === "jsx") return FileCode;
  if (ext === "json") return FileJson;
  if (ext === "md") return FileText;
  return File;
};

const AIToolsPanel = ({ activeFile }) => {
  const tools = [
    { id: "explain", name: "Explain Code", description: "Get a detailed explanation", IconComp: FileText },
    { id: "refactor", name: "Refactor Code", description: "Improve code structure", IconComp: Code2 },
    { id: "generate", name: "Generate Code", description: "Create code from text", IconComp: Sparkles },
    { id: "review", name: "Code Review", description: "AI-powered code review", IconComp: Search },
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-heading font-semibold gradient-text mb-4">AI Development Tools</h3>
      {tools.map((tool) => (
        <motion.button
          key={tool.id}
          data-testid={`ai-tool-${tool.id}`}
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-pink-500/50 hover:bg-pink-500/10 transition-colors text-left"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500/20 to-pink-500/20 text-pink-400">
            <tool.IconComp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{tool.name}</p>
            <p className="text-xs text-zinc-500">{tool.description}</p>
          </div>
        </motion.button>
      ))}
      {!activeFile && <p className="text-xs text-zinc-500 text-center mt-4">Open a file to use AI tools</p>}
    </div>
  );
};

export const IDELayout = ({ onOpenSettings, onOpenPlugins }) => {
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(["/synthesus-project", "/synthesus-project/src"]));
  const [selectedPath, setSelectedPath] = useState(null);
  const [showTerminal, setShowTerminal] = useState(true);
  const [activePanel, setActivePanel] = useState("chat");
  const { config, updateConfig } = useAIConfig();

  const toggleFolder = useCallback((path) => {
    setExpandedFolders((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) newSet.delete(path);
      else newSet.add(path);
      return newSet;
    });
  }, []);

  const visibleFiles = useMemo(() => {
    return FLAT_FILES.filter(f => {
      if (f.level === 0) return true;
      if (!f.parent) return true;
      // Check if all parent folders are expanded
      let parent = f.parent;
      while (parent) {
        if (!expandedFolders.has(parent)) return false;
        const parentItem = FLAT_FILES.find(p => p.path === parent);
        parent = parentItem?.parent;
      }
      return true;
    });
  }, [expandedFolders]);

  const handleFileSelect = useCallback((file) => {
    setSelectedPath(file.path);
    if (!openTabs.find((tab) => tab.path === file.path)) {
      setOpenTabs((prev) => [...prev, file]);
    }
    setActiveTab(file.path);
  }, [openTabs]);

  const closeTab = useCallback((path, e) => {
    e.stopPropagation();
    const remaining = openTabs.filter((tab) => tab.path !== path);
    setOpenTabs(remaining);
    if (activeTab === path) {
      setActiveTab(remaining.length > 0 ? remaining[remaining.length - 1].path : null);
    }
  }, [activeTab, openTabs]);

  const activeFile = openTabs.find((tab) => tab.path === activeTab);

  const updateFileContent = useCallback((path, newContent) => {
    setOpenTabs((prev) => prev.map((tab) => (tab.path === path ? { ...tab, content: newContent } : tab)));
  }, []);

  return (
    <div data-testid="ide-layout" className="w-full h-full flex flex-col">
      {/* Header */}
      <header className="h-12 flex items-center justify-between px-4 border-b border-white/10 bg-[#0B0B14]/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-pink-500" />
            <h1 className="font-heading text-lg font-bold gradient-text">SYNTHESUS</h1>
          </div>
          <span className="text-xs text-zinc-500 uppercase tracking-widest">AI IDE Platform</span>
        </div>
        <div className="flex items-center gap-2">
          <ModelSelector config={config} updateConfig={updateConfig} />
          <Button data-testid="plugins-btn" variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5" onClick={onOpenPlugins}>
            <Puzzle className="w-5 h-5" />
          </Button>
          <Button data-testid="settings-btn" variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5" onClick={onOpenSettings}>
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Sidebar */}
          <ResizablePanel defaultSize={15} minSize={10} maxSize={25}>
            <div className="h-full flex flex-col bg-[#0B0B14]/60 border-r border-white/10">
              <div className="flex border-b border-white/10">
                <button data-testid="explorer-tab" className="flex-1 flex items-center justify-center gap-2 py-3 text-xs uppercase tracking-wider text-zinc-400 hover:text-white border-b-2 border-pink-500">
                  <Folder className="w-4 h-4" />
                  Explorer
                </button>
              </div>
              <ScrollArea className="flex-1">
                <div className="p-2">
                  <div className="text-[10px] uppercase tracking-widest text-zinc-500 px-2 py-2 font-semibold">Project Files</div>
                  {visibleFiles.map((item) => {
                    const isFolder = item.type === "folder";
                    const isExpanded = expandedFolders.has(item.path);
                    const isSelected = selectedPath === item.path;
                    const FileIcon = isFolder ? (isExpanded ? FolderOpen : Folder) : getFileIcon(item.name);
                    
                    return (
                      <div
                        key={item.path}
                        data-testid={`file-tree-${item.name}`}
                        className={`file-tree-item flex items-center gap-2 px-2 py-1 cursor-pointer rounded-sm ${isSelected ? "bg-pink-500/20 text-white" : "text-zinc-400"}`}
                        style={{ paddingLeft: `${item.level * 12 + 8}px` }}
                        onClick={() => isFolder ? toggleFolder(item.path) : handleFileSelect(item)}
                      >
                        {isFolder ? (
                          isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
                        ) : (
                          <span className="w-3" />
                        )}
                        <FileIcon className={`w-4 h-4 ${isFolder ? "text-yellow-500" : item.name.endsWith(".js") || item.name.endsWith(".jsx") ? "text-yellow-400" : item.name.endsWith(".json") ? "text-yellow-500" : item.name.endsWith(".md") ? "text-blue-400" : "text-zinc-400"}`} />
                        <span className="text-sm truncate">{item.name}</span>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-white/10 hover:bg-pink-500/50" />

          {/* Editor Area */}
          <ResizablePanel defaultSize={55} minSize={30}>
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel defaultSize={showTerminal ? 70 : 100} minSize={30}>
                <div className="h-full flex flex-col bg-[#0B0B14]">
                  {/* Editor Tabs */}
                  <div className="flex items-center border-b border-white/10 bg-[#0B0B14]/80 min-h-[40px]">
                    <ScrollArea className="flex-1" orientation="horizontal">
                      <div className="flex">
                        {openTabs.map((tab) => {
                          const TabIcon = getFileIcon(tab.name);
                          return (
                            <div
                              key={tab.path}
                              data-testid={`tab-${tab.name}`}
                              className={`flex items-center gap-2 px-4 py-2 cursor-pointer border-r border-white/5 ${activeTab === tab.path ? "tab-active text-white" : "text-zinc-400 hover:text-white hover:bg-white/5"}`}
                              onClick={() => setActiveTab(tab.path)}
                            >
                              <TabIcon className="w-4 h-4 text-yellow-400" />
                              <span className="text-sm">{tab.name}</span>
                              <button className="ml-2 hover:bg-white/10 rounded p-0.5" onClick={(e) => closeTab(tab.path, e)}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                    {openTabs.length > 0 && (
                      <div className="flex items-center gap-1 px-2">
                        <Button data-testid="run-code-btn" variant="ghost" size="icon" className="h-7 w-7 text-green-500 hover:text-green-400 hover:bg-green-500/10">
                          <Play className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {/* Editor Content */}
                  <div className="flex-1 overflow-hidden">
                    {activeFile ? (
                      <CodeEditor file={activeFile} onChange={(content) => updateFileContent(activeFile.path, content)} config={config} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-500">
                        <Code2 className="w-16 h-16 mb-4 opacity-20" />
                        <p className="text-lg font-heading">No file open</p>
                        <p className="text-sm mt-2">Select a file from the explorer</p>
                      </div>
                    )}
                  </div>
                </div>
              </ResizablePanel>
              {showTerminal && (
                <>
                  <ResizableHandle className="h-px bg-white/10 hover:bg-pink-500/50" />
                  <ResizablePanel defaultSize={30} minSize={15} maxSize={50}>
                    <TerminalPanel onClose={() => setShowTerminal(false)} />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-white/10 hover:bg-pink-500/50" />

          {/* AI Panel */}
          <ResizablePanel defaultSize={30} minSize={20} maxSize={40}>
            <div className="h-full flex flex-col bg-[#0B0B14]/60 border-l border-white/10">
              <Tabs value={activePanel} onValueChange={setActivePanel} className="flex-1 flex flex-col">
                <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none h-auto p-0">
                  <TabsTrigger data-testid="chat-tab" value="chat" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-3">
                    <MessageSquare className="w-4 h-4 mr-2" />
                    <span className="text-xs uppercase tracking-wider">AI Chat</span>
                  </TabsTrigger>
                  <TabsTrigger data-testid="tools-tab" value="tools" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-3">
                    <Sparkles className="w-4 h-4 mr-2" />
                    <span className="text-xs uppercase tracking-wider">AI Tools</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                  <AIChat config={config} activeFile={activeFile} />
                </TabsContent>
                <TabsContent value="tools" className="flex-1 m-0 p-4 overflow-auto">
                  <AIToolsPanel activeFile={activeFile} />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>

      {/* Status Bar */}
      <footer className="h-6 flex items-center justify-between px-4 border-t border-white/10 bg-[#0B0B14]/80 text-xs text-zinc-500">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1"><GitBranch className="w-3 h-3" />main</span>
          {activeFile && <span>{activeFile.name}</span>}
        </div>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {config.backend_type === "ollama" ? "Ollama" : "LM Studio"}: {config.model}
          </span>
          <button data-testid="toggle-terminal-btn" className="hover:text-white" onClick={() => setShowTerminal(!showTerminal)}>
            <TerminalIcon className="w-3 h-3" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default IDELayout;
