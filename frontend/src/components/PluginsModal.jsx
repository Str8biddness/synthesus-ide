import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  BookOpen,
  Wrench,
  MessageSquareCode,
  CheckCircle,
  FileText,
  Search,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";

const PLUGIN_ICONS = {
  sparkles: Sparkles,
  "book-open": BookOpen,
  wrench: Wrench,
  "message-square-code": MessageSquareCode,
  "check-circle": CheckCircle,
  "file-text": FileText,
};

const CATEGORY_COLORS = {
  completion: "from-yellow-500/20 to-orange-500/20",
  documentation: "from-blue-500/20 to-cyan-500/20",
  refactoring: "from-green-500/20 to-emerald-500/20",
  generation: "from-pink-500/20 to-purple-500/20",
  review: "from-indigo-500/20 to-violet-500/20",
};

export const PluginsModal = ({ open, onOpenChange }) => {
  const [plugins, setPlugins] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [togglingPlugin, setTogglingPlugin] = useState(null);

  useEffect(() => {
    if (open) {
      loadPlugins();
    }
  }, [open]);

  const loadPlugins = async () => {
    setIsLoading(true);
    try {
      const response = await apiClient.get("/plugins");
      setPlugins(response.data);
    } catch (error) {
      toast.error("Failed to load plugins");
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlugin = async (pluginId) => {
    setTogglingPlugin(pluginId);
    try {
      const response = await apiClient.post(`/plugins/${pluginId}/toggle`);
      setPlugins((prev) =>
        prev.map((p) => (p.id === pluginId ? response.data : p))
      );
      toast.success(
        response.data.enabled
          ? `${response.data.name} enabled`
          : `${response.data.name} disabled`
      );
    } catch (error) {
      toast.error("Failed to toggle plugin");
    } finally {
      setTogglingPlugin(null);
    }
  };

  const filteredPlugins = plugins.filter(
    (plugin) =>
      plugin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plugin.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const enabledCount = plugins.filter((p) => p.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        data-testid="plugins-modal"
        className="max-w-2xl h-[600px] bg-[#0B0B14] border-white/10 p-0"
      >
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <DialogTitle className="font-heading gradient-text text-xl">
              AI Plugins
            </DialogTitle>
            <span className="text-xs text-zinc-500">
              {enabledCount} of {plugins.length} enabled
            </span>
          </div>
        </DialogHeader>

        <div className="px-6 py-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input
              data-testid="plugin-search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search plugins..."
              className="input-cosmic pl-10"
            />
          </div>
        </div>

        <ScrollArea className="flex-1 px-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-pink-500" />
            </div>
          ) : filteredPlugins.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              No plugins found
            </div>
          ) : (
            <div className="space-y-3 py-4">
              {filteredPlugins.map((plugin, index) => {
                const IconComponent = PLUGIN_ICONS[plugin.icon] || Sparkles;
                const categoryColor =
                  CATEGORY_COLORS[plugin.category] || CATEGORY_COLORS.completion;

                return (
                  <motion.div
                    key={plugin.id}
                    data-testid={`plugin-card-${plugin.id}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`plugin-card flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                      plugin.enabled
                        ? "border-pink-500/50 bg-pink-500/5"
                        : "border-white/10 bg-white/5"
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br ${categoryColor} flex items-center justify-center`}
                    >
                      <IconComponent
                        className={`w-6 h-6 ${
                          plugin.enabled ? "text-pink-400" : "text-zinc-400"
                        }`}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-white">
                          {plugin.name}
                        </h4>
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/10 text-zinc-400">
                          {plugin.category}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 mt-1 truncate">
                        {plugin.description}
                      </p>
                    </div>

                    <div className="flex-shrink-0">
                      {togglingPlugin === plugin.id ? (
                        <Loader2 className="w-5 h-5 animate-spin text-pink-500" />
                      ) : (
                        <Switch
                          data-testid={`plugin-toggle-${plugin.id}`}
                          checked={plugin.enabled}
                          onCheckedChange={() => togglePlugin(plugin.id)}
                        />
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="px-6 py-4 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-zinc-500">
            Plugins enhance AI capabilities in the editor
          </p>
          <Button
            data-testid="close-plugins-btn"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-zinc-400 hover:text-white"
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PluginsModal;
