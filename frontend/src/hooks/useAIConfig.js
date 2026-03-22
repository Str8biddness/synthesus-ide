import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DEFAULT_CONFIG = {
  backend_type: "ollama",
  base_url: "http://localhost:11434",
  model: "llama3.2",
  temperature: 0.7,
  max_tokens: 2048,
  top_p: 0.9,
};

export const useAIConfig = () => {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await axios.get(`${API}/settings`);
      if (response.data?.ai_config) {
        setConfig((prev) => ({
          ...prev,
          ...response.data.ai_config,
        }));
      }
    } catch (error) {
      console.error("Failed to load AI config:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateConfig = useCallback((updates) => {
    setConfig((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  const saveConfig = useCallback(async () => {
    try {
      await axios.post(`${API}/settings`, {
        ai_config: config,
      });
    } catch (error) {
      console.error("Failed to save AI config:", error);
    }
  }, [config]);

  return {
    config,
    updateConfig,
    saveConfig,
    isLoading,
  };
};

export default useAIConfig;
