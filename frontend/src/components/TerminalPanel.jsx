import { useState, useRef, useEffect } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const WELCOME_MESSAGE = `SYNTHESUS Terminal v1.0.0
Type 'help' for available commands.

`;

const COMMANDS = {
  help: () => `Available commands:
  help      - Show this help message
  clear     - Clear terminal
  date      - Show current date/time
  whoami    - Display current user
  pwd       - Print working directory
  ls        - List files (simulated)
  echo      - Echo text
  version   - Show version info
`,
  clear: null,
  date: () => new Date().toLocaleString(),
  whoami: () => "synthesus-user",
  pwd: () => "/synthesus-project",
  ls: () => `src/
package.json
README.md
.gitignore`,
  version: () => `SYNTHESUS IDE v1.0.0
Node.js v20.0.0
React v19.0.0`,
};

export const TerminalPanel = ({ onClose }) => {
  const [history, setHistory] = useState([{ type: "output", content: WELCOME_MESSAGE }]);
  const [input, setInput] = useState("");
  const [commandHistory, setCommandHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isMaximized, setIsMaximized] = useState(false);
  const inputRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = (cmd) => {
    const trimmedCmd = cmd.trim();
    const [command, ...args] = trimmedCmd.split(" ");
    
    setHistory((prev) => [...prev, { type: "input", content: `$ ${trimmedCmd}` }]);
    
    if (trimmedCmd) {
      setCommandHistory((prev) => [...prev, trimmedCmd]);
      setHistoryIndex(-1);
    }

    if (command === "clear") {
      setHistory([]);
      return;
    }

    if (command === "echo") {
      setHistory((prev) => [...prev, { type: "output", content: args.join(" ") }]);
      return;
    }

    if (COMMANDS[command]) {
      const output = COMMANDS[command](args);
      setHistory((prev) => [...prev, { type: "output", content: output }]);
    } else if (trimmedCmd) {
      setHistory((prev) => [
        ...prev,
        { type: "error", content: `Command not found: ${command}. Type 'help' for available commands.` },
      ]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      executeCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length > 0) {
        const newIndex = historyIndex < commandHistory.length - 1 ? historyIndex + 1 : historyIndex;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(commandHistory[commandHistory.length - 1 - newIndex] || "");
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    } else if (e.key === "l" && e.ctrlKey) {
      e.preventDefault();
      setHistory([]);
    }
  };

  return (
    <div
      data-testid="terminal-panel"
      className={`h-full flex flex-col bg-[#030308] ${isMaximized ? "fixed inset-0 z-50" : ""}`}
    >
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#0B0B14]/80">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <span className="text-xs text-zinc-400 uppercase tracking-wider ml-2">Terminal</span>
        </div>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={() => setIsMaximized(!isMaximized)}
          >
            {isMaximized ? (
              <Minimize2 className="w-3 h-3" />
            ) : (
              <Maximize2 className="w-3 h-3" />
            )}
          </Button>
          <Button
            data-testid="close-terminal-btn"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-zinc-500 hover:text-white"
            onClick={onClose}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Terminal Content */}
      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-auto font-mono text-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((entry, index) => (
          <div
            key={index}
            className={`whitespace-pre-wrap ${
              entry.type === "error"
                ? "text-red-400"
                : entry.type === "input"
                ? "text-pink-400"
                : "text-zinc-300"
            }`}
          >
            {entry.content}
          </div>
        ))}
        
        {/* Current Input Line */}
        <div className="flex items-center text-pink-400">
          <span>$ </span>
          <input
            ref={inputRef}
            data-testid="terminal-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-zinc-300 ml-1"
            autoFocus
          />
          <span className="w-2 h-4 bg-pink-500 animate-pulse ml-0.5" />
        </div>
      </div>
    </div>
  );
};

export default TerminalPanel;
