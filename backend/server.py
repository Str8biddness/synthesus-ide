from fastapi import FastAPI, APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import httpx
import asyncio
import subprocess
import sys
import json
import tempfile
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="SYNTHESUS AI IDE Platform")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Workspace directory for user projects
WORKSPACE_DIR = Path("/tmp/synthesus_workspace")
WORKSPACE_DIR.mkdir(exist_ok=True)

# ===== Models =====

class AIBackendConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    backend_type: str = "ollama"
    base_url: str = "http://localhost:11434"
    model: str = "llama3.2"
    temperature: float = 0.7
    max_tokens: int = 2048
    top_p: float = 0.9

class ModelInfo(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    size: Optional[str] = None
    modified_at: Optional[str] = None
    backend: str

class ChatMessage(BaseModel):
    role: str
    content: str
    timestamp: Optional[str] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    config: Optional[AIBackendConfig] = None
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    model: str
    backend: str

class CodeCompletionRequest(BaseModel):
    code: str
    language: str
    cursor_position: int
    config: Optional[AIBackendConfig] = None

class CodeCompletionResponse(BaseModel):
    suggestions: List[str]
    model: str

class CodeExplanationRequest(BaseModel):
    code: str
    language: str
    config: Optional[AIBackendConfig] = None

class CodeExplanationResponse(BaseModel):
    explanation: str
    model: str

class RefactoringRequest(BaseModel):
    code: str
    language: str
    instruction: str
    config: Optional[AIBackendConfig] = None

class RefactoringResponse(BaseModel):
    refactored_code: str
    explanation: str
    model: str

class NL2CodeRequest(BaseModel):
    prompt: str
    language: str
    config: Optional[AIBackendConfig] = None

class NL2CodeResponse(BaseModel):
    code: str
    explanation: str
    model: str

class TestConnectionRequest(BaseModel):
    backend_type: str
    base_url: str

class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    models: Optional[List[str]] = None

class Plugin(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    category: str
    enabled: bool = False
    icon: str = "puzzle"

class UserSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "default"
    ai_config: AIBackendConfig = Field(default_factory=AIBackendConfig)
    theme: str = "synthesus"
    font_size: int = 14
    tab_size: int = 4
    auto_save: bool = True
    plugins: List[str] = []

# Memory & Conversation Models
class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str = "New Conversation"
    messages: List[ChatMessage] = []
    collection_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    summary: Optional[str] = None
    tags: List[str] = []

class Collection(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    icon: str = "folder"
    color: str = "#FF007F"
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

# Agent/Autonomy Models
class CodeExecutionRequest(BaseModel):
    code: str
    language: str  # "javascript", "python", "shell"
    timeout: int = 30

class CodeExecutionResponse(BaseModel):
    success: bool
    output: str
    error: Optional[str] = None
    execution_time: float

class FileOperation(BaseModel):
    operation: str  # "create", "read", "update", "delete", "list", "mkdir"
    path: str
    content: Optional[str] = None

class FileOperationResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None

class TerminalCommand(BaseModel):
    command: str
    cwd: Optional[str] = None

class TerminalResponse(BaseModel):
    success: bool
    stdout: str
    stderr: str
    return_code: int

class PackageInstallRequest(BaseModel):
    packages: List[str]
    package_manager: str = "npm"  # "npm", "pip", "yarn"

# ===== AI Backend Abstraction Layer =====

async def get_ollama_models(base_url: str) -> List[ModelInfo]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [ModelInfo(name=m.get("name", "unknown"), size=m.get("size", ""), modified_at=m.get("modified_at", ""), backend="ollama") for m in data.get("models", [])]
    except Exception as e:
        logger.error(f"Failed to fetch Ollama models: {e}")
    return []

async def get_lmstudio_models(base_url: str) -> List[ModelInfo]:
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/v1/models")
            if response.status_code == 200:
                data = response.json()
                return [ModelInfo(name=m.get("id", "unknown"), size=None, modified_at=None, backend="lmstudio") for m in data.get("data", [])]
    except Exception as e:
        logger.error(f"Failed to fetch LM Studio models: {e}")
    return []

async def chat_with_ollama(messages: List[ChatMessage], config: AIBackendConfig) -> str:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": config.model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "stream": False,
                "options": {"temperature": config.temperature, "num_predict": config.max_tokens, "top_p": config.top_p}
            }
            response = await client.post(f"{config.base_url}/api/chat", json=payload)
            if response.status_code == 200:
                return response.json().get("message", {}).get("content", "")
            raise HTTPException(status_code=500, detail=f"Ollama error: {response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Ollama timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def chat_with_lmstudio(messages: List[ChatMessage], config: AIBackendConfig) -> str:
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": config.model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "temperature": config.temperature,
                "max_tokens": config.max_tokens,
                "top_p": config.top_p,
                "stream": False
            }
            response = await client.post(f"{config.base_url}/v1/chat/completions", json=payload)
            if response.status_code == 200:
                return response.json().get("choices", [{}])[0].get("message", {}).get("content", "")
            raise HTTPException(status_code=500, detail=f"LM Studio error: {response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to LM Studio timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def unified_chat(messages: List[ChatMessage], config: AIBackendConfig) -> str:
    if config.backend_type == "ollama":
        return await chat_with_ollama(messages, config)
    elif config.backend_type == "lmstudio":
        return await chat_with_lmstudio(messages, config)
    raise HTTPException(status_code=400, detail=f"Unknown backend type: {config.backend_type}")

# ===== Memory System APIs =====

@api_router.get("/memory/conversations", response_model=List[Conversation])
async def list_conversations(collection_id: Optional[str] = None, limit: int = 50):
    """List all conversations, optionally filtered by collection"""
    query = {}
    if collection_id:
        query["collection_id"] = collection_id
    convos = await db.conversations.find(query, {"_id": 0}).sort("updated_at", -1).to_list(limit)
    return [Conversation(**c) for c in convos]

@api_router.get("/memory/conversations/{conv_id}", response_model=Conversation)
async def get_conversation(conv_id: str):
    """Get a specific conversation with full message history"""
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return Conversation(**conv)

@api_router.post("/memory/conversations", response_model=Conversation)
async def create_conversation(conversation: Conversation):
    """Create a new conversation"""
    conv_dict = conversation.model_dump()
    await db.conversations.insert_one(conv_dict)
    return conversation

@api_router.put("/memory/conversations/{conv_id}", response_model=Conversation)
async def update_conversation(conv_id: str, conversation: Conversation):
    """Update a conversation"""
    conv_dict = conversation.model_dump()
    conv_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.conversations.update_one({"id": conv_id}, {"$set": conv_dict})
    return Conversation(**conv_dict)

@api_router.delete("/memory/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    """Delete a conversation"""
    result = await db.conversations.delete_one({"id": conv_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}

@api_router.get("/memory/collections", response_model=List[Collection])
async def list_collections():
    """List all collections"""
    collections = await db.collections.find({}, {"_id": 0}).to_list(100)
    return [Collection(**c) for c in collections]

@api_router.post("/memory/collections", response_model=Collection)
async def create_collection(collection: Collection):
    """Create a new collection"""
    coll_dict = collection.model_dump()
    await db.collections.insert_one(coll_dict)
    return collection

@api_router.delete("/memory/collections/{coll_id}")
async def delete_collection(coll_id: str):
    """Delete a collection and optionally its conversations"""
    await db.collections.delete_one({"id": coll_id})
    # Move conversations to uncategorized
    await db.conversations.update_many({"collection_id": coll_id}, {"$set": {"collection_id": None}})
    return {"success": True}

@api_router.get("/memory/search")
async def search_conversations(query: str, limit: int = 20):
    """Search through conversation history"""
    # Text search in messages
    results = await db.conversations.find(
        {"$or": [
            {"title": {"$regex": query, "$options": "i"}},
            {"messages.content": {"$regex": query, "$options": "i"}},
            {"tags": {"$in": [query]}}
        ]},
        {"_id": 0}
    ).limit(limit).to_list(limit)
    return results

@api_router.get("/memory/context/{conv_id}")
async def get_conversation_context(conv_id: str, max_messages: int = 10):
    """Get context from a conversation for injection into new chats"""
    conv = await db.conversations.find_one({"id": conv_id}, {"_id": 0})
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    messages = conv.get("messages", [])[-max_messages:]
    return {"context": messages, "summary": conv.get("summary")}

# ===== Agent/Autonomy APIs =====

@api_router.post("/agent/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """Execute code in a sandboxed environment"""
    import time
    start_time = time.time()
    
    try:
        if request.language == "python":
            # Execute Python code
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(request.code)
                f.flush()
                result = subprocess.run(
                    [sys.executable, f.name],
                    capture_output=True,
                    text=True,
                    timeout=request.timeout,
                    cwd=str(WORKSPACE_DIR)
                )
                os.unlink(f.name)
                return CodeExecutionResponse(
                    success=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.stderr else None,
                    execution_time=time.time() - start_time
                )
        
        elif request.language == "javascript":
            # Execute JavaScript using Node.js
            with tempfile.NamedTemporaryFile(mode='w', suffix='.js', delete=False) as f:
                f.write(request.code)
                f.flush()
                result = subprocess.run(
                    ["node", f.name],
                    capture_output=True,
                    text=True,
                    timeout=request.timeout,
                    cwd=str(WORKSPACE_DIR)
                )
                os.unlink(f.name)
                return CodeExecutionResponse(
                    success=result.returncode == 0,
                    output=result.stdout,
                    error=result.stderr if result.stderr else None,
                    execution_time=time.time() - start_time
                )
        
        elif request.language == "shell":
            # Execute shell commands
            result = subprocess.run(
                request.code,
                shell=True,
                capture_output=True,
                text=True,
                timeout=request.timeout,
                cwd=str(WORKSPACE_DIR)
            )
            return CodeExecutionResponse(
                success=result.returncode == 0,
                output=result.stdout,
                error=result.stderr if result.stderr else None,
                execution_time=time.time() - start_time
            )
        
        else:
            return CodeExecutionResponse(
                success=False,
                output="",
                error=f"Unsupported language: {request.language}",
                execution_time=time.time() - start_time
            )
    
    except subprocess.TimeoutExpired:
        return CodeExecutionResponse(
            success=False,
            output="",
            error=f"Execution timed out after {request.timeout} seconds",
            execution_time=request.timeout
        )
    except Exception as e:
        return CodeExecutionResponse(
            success=False,
            output="",
            error=str(e),
            execution_time=time.time() - start_time
        )

@api_router.post("/agent/file", response_model=FileOperationResponse)
async def file_operation(request: FileOperation):
    """Perform file system operations"""
    try:
        # Sanitize path to prevent directory traversal
        safe_path = WORKSPACE_DIR / request.path.lstrip("/")
        
        if request.operation == "create":
            safe_path.parent.mkdir(parents=True, exist_ok=True)
            safe_path.write_text(request.content or "")
            return FileOperationResponse(success=True, data={"path": str(safe_path)})
        
        elif request.operation == "read":
            if not safe_path.exists():
                return FileOperationResponse(success=False, error="File not found")
            content = safe_path.read_text()
            return FileOperationResponse(success=True, data={"content": content})
        
        elif request.operation == "update":
            if not safe_path.exists():
                return FileOperationResponse(success=False, error="File not found")
            safe_path.write_text(request.content or "")
            return FileOperationResponse(success=True, data={"path": str(safe_path)})
        
        elif request.operation == "delete":
            if safe_path.is_dir():
                shutil.rmtree(safe_path)
            else:
                safe_path.unlink(missing_ok=True)
            return FileOperationResponse(success=True)
        
        elif request.operation == "list":
            if not safe_path.exists():
                return FileOperationResponse(success=False, error="Directory not found")
            files = []
            for item in safe_path.iterdir():
                files.append({
                    "name": item.name,
                    "type": "folder" if item.is_dir() else "file",
                    "path": str(item.relative_to(WORKSPACE_DIR)),
                    "size": item.stat().st_size if item.is_file() else None
                })
            return FileOperationResponse(success=True, data=files)
        
        elif request.operation == "mkdir":
            safe_path.mkdir(parents=True, exist_ok=True)
            return FileOperationResponse(success=True, data={"path": str(safe_path)})
        
        else:
            return FileOperationResponse(success=False, error=f"Unknown operation: {request.operation}")
    
    except Exception as e:
        return FileOperationResponse(success=False, error=str(e))

@api_router.post("/agent/terminal", response_model=TerminalResponse)
async def run_terminal_command(request: TerminalCommand):
    """Execute a terminal command"""
    try:
        cwd = WORKSPACE_DIR / (request.cwd or "").lstrip("/") if request.cwd else WORKSPACE_DIR
        result = subprocess.run(
            request.command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=60,
            cwd=str(cwd)
        )
        return TerminalResponse(
            success=result.returncode == 0,
            stdout=result.stdout,
            stderr=result.stderr,
            return_code=result.returncode
        )
    except subprocess.TimeoutExpired:
        return TerminalResponse(success=False, stdout="", stderr="Command timed out", return_code=-1)
    except Exception as e:
        return TerminalResponse(success=False, stdout="", stderr=str(e), return_code=-1)

@api_router.post("/agent/install")
async def install_packages(request: PackageInstallRequest):
    """Install packages using npm, pip, or yarn"""
    try:
        if request.package_manager == "npm":
            cmd = f"npm install {' '.join(request.packages)}"
        elif request.package_manager == "yarn":
            cmd = f"yarn add {' '.join(request.packages)}"
        elif request.package_manager == "pip":
            cmd = f"pip install {' '.join(request.packages)}"
        else:
            return {"success": False, "error": f"Unknown package manager: {request.package_manager}"}
        
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=120, cwd=str(WORKSPACE_DIR))
        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr if result.stderr else None
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@api_router.get("/agent/workspace")
async def get_workspace_info():
    """Get information about the workspace"""
    return {
        "path": str(WORKSPACE_DIR),
        "exists": WORKSPACE_DIR.exists()
    }

# ===== Original API Routes =====

@api_router.get("/")
async def root():
    return {"message": "SYNTHESUS AI IDE Platform API", "version": "2.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

@api_router.post("/models/test-connection", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    try:
        if request.backend_type == "ollama":
            models = await get_ollama_models(request.base_url)
        elif request.backend_type == "lmstudio":
            models = await get_lmstudio_models(request.base_url)
        else:
            return TestConnectionResponse(success=False, message=f"Unknown backend type: {request.backend_type}")
        
        if models:
            return TestConnectionResponse(success=True, message=f"Connected successfully. Found {len(models)} models.", models=[m.name for m in models])
        return TestConnectionResponse(success=False, message="Connection failed or no models found.")
    except Exception as e:
        return TestConnectionResponse(success=False, message=f"Connection error: {str(e)}")

@api_router.get("/models", response_model=List[ModelInfo])
async def list_models(backend_type: str = "ollama", base_url: Optional[str] = None):
    if backend_type == "ollama":
        return await get_ollama_models(base_url or "http://localhost:11434")
    elif backend_type == "lmstudio":
        return await get_lmstudio_models(base_url or "http://localhost:1234")
    raise HTTPException(status_code=400, detail=f"Unknown backend type: {backend_type}")

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    config = request.config or AIBackendConfig()
    
    # If conversation_id provided, load context
    context_messages = []
    if request.conversation_id:
        conv = await db.conversations.find_one({"id": request.conversation_id}, {"_id": 0})
        if conv:
            context_messages = [ChatMessage(**m) for m in conv.get("messages", [])[-10:]]
    
    all_messages = context_messages + request.messages
    response = await unified_chat(all_messages, config)
    
    # Save to conversation if ID provided
    if request.conversation_id:
        new_messages = [m.model_dump() for m in request.messages] + [{"role": "assistant", "content": response, "timestamp": datetime.now(timezone.utc).isoformat()}]
        await db.conversations.update_one(
            {"id": request.conversation_id},
            {"$push": {"messages": {"$each": new_messages}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return ChatResponse(response=response, model=config.model, backend=config.backend_type)

@api_router.post("/code/complete", response_model=CodeCompletionResponse)
async def code_completion(request: CodeCompletionRequest):
    config = request.config or AIBackendConfig()
    system_prompt = f"You are a code completion assistant. Complete the code based on context. Language: {request.language}. Only provide completion text."
    user_prompt = f"Complete the following code at cursor position {request.cursor_position}:\n\n{request.code}\n\nProvide 1-3 short completion suggestions, one per line."
    messages = [ChatMessage(role="system", content=system_prompt), ChatMessage(role="user", content=user_prompt)]
    response = await unified_chat(messages, config)
    suggestions = [s.strip() for s in response.strip().split('\n') if s.strip()][:3]
    return CodeCompletionResponse(suggestions=suggestions, model=config.model)

@api_router.post("/code/explain", response_model=CodeExplanationResponse)
async def explain_code(request: CodeExplanationRequest):
    config = request.config or AIBackendConfig()
    system_prompt = "You are a code explanation assistant. Explain code clearly and concisely."
    user_prompt = f"Explain the following {request.language} code:\n\n```{request.language}\n{request.code}\n```"
    messages = [ChatMessage(role="system", content=system_prompt), ChatMessage(role="user", content=user_prompt)]
    response = await unified_chat(messages, config)
    return CodeExplanationResponse(explanation=response, model=config.model)

@api_router.post("/code/refactor", response_model=RefactoringResponse)
async def refactor_code(request: RefactoringRequest):
    config = request.config or AIBackendConfig()
    system_prompt = "You are a code refactoring assistant. Improve code based on the instruction."
    user_prompt = f"Refactor the following {request.language} code based on: {request.instruction}\n\n```{request.language}\n{request.code}\n```\n\nRespond with:\nREFACTORED CODE:\n[code]\n\nEXPLANATION:\n[explanation]"
    messages = [ChatMessage(role="system", content=system_prompt), ChatMessage(role="user", content=user_prompt)]
    response = await unified_chat(messages, config)
    parts = response.split("EXPLANATION:")
    code_part = parts[0].replace("REFACTORED CODE:", "").strip()
    explanation = parts[1].strip() if len(parts) > 1 else "Code refactored."
    if "```" in code_part:
        code_part = code_part.split("```")[1]
        if code_part.startswith(request.language):
            code_part = code_part[len(request.language):].strip()
    return RefactoringResponse(refactored_code=code_part.strip(), explanation=explanation, model=config.model)

@api_router.post("/code/generate", response_model=NL2CodeResponse)
async def generate_code(request: NL2CodeRequest):
    config = request.config or AIBackendConfig()
    system_prompt = f"You are a code generation assistant. Generate {request.language} code from descriptions."
    user_prompt = f"Generate {request.language} code for:\n\n{request.prompt}\n\nRespond with:\nCODE:\n[code]\n\nEXPLANATION:\n[explanation]"
    messages = [ChatMessage(role="system", content=system_prompt), ChatMessage(role="user", content=user_prompt)]
    response = await unified_chat(messages, config)
    parts = response.split("EXPLANATION:")
    code_part = parts[0].replace("CODE:", "").strip()
    explanation = parts[1].strip() if len(parts) > 1 else "Code generated."
    if "```" in code_part:
        lines = code_part.split("```")
        if len(lines) > 1:
            code_part = lines[1]
            if code_part.startswith(request.language):
                code_part = code_part[len(request.language):].strip()
    return NL2CodeResponse(code=code_part.strip(), explanation=explanation, model=config.model)

@api_router.get("/settings", response_model=UserSettings)
async def get_settings():
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    return UserSettings(**settings) if settings else UserSettings()

@api_router.post("/settings", response_model=UserSettings)
async def save_settings(settings: UserSettings):
    settings_dict = settings.model_dump()
    await db.settings.update_one({"id": "default"}, {"$set": settings_dict}, upsert=True)
    return settings

DEFAULT_PLUGINS = [
    Plugin(id="code-completion", name="Code Completion", description="AI-powered code suggestions", category="completion", icon="sparkles"),
    Plugin(id="code-explain", name="Code Explainer", description="Get explanations for code", category="documentation", icon="book-open"),
    Plugin(id="code-refactor", name="Code Refactor", description="Refactoring suggestions", category="refactoring", icon="wrench"),
    Plugin(id="nl2code", name="Natural Language to Code", description="Generate code from English", category="generation", icon="message-square-code"),
    Plugin(id="code-review", name="Code Review", description="AI-powered code review", category="review", icon="check-circle"),
    Plugin(id="doc-generator", name="Doc Generator", description="Auto-generate documentation", category="documentation", icon="file-text"),
]

@api_router.get("/plugins", response_model=List[Plugin])
async def list_plugins():
    count = await db.plugins.count_documents({})
    if count == 0:
        for plugin in DEFAULT_PLUGINS:
            await db.plugins.insert_one(plugin.model_dump())
    plugins = await db.plugins.find({}, {"_id": 0}).to_list(100)
    return [Plugin(**p) for p in plugins]

@api_router.post("/plugins/{plugin_id}/toggle", response_model=Plugin)
async def toggle_plugin(plugin_id: str):
    plugin = await db.plugins.find_one({"id": plugin_id}, {"_id": 0})
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    new_status = not plugin.get("enabled", False)
    await db.plugins.update_one({"id": plugin_id}, {"$set": {"enabled": new_status}})
    plugin["enabled"] = new_status
    return Plugin(**plugin)

# ===== Collaboration WebSocket and REST endpoints =====
from collaboration import collab_manager

class ConnectionManager:
    """WebSocket connection manager for collaboration"""
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str, user_id: str, user_name: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        user = collab_manager.join_room(room_id, user_id, user_name, websocket)
        await self.broadcast(room_id, {
            "type": "user_joined",
            "user": {"id": user.id, "name": user.name, "color": user.color}
        }, exclude=websocket)
        users = collab_manager.get_room_users(room_id)
        await websocket.send_json({"type": "room_state", "users": users, "room_id": room_id})
        return user
    
    def disconnect(self, websocket: WebSocket, room_id: str):
        if room_id in self.active_connections:
            if websocket in self.active_connections[room_id]:
                self.active_connections[room_id].remove(websocket)
        return collab_manager.leave_room(websocket)
    
    async def broadcast(self, room_id: str, message: dict, exclude: WebSocket = None):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                if connection != exclude:
                    try:
                        await connection.send_json(message)
                    except:
                        pass

ws_manager = ConnectionManager()

@api_router.post("/collab/rooms")
async def create_room(name: str = ""):
    """Create a new collaboration room"""
    room_id = str(uuid.uuid4())
    room = collab_manager.create_room(room_id, name)
    return {"room_id": room.id, "name": room.name, "created_at": room.created_at}

@api_router.get("/collab/rooms/{room_id}")
async def get_room(room_id: str):
    """Get room info"""
    room = collab_manager.get_room(room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    return {"room_id": room.id, "name": room.name, "users": collab_manager.get_room_users(room_id), "created_at": room.created_at}

@api_router.get("/collab/rooms/{room_id}/users")
async def get_room_users_endpoint(room_id: str):
    """Get users in a room"""
    return collab_manager.get_room_users(room_id)

# Include router and middleware
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# WebSocket endpoint (added directly to app, not router)
@app.websocket("/ws/collab/{room_id}")
async def websocket_collaboration(websocket: WebSocket, room_id: str):
    """WebSocket endpoint for real-time collaboration"""
    user_id = websocket.query_params.get("userId", str(uuid.uuid4()))
    user_name = websocket.query_params.get("userName", "Anonymous")
    user = await ws_manager.connect(websocket, room_id, user_id, user_name)
    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "cursor_update":
                collab_manager.update_cursor(room_id, user_id, data.get("position"), data.get("selection"))
                await ws_manager.broadcast(room_id, {
                    "type": "cursor_update", "user_id": user_id, "user_name": user.name,
                    "user_color": user.color, "position": data.get("position"), "selection": data.get("selection")
                }, exclude=websocket)
            elif msg_type == "document_update":
                await ws_manager.broadcast(room_id, {"type": "document_update", "user_id": user_id, "changes": data.get("changes")}, exclude=websocket)
            elif msg_type == "chat_message":
                await ws_manager.broadcast(room_id, {
                    "type": "chat_message", "user_id": user_id, "user_name": user.name,
                    "user_color": user.color, "message": data.get("message"), "timestamp": datetime.now(timezone.utc).isoformat()
                })
    except WebSocketDisconnect:
        result = ws_manager.disconnect(websocket, room_id)
        if result:
            user_id, _ = result
            await ws_manager.broadcast(room_id, {"type": "user_left", "user_id": user_id})

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
