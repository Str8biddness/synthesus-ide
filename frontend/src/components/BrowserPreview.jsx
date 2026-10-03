import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Globe, X, RefreshCw, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export const BrowserPreview = ({ htmlContent, onClose }) => {
  const iframeRef = useRef(null);
  const [url, setUrl] = useState("about:blank");
  const [isLoading, setIsLoading] = useState(false);
  const [antiGravityMode, setAntiGravityMode] = useState(false);

  // Update iframe with HTML content
  useEffect(() => {
    if (iframeRef.current && htmlContent) {
      const iframe = iframeRef.current;
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      
      // Inject anti-gravity script if mode is enabled
      let content = htmlContent;
      if (antiGravityMode) {
        content = injectAntiGravity(htmlContent);
      }
      
      doc.open();
      doc.write(content);
      doc.close();
    }
  }, [htmlContent, antiGravityMode]);

  const injectAntiGravity = (html) => {
    const antiGravityScript = `
      <script src="https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js"></script>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          // Create Matter.js engine
          const Engine = Matter.Engine,
                Render = Matter.Render,
                Runner = Matter.Runner,
                Bodies = Matter.Bodies,
                Composite = Matter.Composite,
                Mouse = Matter.Mouse,
                MouseConstraint = Matter.MouseConstraint;

          const engine = Engine.create();
          engine.world.gravity.y = 0.5;

          // Get all elements
          const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, img, button, a, span, div:not(#matter-canvas-container)');
          const bodies = [];

          elements.forEach((el, i) => {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && rect.width < 500 && rect.height < 200) {
              const body = Bodies.rectangle(
                rect.left + rect.width / 2,
                rect.top + rect.height / 2,
                rect.width,
                rect.height,
                { 
                  restitution: 0.6,
                  friction: 0.1,
                  render: { visible: false }
                }
              );
              body.element = el;
              body.originalRect = rect;
              bodies.push(body);
              
              el.style.position = 'fixed';
              el.style.margin = '0';
              el.style.zIndex = '1000';
            }
          });

          // Add walls
          const walls = [
            Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 30, window.innerWidth, 60, { isStatic: true }),
            Bodies.rectangle(-30, window.innerHeight / 2, 60, window.innerHeight, { isStatic: true }),
            Bodies.rectangle(window.innerWidth + 30, window.innerHeight / 2, 60, window.innerHeight, { isStatic: true }),
          ];

          Composite.add(engine.world, [...bodies, ...walls]);

          // Run engine
          const runner = Runner.create();
          Runner.run(runner, engine);

          // Update element positions
          function updateElements() {
            bodies.forEach(body => {
              if (body.element) {
                const rect = body.originalRect;
                body.element.style.left = (body.position.x - rect.width / 2) + 'px';
                body.element.style.top = (body.position.y - rect.height / 2) + 'px';
                body.element.style.transform = 'rotate(' + body.angle + 'rad)';
              }
            });
            requestAnimationFrame(updateElements);
          }
          updateElements();

          // Mouse interaction
          const mouse = Mouse.create(document.body);
          const mouseConstraint = MouseConstraint.create(engine, {
            mouse: mouse,
            constraint: { stiffness: 0.2, render: { visible: false } }
          });
          Composite.add(engine.world, mouseConstraint);
        });
      </script>
    `;
    
    // Insert script before closing body tag
    if (html.includes('</body>')) {
      return html.replace('</body>', antiGravityScript + '</body>');
    }
    return html + antiGravityScript;
  };

  const handleRefresh = () => {
    setIsLoading(true);
    if (iframeRef.current) {
      iframeRef.current.contentWindow.location.reload();
    }
    setTimeout(() => setIsLoading(false), 500);
  };

  const toggleAntiGravity = () => {
    setAntiGravityMode(!antiGravityMode);
  };

  const defaultContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: 'Outfit', sans-serif;
          background: linear-gradient(135deg, #030308 0%, #0B0B14 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin: 0;
          padding: 20px;
        }
        h1 {
          background: linear-gradient(90deg, #FFD700, #FF007F, #FF7A00);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        p { color: #A1A1AA; text-align: center; max-width: 400px; }
        .card {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          padding: 20px;
          margin: 10px;
        }
        button {
          background: linear-gradient(135deg, #FFD700, #FF007F);
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          color: black;
          font-weight: bold;
          cursor: pointer;
          margin-top: 20px;
        }
        button:hover { transform: scale(1.05); }
      </style>
    </head>
    <body>
      <h1>SYNTHESUS Preview</h1>
      <p>Your live preview will appear here. Write HTML, CSS, and JavaScript to see it render in real-time.</p>
      <div class="card">
        <h3>Getting Started</h3>
        <p>Create an HTML file and start coding!</p>
      </div>
      <button onclick="alert('Hello from SYNTHESUS!')">Click Me</button>
    </body>
    </html>
  `;

  return (
    <div data-testid="browser-preview" className="h-full flex flex-col bg-[#0B0B14]">
      {/* Browser Chrome */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10 bg-[#0B0B14]/80">
        <div className="flex gap-1.5">
          <button onClick={onClose} className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400" />
          <span className="w-3 h-3 rounded-full bg-yellow-500" />
          <span className="w-3 h-3 rounded-full bg-green-500" />
        </div>
        
        <div className="flex-1 flex items-center gap-2 mx-4">
          <div className="flex-1 flex items-center gap-2 bg-white/5 rounded-full px-4 py-1.5">
            <Globe className="w-4 h-4 text-zinc-500" />
            <span className="text-sm text-zinc-400 truncate">preview://localhost</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            data-testid="anti-gravity-btn"
            variant="ghost"
            size="icon"
            className={`h-8 w-8 ${antiGravityMode ? "text-pink-500" : "text-zinc-400"} hover:text-white`}
            onClick={toggleAntiGravity}
            title="Toggle Anti-Gravity Mode"
          >
            <Sparkles className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={handleRefresh}
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-zinc-400 hover:text-white"
            onClick={onClose}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Anti-Gravity Banner */}
      {antiGravityMode && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          className="bg-gradient-to-r from-pink-500/20 to-orange-500/20 px-4 py-2 text-center"
        >
          <span className="text-xs text-pink-400">
            Anti-Gravity Mode Active - Elements will float and interact with physics!
          </span>
        </motion.div>
      )}

      {/* Iframe */}
      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          data-testid="preview-iframe"
          srcDoc={htmlContent || defaultContent}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin allow-forms allow-modals"
          title="Preview"
        />
      </div>
    </div>
  );
};

export default BrowserPreview;
