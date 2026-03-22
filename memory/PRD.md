# SYNTHESUS AI IDE Platform - PRD v2.0

## Original Problem Statement
Build an AI IDE platform that focuses on local AI plugins via LM Studio or Ollama abstraction layer, with memory like Perplexity, autonomy like Replit, and browser preview with anti-gravity physics.

## Architecture
- **Frontend**: React 19, Monaco Editor, react-resizable-panels, framer-motion, tsparticles
- **Backend**: FastAPI with LM Studio/Ollama abstraction layer + Agent capabilities
- **Database**: MongoDB for settings, plugins, conversations, collections

## User Personas
- Developers wanting local AI models for code assistance
- Privacy-conscious developers avoiding cloud AI dependencies
- Power users needing code execution and file management in IDE

## Core Requirements (Static)
1. Code editor with syntax highlighting ✅
2. AI-powered code completion/suggestions ✅
3. AI chat assistant panel ✅
4. File explorer/project management ✅
5. Terminal integration ✅
6. Model management (view, select, configure) ✅
7. Plugin system ✅
8. Memory/Library for conversations ✅
9. Agent autonomy (code execution) ✅
10. Browser preview with physics ✅

## What's Been Implemented

### Phase 1 (2026-03-22)
- Full IDE layout with resizable panels
- Monaco code editor with SYNTHESUS dark theme
- File explorer with folder expand/collapse
- AI Chat panel
- Terminal emulator with command history
- Model selector (Ollama/LM Studio switch)
- Settings and Plugins modals
- Backend abstraction layer for Ollama/LM Studio

### Phase 2 (2026-03-22) - NEW
- **Memory System**: Collections and conversation history like Perplexity
  - Create/delete collections
  - Conversation persistence with timestamps
  - Search through conversation history
  - Context injection from previous chats
  
- **Agent Autonomy**: Code execution like Replit
  - Python code execution
  - JavaScript/Node.js execution
  - Shell command execution
  - File operations (create, read, update, delete, list)
  - Package installation (npm, pip, yarn)
  - Real terminal with command history
  
- **Browser Preview**: Live preview with physics
  - Embedded iframe for HTML preview
  - Anti-gravity mode with Matter.js physics
  - Elements float and interact with mouse
  - Real-time code preview

## Prioritized Backlog
### P0 (Critical) - All Complete ✅

### P1 (Important)
- WebSocket streaming for AI responses
- Real-time code completion inline
- Git integration
- Multi-file project execution

### P2 (Nice to have)
- Multiple project support
- Collaborative editing
- Custom theme editor
- Voice input for AI chat

## Next Tasks
1. Add inline code completion as user types
2. Implement WebSocket for streaming responses
3. Add git commands to agent terminal
4. Create project templates
