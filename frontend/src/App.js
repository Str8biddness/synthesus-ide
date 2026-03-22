import { useState, useCallback, useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import IDELayout from "@/components/IDELayout";
import SettingsModal from "@/components/SettingsModal";
import PluginsModal from "@/components/PluginsModal";

function App() {
  const [init, setInit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showPlugins, setShowPlugins] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setInit(true);
    });
  }, []);

  const particlesLoaded = useCallback((container) => {
    // Particles loaded
  }, []);

  const particlesOptions = {
    background: {
      color: { value: "transparent" },
    },
    fpsLimit: 60,
    particles: {
      color: { value: ["#ffffff", "#FFD700", "#FF007F"] },
      links: { enable: false },
      move: {
        direction: "none",
        enable: true,
        outModes: { default: "out" },
        random: true,
        speed: { min: 0.5, max: 2 },
        straight: false,
      },
      number: {
        density: { enable: true, area: 1000 },
        value: 100,
      },
      opacity: {
        value: { min: 0.1, max: 0.8 },
        animation: {
          enable: true,
          speed: 1,
          minimumValue: 0.1,
        },
      },
      shape: { type: "circle" },
      size: {
        value: { min: 0.5, max: 2 },
      },
    },
    detectRetina: true,
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#030308]">
      {/* Hyperspace Background */}
      {init && (
        <Particles
          id="tsparticles"
          particlesLoaded={particlesLoaded}
          options={particlesOptions}
          className="absolute inset-0 -z-10"
        />
      )}
      
      {/* Main App */}
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <IDELayout 
                onOpenSettings={() => setShowSettings(true)}
                onOpenPlugins={() => setShowPlugins(true)}
              />
            } 
          />
        </Routes>
      </BrowserRouter>
      
      {/* Modals */}
      <SettingsModal open={showSettings} onOpenChange={setShowSettings} />
      <PluginsModal open={showPlugins} onOpenChange={setShowPlugins} />
      
      {/* Toast Notifications */}
      <Toaster 
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'rgba(11, 11, 20, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
          },
        }}
      />
    </div>
  );
}

export default App;
