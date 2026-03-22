import { useState, useRef, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Copy, Check, User, Bot, Trash2, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TypingIndicator = () => (
  <div className="flex items-center gap-1 p-2">
    <span className="typing-dot w-2 h-2 bg-pink-500 rounded-full" />
    <span className="typing-dot w-2 h-2 bg-pink-500 rounded-full" />
    <span className="typing-dot w-2 h-2 bg-pink-500 rounded-full" />
  </div>
);

const CodeBlock = ({ code, language }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-2 rounded-lg overflow-hidden chat-code-block">
      <div className="flex items-center justify-between px-3 py-2 bg-black/40 border-b border-white/10">
        <span className="text-xs text-zinc-500 uppercase">{language || "code"}</span>
        <button
          onClick={copyToClipboard}
          className="text-zinc-500 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto">
        <code className="text-sm font-mono text-zinc-300">{code}</code>
      </pre>
    </div>
  );
};

const formatMessage = (content) => {
  // Simple markdown-like parsing
  const parts = content.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith("```") && part.endsWith("```")) {
      const lines = part.slice(3, -3).split("\n");
      const language = lines[0].trim();
      const code = lines.slice(1).join("\n");
      return <CodeBlock key={index} code={code} language={language} />;
    }
    
    // Handle inline code
    const inlineParts = part.split(/(`[^`]+`)/g);
    return (
      <span key={index}>
        {inlineParts.map((inlinePart, i) => {
          if (inlinePart.startsWith("`") && inlinePart.endsWith("`")) {
            return (
              <code key={i} className="px-1.5 py-0.5 bg-white/10 rounded text-pink-400 text-sm font-mono">
                {inlinePart.slice(1, -1)}
              </code>
            );
          }
          // Handle bold
          return inlinePart.split(/(\*\*[^*]+\*\*)/g).map((boldPart, j) => {
            if (boldPart.startsWith("**") && boldPart.endsWith("**")) {
              return <strong key={j} className="font-semibold text-white">{boldPart.slice(2, -2)}</strong>;
            }
            return boldPart;
          });
        })}
      </span>
    );
  });
};

const ChatMessage = ({ message, isLast }) => {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
    >
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
          isUser
            ? "bg-gradient-to-br from-yellow-500 to-orange-500"
            : "bg-gradient-to-br from-pink-500 to-purple-500"
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-black" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>
      <div
        className={`flex-1 max-w-[85%] rounded-lg p-3 ${
          isUser ? "chat-user" : "chat-ai"
        }`}
      >
        <div className="text-sm leading-relaxed whitespace-pre-wrap">
          {formatMessage(message.content)}
        </div>
      </div>
    </motion.div>
  );
};

export const AIChat = ({ config, activeFile }) => {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Welcome to **SYNTHESUS AI**. I'm your intelligent coding companion.\n\nI can help you with:\n- Writing and explaining code\n- Debugging issues\n- Refactoring suggestions\n- Documentation generation\n\nHow can I assist you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: "user", content: input.trim() };
    
    // Add context about current file if available
    let contextMessage = input.trim();
    if (activeFile) {
      contextMessage = `[Context: Currently viewing ${activeFile.name}]\n\n${input.trim()}`;
    }

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/chat`, {
        messages: [
          ...messages.filter(m => m.role !== "assistant" || messages.indexOf(m) > 0).map(m => ({
            role: m.role,
            content: m.content,
          })),
          { role: "user", content: contextMessage },
        ],
        config: {
          backend_type: config.backend_type,
          base_url: config.base_url,
          model: config.model,
          temperature: config.temperature,
          max_tokens: config.max_tokens,
          top_p: config.top_p,
        },
      });

      const assistantMessage = {
        role: "assistant",
        content: response.data.response,
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage = error.response?.data?.detail || "Failed to get response. Make sure your AI backend is running.";
      toast.error(errorMessage);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**Error:** ${errorMessage}\n\nPlease check that your ${config.backend_type === "ollama" ? "Ollama" : "LM Studio"} server is running at \`${config.base_url}\``,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, config, activeFile]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "assistant",
        content: "Chat cleared. How can I help you?",
      },
    ]);
  };

  return (
    <div data-testid="ai-chat" className="h-full flex flex-col">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs text-zinc-400">
            {config.backend_type === "ollama" ? "Ollama" : "LM Studio"} - {config.model}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            data-testid="new-chat-btn"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-white"
            onClick={clearChat}
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            data-testid="clear-chat-btn"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-zinc-500 hover:text-white"
            onClick={clearChat}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          <AnimatePresence>
            {messages.map((message, index) => (
              <ChatMessage
                key={index}
                message={message}
                isLast={index === messages.length - 1}
              />
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-3"
            >
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-pink-500 to-purple-500">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="chat-ai rounded-lg">
                <TypingIndicator />
              </div>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              data-testid="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything about your code..."
              className="w-full input-cosmic rounded-lg px-4 py-3 pr-12 resize-none text-sm min-h-[48px] max-h-[120px]"
              rows={1}
              disabled={isLoading}
            />
          </div>
          <Button
            data-testid="send-message-btn"
            onClick={sendMessage}
            disabled={!input.trim() || isLoading}
            className="btn-cosmic rounded-lg px-4"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 mt-2 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
};

export default AIChat;
