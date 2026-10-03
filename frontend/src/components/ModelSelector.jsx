import { useState, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ChevronDown, Settings2, Loader2, CheckCircle, XCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ModelSelector = ({ config, updateConfig }) => {
  const [models, setModels] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("unknown");

  const fetchModels = async () => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API}/models/test-connection`, {
        backend_type: config.backend_type,
        base_url: config.base_url,
      });

      if (response.data.success) {
        setModels(response.data.models || []);
        setConnectionStatus("connected");
      } else {
        setModels([]);
        setConnectionStatus("error");
        toast.error(response.data.message);
      }
    } catch (error) {
      setModels([]);
      setConnectionStatus("error");
      toast.error("Failed to connect to AI backend");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [config.backend_type, config.base_url]);

  const handleBackendChange = (value) => {
    const newUrl = value === "ollama" 
      ? "http://localhost:11434" 
      : "http://localhost:1234";
    updateConfig({ 
      backend_type: value, 
      base_url: newUrl,
      model: "" 
    });
  };

  return (
    <div className="flex items-center gap-2">
      {/* Backend Selector */}
      <Select value={config.backend_type} onValueChange={handleBackendChange}>
        <SelectTrigger 
          data-testid="backend-selector"
          className="w-[120px] h-8 bg-white/5 border-white/10 text-sm"
        >
          <SelectValue placeholder="Backend" />
        </SelectTrigger>
        <SelectContent className="bg-[#0B0B14] border-white/10">
          <SelectItem value="ollama" className="text-white hover:bg-pink-500/20">
            Ollama
          </SelectItem>
          <SelectItem value="lmstudio" className="text-white hover:bg-pink-500/20">
            LM Studio
          </SelectItem>
        </SelectContent>
      </Select>

      {/* Model Selector */}
      <Select 
        value={config.model} 
        onValueChange={(value) => updateConfig({ model: value })}
      >
        <SelectTrigger 
          data-testid="model-selector"
          className="w-[180px] h-8 bg-white/5 border-white/10 text-sm"
        >
          <div className="flex items-center gap-2">
            {connectionStatus === "connected" && (
              <span className="w-2 h-2 rounded-full bg-green-500" />
            )}
            {connectionStatus === "error" && (
              <span className="w-2 h-2 rounded-full bg-red-500" />
            )}
            <SelectValue placeholder="Select model" />
          </div>
        </SelectTrigger>
        <SelectContent className="bg-[#0B0B14] border-white/10">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
            </div>
          ) : models.length > 0 ? (
            <SelectGroup>
              <SelectLabel className="text-zinc-500 text-xs uppercase">
                Available Models
              </SelectLabel>
              {models.map((model) => (
                <SelectItem 
                  key={model} 
                  value={model}
                  className="text-white hover:bg-pink-500/20"
                >
                  {model}
                </SelectItem>
              ))}
            </SelectGroup>
          ) : (
            <div className="text-center py-4 text-zinc-500 text-sm">
              No models found
            </div>
          )}
        </SelectContent>
      </Select>

      {/* Refresh Button */}
      <Button
        data-testid="refresh-models-btn"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-zinc-400 hover:text-white"
        onClick={fetchModels}
        disabled={isLoading}
      >
        <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
      </Button>

      {/* Settings Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            data-testid="model-settings-btn"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
          >
            <Settings2 className="w-4 h-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 bg-[#0B0B14] border-white/10"
          align="end"
        >
          <div className="space-y-4">
            <h4 className="font-heading font-semibold gradient-text text-sm">
              Model Parameters
            </h4>
            
            {/* Base URL */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                Base URL
              </Label>
              <Input
                data-testid="base-url-input"
                value={config.base_url}
                onChange={(e) => updateConfig({ base_url: e.target.value })}
                className="input-cosmic h-8 text-sm"
                placeholder="http://localhost:11434"
              />
            </div>

            {/* Temperature */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                  Temperature
                </Label>
                <span className="text-xs text-pink-400">{config.temperature}</span>
              </div>
              <Slider
                data-testid="temperature-slider"
                value={[config.temperature]}
                onValueChange={([value]) => updateConfig({ temperature: value })}
                min={0}
                max={2}
                step={0.1}
                className="slider-cosmic"
              />
            </div>

            {/* Max Tokens */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                  Max Tokens
                </Label>
                <span className="text-xs text-pink-400">{config.max_tokens}</span>
              </div>
              <Slider
                data-testid="max-tokens-slider"
                value={[config.max_tokens]}
                onValueChange={([value]) => updateConfig({ max_tokens: value })}
                min={256}
                max={8192}
                step={256}
                className="slider-cosmic"
              />
            </div>

            {/* Top P */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label className="text-xs text-zinc-400 uppercase tracking-wider">
                  Top P
                </Label>
                <span className="text-xs text-pink-400">{config.top_p}</span>
              </div>
              <Slider
                data-testid="top-p-slider"
                value={[config.top_p]}
                onValueChange={([value]) => updateConfig({ top_p: value })}
                min={0}
                max={1}
                step={0.05}
                className="slider-cosmic"
              />
            </div>

            {/* Test Connection */}
            <Button
              data-testid="test-connection-btn"
              onClick={fetchModels}
              className="w-full btn-cosmic text-sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : connectionStatus === "connected" ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Connected
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 mr-2" />
                  Test Connection
                </>
              )}
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default ModelSelector;
