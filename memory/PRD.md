# SYNTHESUS AI IDE Platform - PRD

## Original Problem Statement
Build an AI IDE platform that focuses on local AI plugins via LM Studio or Ollama abstraction layer.

## Architecture
- **Frontend**: React 19, Monaco Editor, react-resizable-panels, framer-motion, tsparticles
- **Backend**: FastAPI with LM Studio/Ollama abstraction layer
- **Database**: MongoDB for settings, plugins, conversations

## User Personas
- Developers who want to use local AI models for code assistance
- Privacy-conscious developers avoiding cloud AI dependencies
- Users with LM Studio or Ollama installed locally

## Core Requirements (Static)
1. Code editor with syntax highlighting ✅
2. AI-powered code completion/suggestions ✅
3. AI chat assistant panel ✅
4. File explorer/project management ✅
5. Terminal integration ✅
6. Model management (view, select, configure) ✅
7. Plugin system ✅

## What's Been Implemented (2026-03-22)
- Full IDE layout with resizable panels
- Monaco code editor with SYNTHESUS dark theme
- File explorer with folder expand/collapse
- AI Chat panel with streaming-ready architecture
- Terminal emulator with command history
- Model selector (Ollama/LM Studio switch)
- Settings modal with AI config, editor, appearance tabs
- Plugins modal with enable/disable functionality
- Backend abstraction layer for Ollama and LM Studio APIs
- Complete API endpoints for chat, code completion, explanation, refactoring, generation

## Prioritized Backlog
### P0 (Critical)
- All core features implemented ✅

### P1 (Important)
- Real file system integration (currently using sample project)
- WebSocket for streaming AI responses
- Code completion inline suggestions

### P2 (Nice to have)
- Multiple project support
- Git integration
- Collaborative editing
- Custom theme editor

## Next Tasks
1. Test with actual Ollama/LM Studio backends
2. Add real-time code completion
3. Implement file save/load from filesystem
4. Add keyboard shortcuts
