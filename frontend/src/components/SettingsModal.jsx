import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Cpu, Palette, Code, Keyboard, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { apiClient } from "@/lib/api";
import { useAIConfig } from "@/hooks/useAIConfig";

export const SettingsModal = ({ open, onOpenChange }) => {
  const { config, updateConfig } = useAIConfig();
  const [settings, setSettings] = useState({
    font_size: 14,
    tab_size: 4,
    auto_save: true,
    theme: "synthesus",
    minimap: true,
    word_wrap: true,
    line_numbers: true,
    bracket_matching: true,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      loadSettings();
    }
  }, [open]);

  const loadSettings = async () => {
    try {
      const response = await apiClient.get("/settings");
      if (response.data) {
        setSettings((prev) => ({
          ...prev,
          ...response.data,
          ai_config: undefined,
        }));
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      await apiClient.post("/settings", {
        ...settings,
        ai_config: config,
      });
      toast.success("Settings saved successfully");
    } catch (error) {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        data-testid="settings-modal"
        className="max-w-2xl h-[600px] bg-[#0B0B14] border-white/10 p-0"
      >
        <DialogHeader className="px-6 py-4 border-b border-white/10">
          <DialogTitle className="font-heading gradient-text text-xl">
            Settings
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="ai" className="flex-1 flex flex-col">
          <TabsList className="w-full bg-transparent border-b border-white/10 rounded-none h-auto p-0 px-6">
            <TabsTrigger
              value="ai"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent py-3"
            >
              <Cpu className="w-4 h-4 mr-2" />
              AI Backend
            </TabsTrigger>
            <TabsTrigger
              value="editor"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent py-3"
            >
              <Code className="w-4 h-4 mr-2" />
              Editor
            </TabsTrigger>
            <TabsTrigger
              value="appearance"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent py-3"
            >
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger
              value="keybindings"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-transparent py-3"
            >
              <Keyboard className="w-4 h-4 mr-2" />
              Keybindings
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1">
            {/* AI Backend Tab */}
            <TabsContent value="ai" className="m-0 p-6 space-y-6">
              <div className="settings-section rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Backend Configuration</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                      AI Backend
                    </Label>
                    <Select
                      value={config.backend_type}
                      onValueChange={(value) => {
                        const newUrl = value === "ollama" 
                          ? "http://localhost:11434" 
                          : "http://localhost:1234";
                        updateConfig({ backend_type: value, base_url: newUrl });
                      }}
                    >
                      <SelectTrigger className="input-cosmic">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B0B14] border-white/10">
                        <SelectItem value="ollama">Ollama</SelectItem>
                        <SelectItem value="lmstudio">LM Studio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                      Base URL
                    </Label>
                    <Input
                      value={config.base_url}
                      onChange={(e) => updateConfig({ base_url: e.target.value })}
                      className="input-cosmic"
                      placeholder="http://localhost:11434"
                    />
                  </div>
                </div>
              </div>

              <div className="settings-section rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Model Parameters</h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                        Default Model
                      </Label>
                    </div>
                    <Input
                      value={config.model}
                      onChange={(e) => updateConfig({ model: e.target.value })}
                      className="input-cosmic"
                      placeholder="llama3.2"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                        Temperature
                      </Label>
                      <span className="text-xs text-pink-400">{config.temperature}</span>
                    </div>
                    <Slider
                      value={[config.temperature]}
                      onValueChange={([value]) => updateConfig({ temperature: value })}
                      min={0}
                      max={2}
                      step={0.1}
                      className="slider-cosmic"
                    />
                    <p className="text-xs text-zinc-500">
                      Lower values make output more focused and deterministic
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                        Max Tokens
                      </Label>
                      <span className="text-xs text-pink-400">{config.max_tokens}</span>
                    </div>
                    <Slider
                      value={[config.max_tokens]}
                      onValueChange={([value]) => updateConfig({ max_tokens: value })}
                      min={256}
                      max={8192}
                      step={256}
                      className="slider-cosmic"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                        Top P
                      </Label>
                      <span className="text-xs text-pink-400">{config.top_p}</span>
                    </div>
                    <Slider
                      value={[config.top_p]}
                      onValueChange={([value]) => updateConfig({ top_p: value })}
                      min={0}
                      max={1}
                      step={0.05}
                      className="slider-cosmic"
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Editor Tab */}
            <TabsContent value="editor" className="m-0 p-6 space-y-6">
              <div className="settings-section rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Editor Settings</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                      Font Size
                    </Label>
                    <Input
                      type="number"
                      value={settings.font_size}
                      onChange={(e) => updateSetting("font_size", parseInt(e.target.value))}
                      className="input-cosmic"
                      min={10}
                      max={24}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                      Tab Size
                    </Label>
                    <Select
                      value={String(settings.tab_size)}
                      onValueChange={(value) => updateSetting("tab_size", parseInt(value))}
                    >
                      <SelectTrigger className="input-cosmic">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0B0B14] border-white/10">
                        <SelectItem value="2">2 spaces</SelectItem>
                        <SelectItem value="4">4 spaces</SelectItem>
                        <SelectItem value="8">8 spaces</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-300">Auto Save</Label>
                    <Switch
                      checked={settings.auto_save}
                      onCheckedChange={(checked) => updateSetting("auto_save", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-300">Show Minimap</Label>
                    <Switch
                      checked={settings.minimap}
                      onCheckedChange={(checked) => updateSetting("minimap", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-300">Word Wrap</Label>
                    <Switch
                      checked={settings.word_wrap}
                      onCheckedChange={(checked) => updateSetting("word_wrap", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-300">Line Numbers</Label>
                    <Switch
                      checked={settings.line_numbers}
                      onCheckedChange={(checked) => updateSetting("line_numbers", checked)}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-300">Bracket Matching</Label>
                    <Switch
                      checked={settings.bracket_matching}
                      onCheckedChange={(checked) => updateSetting("bracket_matching", checked)}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Appearance Tab */}
            <TabsContent value="appearance" className="m-0 p-6 space-y-6">
              <div className="settings-section rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Theme</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      settings.theme === "synthesus"
                        ? "border-pink-500 bg-pink-500/10"
                        : "border-white/10 hover:border-white/20"
                    }`}
                    onClick={() => updateSetting("theme", "synthesus")}
                  >
                    <div className="h-20 rounded bg-gradient-to-br from-[#030308] to-[#0B0B14] mb-2 flex items-center justify-center">
                      <span className="gradient-text font-bold">SYNTHESUS</span>
                    </div>
                    <p className="text-sm text-white">SYNTHESUS Dark</p>
                    <p className="text-xs text-zinc-500">Cosmic hyperspace theme</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Keybindings Tab */}
            <TabsContent value="keybindings" className="m-0 p-6 space-y-6">
              <div className="settings-section rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-white">Keyboard Shortcuts</h3>
                
                <div className="space-y-2">
                  {[
                    { action: "Save File", keys: "Ctrl + S" },
                    { action: "Open File", keys: "Ctrl + O" },
                    { action: "Find", keys: "Ctrl + F" },
                    { action: "Replace", keys: "Ctrl + H" },
                    { action: "Command Palette", keys: "Ctrl + Shift + P" },
                    { action: "Toggle Terminal", keys: "Ctrl + `" },
                    { action: "AI Chat", keys: "Ctrl + Shift + A" },
                  ].map((shortcut) => (
                    <div
                      key={shortcut.action}
                      className="flex items-center justify-between py-2 border-b border-white/5"
                    >
                      <span className="text-sm text-zinc-300">{shortcut.action}</span>
                      <kbd className="px-2 py-1 bg-white/10 rounded text-xs font-mono text-pink-400">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </ScrollArea>

          {/* Footer */}
          <div className="p-4 border-t border-white/10 flex justify-end">
            <Button
              data-testid="save-settings-btn"
              onClick={saveSettings}
              className="btn-cosmic"
              disabled={isSaving}
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Settings
                </>
              )}
            </Button>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsModal;
