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
  Library,
  Globe,
  Bot,
  Zap,
  Users,
  Video,
  User,
} from "lucide-react";
import { motion } from "framer-motion";
import CodeEditor from "@/components/CodeEditor";
import AIChat from "@/components/AIChat";
import TerminalPanel from "@/components/TerminalPanel";
import ModelSelector from "@/components/ModelSelector";
import MemoryPanel from "@/components/MemoryPanel";
import BrowserPreview from "@/components/BrowserPreview";
import AgentPanel from "@/components/AgentPanel";
import CollaborationPanel from "@/components/CollaborationPanel";
import VideoChat from "@/components/VideoChat";
import { useAIConfig } from "@/hooks/useAIConfig";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from "uuid";

// Flat file structure for simpler rendering
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
  const [count, setCount] = useState(0);
  
  return (
    <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#FF007F' }}>Hello SYNTHESUS!</h1>
      <p>Count: {count}</p>
      <button 
        onClick={() => setCount(c => c + 1)}
        style={{ 
          background: 'linear-gradient(135deg, #FFD700, #FF007F)',
          border: 'none',
          padding: '12px 24px',
          borderRadius: '25px',
          cursor: 'pointer',
          fontWeight: 'bold'
        }}
      >
        Increment
      </button>
    </div>
  );
}` },
  { name: "index.html", type: "file", path: "/synthesus-project/src/index.html", level: 2, parent: "/synthesus-project/src",
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SYNTHESUS Preview</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Outfit', sans-serif;
      background: linear-gradient(135deg, #030308 0%, #0B0B14 100%);
      color: white;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    h1 {
      background: linear-gradient(90deg, #FFD700, #FF007F, #FF7A00);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    p { color: #A1A1AA; text-align: center; max-width: 500px; line-height: 1.6; }
    .card {
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 30px;
      margin: 20px;
      backdrop-filter: blur(10px);
    }
    button {
      background: linear-gradient(135deg, #FFD700, #FF007F);
      border: none;
      padding: 14px 28px;
      border-radius: 25px;
      color: black;
      font-weight: bold;
      cursor: pointer;
      margin-top: 20px;
      font-size: 16px;
      transition: transform 0.2s;
    }
    button:hover { transform: scale(1.05); }
    .features { display: flex; gap: 20px; flex-wrap: wrap; justify-content: center; margin-top: 30px; }
    .feature {
      background: rgba(255,0,127,0.1);
      border: 1px solid rgba(255,0,127,0.3);
      border-radius: 12px;
      padding: 20px;
      width: 200px;
      text-align: center;
    }
    .feature h3 { color: #FF007F; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1>SYNTHESUS</h1>
  <p>Welcome to the next generation AI-powered IDE. Build faster, smarter, and more efficiently with local AI integration.</p>
  
  <div class="features">
    <div class="feature">
      <h3>AI Chat</h3>
      <p>Intelligent coding assistant</p>
    </div>
    <div class="feature">
      <h3>Code Execution</h3>
      <p>Run code instantly</p>
    </div>
    <div class="feature">
      <h3>Live Preview</h3>
      <p>See changes in real-time</p>
    </div>
  </div>
  
  <button onclick="alert('Welcome to SYNTHESUS!')">Get Started</button>
</body>
</html>` },
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
  if (ext === "md" || ext === "html") return FileText;
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
  const { user, isAuthenticated, openAuthModal, logout } = useAuth();
  const [openTabs, setOpenTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(null);
  const [expandedFolders, setExpandedFolders] = useState(new Set(["/synthesus-project", "/synthesus-project/src"]));
  const [selectedPath, setSelectedPath] = useState(null);
  const [showTerminal, setShowTerminal] = useState(true);
  const [showBrowser, setShowBrowser] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState("chat");
  const [activeLeftPanel, setActiveLeftPanel] = useState("explorer");
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [roomId, setRoomId] = useState(() => {
    // Check URL for room param
    const params = new URLSearchParams(window.location.search);
    return params.get("room") || null;
  });
  const { config, updateConfig } = useAIConfig();
  
  // Collaboration hook
  const {
    isConnected: collabConnected,
    users: collabUsers,
    userId,
    userName,
    userColor,
    setUserName,
    updateCursor,
  } = useCollaboration(roomId, !!roomId);

  const handleCreateRoom = useCallback(() => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    // Update URL
    window.history.pushState({}, "", `?room=${newRoomId}`);
  }, []);

  const handleJoinRoom = useCallback((id) => {
    setRoomId(id);
    window.history.pushState({}, "", `?room=${id}`);
  }, []);

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
  const [showVideoChat, setShowVideoChat] = useState(false);

  const updateFileContent = useCallback((path, newContent) => {
    setOpenTabs((prev) => prev.map((tab) => (tab.path === path ? { ...tab, content: newContent } : tab)));
  }, []);

  const handleSelectConversation = (conv) => {
    setCurrentConversationId(conv.id);
    setActiveRightPanel("chat");
  };

  // Get HTML content for browser preview
  const htmlContent = useMemo(() => {
    const htmlFile = openTabs.find(t => t.name.endsWith('.html'));
    return htmlFile?.content;
  }, [openTabs]);

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
          <Button
            data-testid="video-chat-btn"
            variant="ghost"
            size="icon"
            className={`text-zinc-400 hover:text-white hover:bg-white/5 ${showVideoChat ? "text-green-500" : ""}`}
            onClick={() => setShowVideoChat(!showVideoChat)}
            title="Video Chat"
            disabled={!roomId}
          >
            <Video className="w-5 h-5" />
          </Button>
          <Button
            data-testid="browser-btn"
            variant="ghost"
            size="icon"
            className={`text-zinc-400 hover:text-white hover:bg-white/5 ${showBrowser ? "text-pink-500" : ""}`}
            onClick={() => setShowBrowser(!showBrowser)}
            title="Toggle Browser Preview"
          >
            <Globe className="w-5 h-5" />
          </Button>
          <ModelSelector config={config} updateConfig={updateConfig} />
          <Button data-testid="plugins-btn" variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5" onClick={onOpenPlugins}>
            <Puzzle className="w-5 h-5" />
          </Button>
          <Button data-testid="settings-btn" variant="ghost" size="icon" className="text-zinc-400 hover:text-white hover:bg-white/5" onClick={onOpenSettings}>
            <Settings className="w-5 h-5" />
          </Button>
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-400">{user?.username}</span>
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={logout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={openAuthModal}>
              <User className="w-5 h-5 mr-1" />
              Login
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <ResizablePanelGroup direction="horizontal">
          {/* Left Sidebar */}
          <ResizablePanel defaultSize={18} minSize={12} maxSize={30}>
            <div className="h-full flex flex-col bg-[#0B0B14]/60 border-r border-white/10">
              <Tabs value={activeLeftPanel} onValueChange={setActiveLeftPanel} className="flex-1 flex flex-col">
                <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none h-auto p-0">
                  <TabsTrigger data-testid="explorer-tab" value="explorer" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-2">
                    <Folder className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger data-testid="memory-tab" value="memory" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-2">
                    <Library className="w-4 h-4" />
                  </TabsTrigger>
                  <TabsTrigger data-testid="collab-tab" value="collab" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-2 relative">
                    <Users className="w-4 h-4" />
                    {collabConnected && (
                      <span className="absolute top-1 right-1 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="explorer" className="flex-1 m-0 overflow-hidden">
                  <ScrollArea className="h-full">
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
                            {isFolder ? (isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />) : <span className="w-3" />}
                            <FileIcon className={`w-4 h-4 ${isFolder ? "text-yellow-500" : item.name.endsWith(".js") || item.name.endsWith(".jsx") ? "text-yellow-400" : item.name.endsWith(".json") ? "text-yellow-500" : item.name.endsWith(".html") ? "text-orange-400" : item.name.endsWith(".md") ? "text-blue-400" : "text-zinc-400"}`} />
                            <span className="text-sm truncate">{item.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="memory" className="flex-1 m-0 overflow-hidden">
                  <MemoryPanel onSelectConversation={handleSelectConversation} currentConversationId={currentConversationId} />
                </TabsContent>

                <TabsContent value="collab" className="flex-1 m-0 overflow-hidden">
                  <CollaborationPanel
                    isConnected={collabConnected}
                    users={collabUsers}
                    roomId={roomId}
                    userName={userName}
                    userColor={userColor}
                    onSetUserName={setUserName}
                    onCreateRoom={handleCreateRoom}
                    onJoinRoom={handleJoinRoom}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </ResizablePanel>

          <ResizableHandle className="w-px bg-white/10 hover:bg-pink-500/50" />

          {/* Editor Area */}
          <ResizablePanel defaultSize={showBrowser ? 35 : 52} minSize={25}>
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

          {/* Browser Preview (conditional) */}
          {showBrowser && (
            <>
              <ResizableHandle className="w-px bg-white/10 hover:bg-pink-500/50" />
              <ResizablePanel defaultSize={25} minSize={20} maxSize={40}>
                <BrowserPreview htmlContent={htmlContent} onClose={() => setShowBrowser(false)} />
              </ResizablePanel>
            </>
          )}

          <ResizableHandle className="w-px bg-white/10 hover:bg-pink-500/50" />

          {/* Right Panel */}
          <ResizablePanel defaultSize={showBrowser ? 22 : 30} minSize={18} maxSize={40}>
            <div className="h-full flex flex-col bg-[#0B0B14]/60 border-l border-white/10">
              <Tabs value={activeRightPanel} onValueChange={setActiveRightPanel} className="flex-1 flex flex-col">
                <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none h-auto p-0">
                  <TabsTrigger data-testid="chat-tab" value="chat" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-2">
                    <MessageSquare className="w-4 h-4 mr-1" />
                    <span className="text-[10px] uppercase">Chat</span>
                  </TabsTrigger>
                  <TabsTrigger data-testid="agent-tab" value="agent" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-2">
                    <Zap className="w-4 h-4 mr-1" />
                    <span className="text-[10px] uppercase">Agent</span>
                  </TabsTrigger>
                  <TabsTrigger data-testid="tools-tab" value="tools" className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent data-[state=active]:text-white py-2">
                    <Sparkles className="w-4 h-4 mr-1" />
                    <span className="text-[10px] uppercase">Tools</span>
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="chat" className="flex-1 m-0 overflow-hidden">
                  <AIChat config={config} activeFile={activeFile} conversationId={currentConversationId} />
                </TabsContent>
                <TabsContent value="agent" className="flex-1 m-0 overflow-hidden">
                  <AgentPanel />
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

      {/* Video Chat */}
      {showVideoChat && roomId && (
        <VideoChat
          roomId={roomId}
          userId={userId}
          userName={userName}
          userColor={userColor}
          users={collabUsers}
          onClose={() => setShowVideoChat(false)}
        />
      )}
    </div>
  );
};

export default IDELayout;
