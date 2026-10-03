import { useState, useEffect, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Library,
  Search,
  Plus,
  Folder,
  MessageSquare,
  MoreVertical,
  Trash2,
  Edit,
  Clock,
  Tag,
  ChevronRight,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const MemoryPanel = ({ onSelectConversation, currentConversationId }) => {
  const [conversations, setConversations] = useState([]);
  const [collections, setCollections] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [convRes, collRes] = await Promise.all([
        axios.get(`${API}/memory/conversations`, {
          params: selectedCollection ? { collection_id: selectedCollection } : {}
        }),
        axios.get(`${API}/memory/collections`)
      ]);
      setConversations(convRes.data);
      setCollections(collRes.data);
    } catch (error) {
      console.error("Failed to load memory data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedCollection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadData();
      return;
    }
    try {
      const response = await axios.get(`${API}/memory/search`, {
        params: { query: searchQuery }
      });
      setConversations(response.data);
    } catch (error) {
      toast.error("Search failed");
    }
  };

  const createCollection = async () => {
    if (!newCollectionName.trim()) return;
    try {
      await axios.post(`${API}/memory/collections`, {
        name: newCollectionName,
        description: "",
        icon: "folder",
        color: "#FF007F"
      });
      setNewCollectionName("");
      setShowNewCollection(false);
      loadData();
      toast.success("Collection created");
    } catch (error) {
      toast.error("Failed to create collection");
    }
  };

  const deleteConversation = async (id) => {
    try {
      await axios.delete(`${API}/memory/conversations/${id}`);
      loadData();
      toast.success("Conversation deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const deleteCollection = async (id) => {
    try {
      await axios.delete(`${API}/memory/collections/${id}`);
      if (selectedCollection === id) setSelectedCollection(null);
      loadData();
      toast.success("Collection deleted");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div data-testid="memory-panel" className="h-full flex flex-col bg-[#0B0B14]/60">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Library className="w-5 h-5 text-pink-500" />
            <h2 className="font-heading font-semibold text-white">Memory</h2>
          </div>
          <Dialog open={showNewCollection} onOpenChange={setShowNewCollection}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-zinc-400 hover:text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0B0B14] border-white/10">
              <DialogHeader>
                <DialogTitle className="gradient-text">New Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="Collection name..."
                  className="input-cosmic"
                  onKeyDown={(e) => e.key === "Enter" && createCollection()}
                />
                <Button onClick={createCollection} className="w-full btn-cosmic">
                  Create Collection
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input
            data-testid="memory-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search conversations..."
            className="input-cosmic pl-10 h-9"
          />
        </div>
      </div>

      {/* Collections */}
      <div className="px-4 py-2 border-b border-white/10">
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 mb-2">Collections</div>
        <div className="flex flex-wrap gap-2">
          <button
            data-testid="all-conversations-btn"
            onClick={() => setSelectedCollection(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              !selectedCollection
                ? "bg-pink-500/20 text-pink-400 border border-pink-500/50"
                : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20"
            }`}
          >
            All
          </button>
          {collections.map((coll) => (
            <div key={coll.id} className="relative group">
              <button
                data-testid={`collection-${coll.id}`}
                onClick={() => setSelectedCollection(coll.id)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  selectedCollection === coll.id
                    ? "bg-pink-500/20 text-pink-400 border border-pink-500/50"
                    : "bg-white/5 text-zinc-400 border border-white/10 hover:border-white/20"
                }`}
              >
                {coll.name}
              </button>
              <button
                onClick={() => deleteCollection(coll.id)}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full hidden group-hover:flex items-center justify-center"
              >
                <Trash2 className="w-2 h-2 text-white" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          <AnimatePresence>
            {filteredConversations.map((conv, index) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ delay: index * 0.03 }}
                data-testid={`conversation-${conv.id}`}
                className={`group flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  currentConversationId === conv.id
                    ? "bg-pink-500/20 border border-pink-500/30"
                    : "hover:bg-white/5 border border-transparent"
                }`}
                onClick={() => onSelectConversation(conv)}
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/20 to-pink-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-pink-400" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{conv.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Clock className="w-3 h-3 text-zinc-500" />
                    <span className="text-[10px] text-zinc-500">
                      {new Date(conv.updated_at).toLocaleDateString()}
                    </span>
                    {conv.messages && (
                      <span className="text-[10px] text-zinc-500">
                        · {conv.messages.length} messages
                      </span>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-zinc-400"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="bg-[#0B0B14] border-white/10">
                    <DropdownMenuItem
                      className="text-red-400 focus:text-red-400"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteConversation(conv.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </motion.div>
            ))}
          </AnimatePresence>
          
          {filteredConversations.length === 0 && !isLoading && (
            <div className="text-center py-8 text-zinc-500">
              <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No conversations yet</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default MemoryPanel;
