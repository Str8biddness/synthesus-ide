import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Play,
  Square,
  Trash2,
  Download,
  Upload,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Terminal,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const AgentPanel = ({ onExecutionResult }) => {
  const [code, setCode] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [output, setOutput] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [terminalHistory, setTerminalHistory] = useState([]);
  const [terminalInput, setTerminalInput] = useState("");
  const [workspaceFiles, setWorkspaceFiles] = useState([]);
  const terminalRef = useRef(null);

  useEffect(() => {
    loadWorkspaceFiles();
  }, []);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [terminalHistory]);

  const loadWorkspaceFiles = async () => {
    try {
      const response = await axios.post(`${API}/agent/file`, {
        operation: "list",
        path: "/"
      });
      if (response.data.success) {
        setWorkspaceFiles(response.data.data || []);
      }
    } catch (error) {
      console.error("Failed to load workspace:", error);
    }
  };

  const executeCode = async () => {
    if (!code.trim()) return;
    setIsExecuting(true);
    setOutput("");

    try {
      const response = await axios.post(`${API}/agent/execute`, {
        code,
        language,
        timeout: 30
      });

      const result = response.data;
      const outputText = result.success
        ? result.output || "Execution completed successfully (no output)"
        : `Error: ${result.error}`;
      
      setOutput(outputText);
      if (onExecutionResult) {
        onExecutionResult(result);
      }
      
      if (result.success) {
        toast.success(`Executed in ${result.execution_time.toFixed(2)}s`);
      } else {
        toast.error("Execution failed");
      }
    } catch (error) {
      setOutput(`Error: ${error.message}`);
      toast.error("Execution failed");
    } finally {
      setIsExecuting(false);
    }
  };

  const runTerminalCommand = async () => {
    if (!terminalInput.trim()) return;
    
    const command = terminalInput;
    setTerminalHistory(prev => [...prev, { type: "input", content: `$ ${command}` }]);
    setTerminalInput("");

    try {
      const response = await axios.post(`${API}/agent/terminal`, { command });
      const result = response.data;
      
      if (result.stdout) {
        setTerminalHistory(prev => [...prev, { type: "output", content: result.stdout }]);
      }
      if (result.stderr) {
        setTerminalHistory(prev => [...prev, { type: "error", content: result.stderr }]);
      }
      if (!result.stdout && !result.stderr) {
        setTerminalHistory(prev => [...prev, { type: "output", content: "(no output)" }]);
      }
    } catch (error) {
      setTerminalHistory(prev => [...prev, { type: "error", content: `Error: ${error.message}` }]);
    }
  };

  const createFile = async (name) => {
    try {
      await axios.post(`${API}/agent/file`, {
        operation: "create",
        path: `/${name}`,
        content: ""
      });
      loadWorkspaceFiles();
      toast.success("File created");
    } catch (error) {
      toast.error("Failed to create file");
    }
  };

  const createFolder = async (name) => {
    try {
      await axios.post(`${API}/agent/file`, {
        operation: "mkdir",
        path: `/${name}`
      });
      loadWorkspaceFiles();
      toast.success("Folder created");
    } catch (error) {
      toast.error("Failed to create folder");
    }
  };

  const installPackages = async (packages, manager = "npm") => {
    setTerminalHistory(prev => [...prev, { type: "input", content: `$ ${manager} install ${packages.join(" ")}` }]);
    
    try {
      const response = await axios.post(`${API}/agent/install`, {
        packages,
        package_manager: manager
      });
      
      if (response.data.success) {
        setTerminalHistory(prev => [...prev, { type: "output", content: response.data.output }]);
        toast.success("Packages installed");
      } else {
        setTerminalHistory(prev => [...prev, { type: "error", content: response.data.error }]);
        toast.error("Installation failed");
      }
    } catch (error) {
      setTerminalHistory(prev => [...prev, { type: "error", content: error.message }]);
    }
  };

  return (
    <div data-testid="agent-panel" className="h-full flex flex-col bg-[#0B0B14]/60">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-heading font-semibold gradient-text">Agent Workspace</h3>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-400 hover:text-white"
            onClick={loadWorkspaceFiles}
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Code Execution */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-zinc-400 uppercase tracking-wider">Execute Code</label>
              <select
                data-testid="language-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white"
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="shell">Shell</option>
              </select>
            </div>
            <textarea
              data-testid="code-input"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={`Enter ${language} code...`}
              className="w-full h-32 input-cosmic rounded-lg p-3 font-mono text-sm resize-none"
            />
            <div className="flex gap-2">
              <Button
                data-testid="execute-btn"
                onClick={executeCode}
                disabled={isExecuting}
                className="flex-1 btn-cosmic"
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Execute
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => { setCode(""); setOutput(""); }}
                className="btn-secondary"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Output */}
            {output && (
              <div className="bg-black/40 rounded-lg p-3 font-mono text-sm">
                <div className="text-[10px] text-zinc-500 uppercase mb-2">Output</div>
                <pre className="text-zinc-300 whitespace-pre-wrap">{output}</pre>
              </div>
            )}
          </div>

          {/* File Operations */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider">Workspace Files</label>
            <div className="flex gap-2 mb-2">
              <Button
                variant="outline"
                size="sm"
                className="btn-secondary text-xs"
                onClick={() => {
                  const name = prompt("Enter file name:");
                  if (name) createFile(name);
                }}
              >
                <FilePlus className="w-3 h-3 mr-1" />
                New File
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="btn-secondary text-xs"
                onClick={() => {
                  const name = prompt("Enter folder name:");
                  if (name) createFolder(name);
                }}
              >
                <FolderPlus className="w-3 h-3 mr-1" />
                New Folder
              </Button>
            </div>
            <div className="bg-black/40 rounded-lg p-2 max-h-32 overflow-auto">
              {workspaceFiles.length === 0 ? (
                <p className="text-xs text-zinc-500 text-center py-2">Workspace is empty</p>
              ) : (
                workspaceFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 text-xs text-zinc-400">
                    <span>{file.type === "folder" ? "📁" : "📄"}</span>
                    <span>{file.name}</span>
                    {file.size && <span className="text-zinc-600">({file.size}b)</span>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Terminal */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Terminal className="w-3 h-3" />
              Terminal
            </label>
            <div
              ref={terminalRef}
              className="bg-black/60 rounded-lg p-3 h-40 overflow-auto font-mono text-xs"
            >
              {terminalHistory.map((entry, i) => (
                <div
                  key={i}
                  className={`whitespace-pre-wrap ${
                    entry.type === "error" ? "text-red-400" :
                    entry.type === "input" ? "text-pink-400" : "text-zinc-300"
                  }`}
                >
                  {entry.content}
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                data-testid="terminal-input"
                value={terminalInput}
                onChange={(e) => setTerminalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && runTerminalCommand()}
                placeholder="Enter command..."
                className="input-cosmic font-mono text-sm"
              />
              <Button onClick={runTerminalCommand} className="btn-cosmic px-4">
                Run
              </Button>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-2">
            <label className="text-xs text-zinc-400 uppercase tracking-wider">Quick Actions</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="btn-secondary text-xs"
                onClick={() => installPackages(["express"], "npm")}
              >
                Install Express
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="btn-secondary text-xs"
                onClick={() => installPackages(["react"], "npm")}
              >
                Install React
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="btn-secondary text-xs"
                onClick={() => installPackages(["requests"], "pip")}
              >
                Install Requests
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="btn-secondary text-xs"
                onClick={() => installPackages(["flask"], "pip")}
              >
                Install Flask
              </Button>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default AgentPanel;
