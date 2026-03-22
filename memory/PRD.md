# SYNTHESUS AI IDE Platform - PRD v4.0

## Original Problem Statement
Build an AI IDE platform with local AI plugins (LM Studio/Ollama), memory like Perplexity, autonomy like Replit, browser preview with anti-gravity physics, real-time collaboration, and video/voice chat.

## Architecture
- **Frontend**: React 19, Monaco Editor, Y.js, WebRTC, Matter.js
- **Backend**: FastAPI, WebSockets, LM Studio/Ollama abstraction
- **Database**: MongoDB for settings, plugins, conversations, collections, rooms

## What's Been Implemented

### Phase 1 - Core IDE ✅
- Monaco code editor with SYNTHESUS cosmic dark theme
- File explorer with folder expand/collapse
- AI Chat panel with context awareness
- Terminal emulator with command history
- Model selector (Ollama/LM Studio switch)
- Settings and Plugins modals

### Phase 2 - Memory & Agent ✅
- Collections and conversation history (like Perplexity)
- Code execution (Python/JS/Shell)
- File operations (CRUD) in workspace
- Package installation (npm, pip, yarn)
- Real terminal command execution

### Phase 3 - Browser Preview ✅
- Live HTML/CSS/JS preview in iframe
- Matter.js anti-gravity physics mode
- Real-time code preview updates

### Phase 4 - Collaboration ✅
- Room creation and joining
- Shareable room links
- User profiles with avatars and colors
- Active users list with presence

### Phase 5 - Video/Voice Chat ✅ (NEW)
- WebRTC peer-to-peer video/audio
- Join/leave call controls
- Audio mute/unmute toggle
- Video on/off toggle  
- Screen sharing capability
- Expandable/minimizable video panel
- Multi-participant support

## API Endpoints

### Video Chat (NEW)
- `WebSocket /ws/rtc/{room_id}` - WebRTC signaling

### Collaboration
- `POST /api/collab/rooms` - Create room
- `GET /api/collab/rooms/{id}` - Get room info
- `WebSocket /ws/collab/{room_id}` - Real-time sync

### Memory
- `GET/POST /api/memory/conversations`
- `GET/POST /api/memory/collections`
- `GET /api/memory/search`

### Agent
- `POST /api/agent/execute` - Run code
- `POST /api/agent/file` - File operations
- `POST /api/agent/terminal` - Shell commands
- `POST /api/agent/install` - Package install

## Theme: SYNTHESUS Hyperspace
- Colors: Black (#030308), Pink (#FF007F), Gold (#FFD700), Orange (#FF7A00)
- Fonts: Outfit (headings), IBM Plex Sans (body), JetBrains Mono (code)
- Effects: Glassmorphism, particle starfield, gradient text

## Next Tasks
1. Add inline code completion (Copilot-style)
2. Add git integration
3. Add in-call text chat
4. Add recording capability
