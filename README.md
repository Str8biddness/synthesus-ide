# SYNTHESUS IDE

A production-ready, AI-powered integrated development environment with real-time collaboration, multi-backend AI integration, and a beautiful hyperspace UI.

![SYNTHESUS IDE](https://img.shields.io/badge/SYNTHESUS-Hyperspace%20Intelligence-FF007F?style=for-the-badge)

## Features

- **AI-Powered Coding**: Multi-backend AI support (Ollama, LM Studio) for chat, code completion, explanation, refactoring, and natural language to code generation
- **Real-Time Collaboration**: WebSocket-based collaborative editing with cursor tracking and live presence
- **Video Chat**: WebRTC-powered video/audio communication within the IDE
- **Integrated Terminal**: Full terminal access with command execution
- **File Operations**: Create, read, update, delete files with agent assistance
- **Memory System**: MongoDB-backed conversation storage and search
- **Plugin Architecture**: Extensible plugin system for AI capabilities
- **Browser Preview**: Live preview for web projects
- **Beautiful UI**: Hyperspace particle effects, glassmorphism, cosmic gradients

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **MongoDB** - Document database for memory and persistence
- **Motor** - Async MongoDB driver
- **WebSockets** - Real-time collaboration and WebRTC signaling
- **Pydantic** - Data validation and serialization

### Frontend
- **React 19** - Modern React with hooks
- **Monaco Editor** - VS Code's powerful editor
- **Radix UI + shadcn/ui** - Accessible, composable components
- **Framer Motion** - Smooth animations and transitions
- **tsParticles** - Hyperspace background effects
- **xterm.js** - Terminal emulation
- **y-websocket** - Yjs CRDT for collaboration

## Quick Start

### Prerequisites

- Python 3.10+
- Node.js 18+
- MongoDB 5.0+
- Ollama (optional, for local AI) or LM Studio

### 1. Clone and Setup

```bash
git clone https://github.com/your-org/synthesus-ide.git
cd synthesus-ide
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp ../env.example.backend .env
# Edit .env with your actual values (see Configuration section)
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies (uses yarn)
yarn install

# Setup environment
cp env.example.frontend .env
# Edit .env with your actual values
```

### 4. Start MongoDB

```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:7

# Or using local installation
mongod --dbpath /path/to/data
```

### 5. Start AI Backend (Optional - for local AI)

**Ollama:**
```bash
ollama serve
ollama pull llama3.2
```

**LM Studio:**
- Open LM Studio
- Load a model
- Start the local server (default port 1234)

### 6. Run the Application

**Start Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

**Start Frontend:**
```bash
cd frontend
yarn start
```

Visit http://localhost:3000

## Docker Deployment

### Using Docker Compose (Recommended)

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build backend
cd backend
docker build -t synthesus-backend .

# Build frontend
cd frontend
docker build -t synthesus-frontend .

# Run with docker-compose or manually
docker run -p 8000:8000 synthesus-backend
docker run -p 3000:3000 synthesus-frontend
```

## Configuration

### Backend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGO_URL` | `mongodb://localhost:27017` | MongoDB connection string |
| `DB_NAME` | `synthesus_ide` | Database name |
| `CORS_ORIGINS` | `http://localhost:3000` | Allowed frontend origins |
| `JWT_SECRET` | Required | Secret for JWT signing |
| `WORKSPACE_DIR` | `/tmp/synthesus_workspace` | User workspace path |
| `MAX_EXECUTION_TIMEOUT` | `60` | Max code execution time (seconds) |
| `PORT` | `8000` | Server port |

### Frontend Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_BACKEND_URL` | `http://localhost:8000` | Backend API URL |
| `REACT_APP_WS_URL` | `ws://localhost:8000` | WebSocket URL |
| `REACT_APP_ENABLE_COLLABORATION` | `true` | Enable real-time collaboration |
| `REACT_APP_ENABLE_VIDEO_CHAT` | `true` | Enable WebRTC video chat |

See `env.example.backend` and `frontend/env.example.frontend` for all options.

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Key Endpoints

- `POST /api/chat` - AI chat completion
- `POST /api/code/complete` - Code completion
- `POST /api/code/explain` - Code explanation
- `POST /api/code/refactor` - Code refactoring
- `POST /api/agent/execute` - Execute code in sandbox
- `POST /api/agent/file` - File operations
- `POST /api/agent/terminal` - Terminal command execution
- `WS /ws/collab/{room_id}` - Collaboration WebSocket
- `WS /ws/rtc/{room_id}` - WebRTC signaling

## Plugin Development

Plugins extend AI capabilities. See `frontend/plugins/` for examples.

### Creating a Plugin

1. Create a new folder in `frontend/plugins/`
2. Add a `plugin.json` manifest:

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "description": "Does awesome things",
  "category": "generation",
  "icon": "sparkles"
}
```

3. Implement the plugin logic
4. Register in the backend's `DEFAULT_PLUGINS`

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
yarn test
```

### E2E Tests

```bash
cd frontend
yarn test:e2e
```

## Security Considerations

- **Code Execution**: Sandbox runs in isolated temp directories with timeouts
- **File Access**: Restricted to workspace directory only
- **Shell Commands**: Limited timeout and output size
- **Authentication**: JWT-based (add your own auth layer for production)
- **CORS**: Configure allowed origins via environment

For production:
1. Use proper authentication
2. Run code execution in Docker containers
3. Enable HTTPS/WSS
4. Set strong JWT secrets
5. Configure rate limiting

## Architecture

```
┌─────────────────┐      ┌──────────────────┐
│   Frontend      │      │    Backend       │
│  (React 19)     │      │   (FastAPI)      │
├─────────────────┤      ├──────────────────┤
│ - Monaco Editor │      │ - AI Abstraction │
│ - WebSocket     │      │ - MongoDB        │
│ - WebRTC        │      │ - Code Sandbox   │
│ - Terminal      │      │ - File System    │
└─────────────────┘      └────────┬─────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
               ┌────────┐   ┌────────┐   ┌──────────┐
               │ Ollama │   │LMStudio│   │ MongoDB  │
               └────────┘   └────────┘   └──────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Workflow

- Run tests before committing
- Follow existing code style
- Update documentation for new features
- Add tests for bug fixes and features

## Troubleshooting

### Common Issues

**MongoDB Connection Failed**
- Check MongoDB is running: `docker ps | grep mongo`
- Verify `MONGO_URL` in `.env`
- Check network connectivity

**AI Backend Not Responding**
- Verify Ollama/LM Studio is running
- Check the base URL in settings
- Test connection in the UI

**WebSocket Connection Failed**
- Check firewall settings
- Verify `REACT_APP_WS_URL` matches backend
- Look for CORS errors in browser console

**Code Execution Timeout**
- Increase `MAX_EXECUTION_TIMEOUT` in backend `.env`
- Check resource limits
- Review code for infinite loops

## License

MIT License - See [LICENSE](LICENSE) for details.

## Roadmap

- [ ] Multi-user authentication and workspaces
- [ ] Git integration
- [ ] VS Code extension
- [ ] Cloud deployment templates (AWS, GCP, Azure)
- [ ] Additional AI backends (OpenAI, Anthropic)
- [ ] Plugin marketplace

## Support

- Documentation: https://docs.synthesus.io
- Issues: https://github.com/your-org/synthesus-ide/issues
- Discord: https://discord.gg/synthesus

---

Built with by the SYNTHESUS Team
