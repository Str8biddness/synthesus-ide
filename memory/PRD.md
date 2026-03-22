# SYNTHESUS AI IDE Platform - PRD v3.0

## Original Problem Statement
Build an AI IDE platform with local AI plugins (LM Studio/Ollama), memory like Perplexity, autonomy like Replit, browser preview with anti-gravity physics, and real-time collaboration.

## Architecture
- **Frontend**: React 19, Monaco Editor, Y.js, WebSocket, Matter.js
- **Backend**: FastAPI, WebSockets, LM Studio/Ollama abstraction
- **Database**: MongoDB for settings, plugins, conversations, collections, rooms

## What's Been Implemented

### Phase 1 - Core IDE
- Monaco code editor with SYNTHESUS dark theme
- File explorer with folder expand/collapse
- AI Chat panel with context awareness
- Terminal emulator
- Model selector (Ollama/LM Studio)
- Settings and Plugins modals

### Phase 2 - Memory & Agent
- Collections and conversation history
- Code execution (Python/JS/Shell)
- File operations (CRUD)
- Package installation
- Real terminal commands

### Phase 3 - Collaboration (NEW)
- Room creation and joining
- User profiles with avatars
- Active users list
- Shareable room links
- WebSocket-based real-time sync (requires proper WS proxy)

### Browser Preview
- Live HTML/CSS/JS preview
- Matter.js anti-gravity physics mode

## API Endpoints

### Collaboration
- `POST /api/collab/rooms` - Create room ✅
- `GET /api/collab/rooms/{id}` - Get room info ✅
- `GET /api/collab/rooms/{id}/users` - Get users ✅
- `WebSocket /ws/collab/{room_id}` - Real-time sync (needs WS proxy)

### Memory
- `GET/POST /api/memory/conversations` ✅
- `GET/POST /api/memory/collections` ✅
- `GET /api/memory/search` ✅

### Agent
- `POST /api/agent/execute` ✅
- `POST /api/agent/file` ✅
- `POST /api/agent/terminal` ✅
- `POST /api/agent/install` ✅

## Next Tasks
1. Configure WebSocket proxy for production
2. Add inline code completion
3. Add git integration
4. Add collaborative cursor sharing when WS works

## Known Limitations
- WebSocket requires proper proxy configuration in Kubernetes
- AI features require local Ollama/LM Studio
