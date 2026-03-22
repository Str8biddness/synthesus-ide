from fastapi import FastAPI, APIRouter, HTTPException
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

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="SYNTHESUS AI IDE Platform")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ===== Models =====

class AIBackendConfig(BaseModel):
    model_config = ConfigDict(extra="ignore")
    backend_type: str = "ollama"  # "ollama" or "lmstudio"
    base_url: str = "http://localhost:11434"  # Ollama default
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
    role: str  # "user" or "assistant"
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    config: Optional[AIBackendConfig] = None

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

class ProjectFile(BaseModel):
    name: str
    path: str
    type: str  # "file" or "folder"
    children: Optional[List['ProjectFile']] = None
    content: Optional[str] = None

class SaveFileRequest(BaseModel):
    path: str
    content: str

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

# ===== AI Backend Abstraction Layer =====

async def get_ollama_models(base_url: str) -> List[ModelInfo]:
    """Fetch available models from Ollama"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/api/tags")
            if response.status_code == 200:
                data = response.json()
                return [
                    ModelInfo(
                        name=model.get("name", "unknown"),
                        size=model.get("size", ""),
                        modified_at=model.get("modified_at", ""),
                        backend="ollama"
                    )
                    for model in data.get("models", [])
                ]
    except Exception as e:
        logger.error(f"Failed to fetch Ollama models: {e}")
    return []

async def get_lmstudio_models(base_url: str) -> List[ModelInfo]:
    """Fetch available models from LM Studio"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{base_url}/v1/models")
            if response.status_code == 200:
                data = response.json()
                return [
                    ModelInfo(
                        name=model.get("id", "unknown"),
                        size=None,
                        modified_at=None,
                        backend="lmstudio"
                    )
                    for model in data.get("data", [])
                ]
    except Exception as e:
        logger.error(f"Failed to fetch LM Studio models: {e}")
    return []

async def chat_with_ollama(messages: List[ChatMessage], config: AIBackendConfig) -> str:
    """Send chat request to Ollama"""
    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            payload = {
                "model": config.model,
                "messages": [{"role": m.role, "content": m.content} for m in messages],
                "stream": False,
                "options": {
                    "temperature": config.temperature,
                    "num_predict": config.max_tokens,
                    "top_p": config.top_p
                }
            }
            response = await client.post(f"{config.base_url}/api/chat", json=payload)
            if response.status_code == 200:
                data = response.json()
                return data.get("message", {}).get("content", "")
            else:
                logger.error(f"Ollama error: {response.text}")
                raise HTTPException(status_code=500, detail=f"Ollama error: {response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to Ollama timed out")
    except Exception as e:
        logger.error(f"Ollama chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def chat_with_lmstudio(messages: List[ChatMessage], config: AIBackendConfig) -> str:
    """Send chat request to LM Studio (OpenAI-compatible API)"""
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
                data = response.json()
                return data.get("choices", [{}])[0].get("message", {}).get("content", "")
            else:
                logger.error(f"LM Studio error: {response.text}")
                raise HTTPException(status_code=500, detail=f"LM Studio error: {response.text}")
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request to LM Studio timed out")
    except Exception as e:
        logger.error(f"LM Studio chat error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

async def unified_chat(messages: List[ChatMessage], config: AIBackendConfig) -> str:
    """Unified chat function that routes to the appropriate backend"""
    if config.backend_type == "ollama":
        return await chat_with_ollama(messages, config)
    elif config.backend_type == "lmstudio":
        return await chat_with_lmstudio(messages, config)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown backend type: {config.backend_type}")

# ===== API Routes =====

@api_router.get("/")
async def root():
    return {"message": "SYNTHESUS AI IDE Platform API", "version": "1.0.0"}

@api_router.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}

# ----- Model Management -----

@api_router.post("/models/test-connection", response_model=TestConnectionResponse)
async def test_connection(request: TestConnectionRequest):
    """Test connection to AI backend and list available models"""
    try:
        if request.backend_type == "ollama":
            models = await get_ollama_models(request.base_url)
        elif request.backend_type == "lmstudio":
            models = await get_lmstudio_models(request.base_url)
        else:
            return TestConnectionResponse(
                success=False,
                message=f"Unknown backend type: {request.backend_type}"
            )
        
        if models:
            return TestConnectionResponse(
                success=True,
                message=f"Connected successfully. Found {len(models)} models.",
                models=[m.name for m in models]
            )
        else:
            return TestConnectionResponse(
                success=False,
                message="Connection failed or no models found. Make sure the backend is running."
            )
    except Exception as e:
        return TestConnectionResponse(
            success=False,
            message=f"Connection error: {str(e)}"
        )

@api_router.get("/models", response_model=List[ModelInfo])
async def list_models(backend_type: str = "ollama", base_url: Optional[str] = None):
    """List available models from the specified backend"""
    if backend_type == "ollama":
        url = base_url or "http://localhost:11434"
        return await get_ollama_models(url)
    elif backend_type == "lmstudio":
        url = base_url or "http://localhost:1234"
        return await get_lmstudio_models(url)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown backend type: {backend_type}")

# ----- Chat & AI Features -----

@api_router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """Send a chat message to the AI backend"""
    config = request.config or AIBackendConfig()
    response = await unified_chat(request.messages, config)
    return ChatResponse(
        response=response,
        model=config.model,
        backend=config.backend_type
    )

@api_router.post("/code/complete", response_model=CodeCompletionResponse)
async def code_completion(request: CodeCompletionRequest):
    """Get code completion suggestions"""
    config = request.config or AIBackendConfig()
    
    system_prompt = f"""You are a code completion assistant. Complete the code based on the context provided.
Language: {request.language}
Only provide the completion text, nothing else. Be concise and precise."""
    
    user_prompt = f"""Complete the following code at cursor position {request.cursor_position}:

{request.code}

Provide 1-3 short completion suggestions, one per line."""
    
    messages = [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_prompt)
    ]
    
    response = await unified_chat(messages, config)
    suggestions = [s.strip() for s in response.strip().split('\n') if s.strip()][:3]
    
    return CodeCompletionResponse(suggestions=suggestions, model=config.model)

@api_router.post("/code/explain", response_model=CodeExplanationResponse)
async def explain_code(request: CodeExplanationRequest):
    """Get explanation for code"""
    config = request.config or AIBackendConfig()
    
    system_prompt = """You are a code explanation assistant. Explain code clearly and concisely.
Focus on what the code does, key concepts, and any important patterns used."""
    
    user_prompt = f"""Explain the following {request.language} code:

```{request.language}
{request.code}
```"""
    
    messages = [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_prompt)
    ]
    
    response = await unified_chat(messages, config)
    return CodeExplanationResponse(explanation=response, model=config.model)

@api_router.post("/code/refactor", response_model=RefactoringResponse)
async def refactor_code(request: RefactoringRequest):
    """Get refactoring suggestions for code"""
    config = request.config or AIBackendConfig()
    
    system_prompt = """You are a code refactoring assistant. Improve code based on the instruction provided.
Provide the refactored code followed by a brief explanation of changes."""
    
    user_prompt = f"""Refactor the following {request.language} code based on this instruction: {request.instruction}

```{request.language}
{request.code}
```

Respond with:
REFACTORED CODE:
[your refactored code here]

EXPLANATION:
[brief explanation of changes]"""
    
    messages = [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_prompt)
    ]
    
    response = await unified_chat(messages, config)
    
    # Parse response
    parts = response.split("EXPLANATION:")
    code_part = parts[0].replace("REFACTORED CODE:", "").strip()
    explanation = parts[1].strip() if len(parts) > 1 else "Code refactored as requested."
    
    # Clean code from markdown
    if "```" in code_part:
        code_part = code_part.split("```")[1]
        if code_part.startswith(request.language):
            code_part = code_part[len(request.language):].strip()
    
    return RefactoringResponse(
        refactored_code=code_part.strip(),
        explanation=explanation,
        model=config.model
    )

@api_router.post("/code/generate", response_model=NL2CodeResponse)
async def generate_code(request: NL2CodeRequest):
    """Generate code from natural language description"""
    config = request.config or AIBackendConfig()
    
    system_prompt = f"""You are a code generation assistant. Generate {request.language} code based on natural language descriptions.
Provide clean, working code with brief comments."""
    
    user_prompt = f"""Generate {request.language} code for the following:

{request.prompt}

Respond with:
CODE:
[your generated code here]

EXPLANATION:
[brief explanation of what the code does]"""
    
    messages = [
        ChatMessage(role="system", content=system_prompt),
        ChatMessage(role="user", content=user_prompt)
    ]
    
    response = await unified_chat(messages, config)
    
    # Parse response
    parts = response.split("EXPLANATION:")
    code_part = parts[0].replace("CODE:", "").strip()
    explanation = parts[1].strip() if len(parts) > 1 else "Code generated as requested."
    
    # Clean code from markdown
    if "```" in code_part:
        code_lines = code_part.split("```")
        if len(code_lines) > 1:
            code_part = code_lines[1]
            if code_part.startswith(request.language):
                code_part = code_part[len(request.language):].strip()
    
    return NL2CodeResponse(
        code=code_part.strip(),
        explanation=explanation,
        model=config.model
    )

# ----- Settings -----

@api_router.get("/settings", response_model=UserSettings)
async def get_settings():
    """Get user settings"""
    settings = await db.settings.find_one({"id": "default"}, {"_id": 0})
    if settings:
        return UserSettings(**settings)
    return UserSettings()

@api_router.post("/settings", response_model=UserSettings)
async def save_settings(settings: UserSettings):
    """Save user settings"""
    settings_dict = settings.model_dump()
    await db.settings.update_one(
        {"id": "default"},
        {"$set": settings_dict},
        upsert=True
    )
    return settings

# ----- Plugins -----

DEFAULT_PLUGINS = [
    Plugin(id="code-completion", name="Code Completion", description="AI-powered code suggestions as you type", category="completion", icon="sparkles"),
    Plugin(id="code-explain", name="Code Explainer", description="Get explanations for selected code", category="documentation", icon="book-open"),
    Plugin(id="code-refactor", name="Code Refactor", description="Refactoring suggestions and improvements", category="refactoring", icon="wrench"),
    Plugin(id="nl2code", name="Natural Language to Code", description="Generate code from plain English", category="generation", icon="message-square-code"),
    Plugin(id="code-review", name="Code Review", description="AI-powered code review and suggestions", category="review", icon="check-circle"),
    Plugin(id="doc-generator", name="Documentation Generator", description="Auto-generate documentation for functions and classes", category="documentation", icon="file-text"),
]

@api_router.get("/plugins", response_model=List[Plugin])
async def list_plugins():
    """List available plugins"""
    # Check if plugins exist in DB, if not seed them
    count = await db.plugins.count_documents({})
    if count == 0:
        for plugin in DEFAULT_PLUGINS:
            await db.plugins.insert_one(plugin.model_dump())
    
    plugins = await db.plugins.find({}, {"_id": 0}).to_list(100)
    return [Plugin(**p) for p in plugins]

@api_router.post("/plugins/{plugin_id}/toggle", response_model=Plugin)
async def toggle_plugin(plugin_id: str):
    """Toggle plugin enabled status"""
    plugin = await db.plugins.find_one({"id": plugin_id}, {"_id": 0})
    if not plugin:
        raise HTTPException(status_code=404, detail="Plugin not found")
    
    new_status = not plugin.get("enabled", False)
    await db.plugins.update_one(
        {"id": plugin_id},
        {"$set": {"enabled": new_status}}
    )
    
    plugin["enabled"] = new_status
    return Plugin(**plugin)

# ----- Conversation History -----

class Conversation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    messages: List[ChatMessage]
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

@api_router.get("/conversations", response_model=List[Conversation])
async def list_conversations():
    """List all conversations"""
    convos = await db.conversations.find({}, {"_id": 0}).sort("updated_at", -1).to_list(100)
    return [Conversation(**c) for c in convos]

@api_router.post("/conversations", response_model=Conversation)
async def create_conversation(conversation: Conversation):
    """Create a new conversation"""
    conv_dict = conversation.model_dump()
    await db.conversations.insert_one(conv_dict)
    return conversation

@api_router.put("/conversations/{conv_id}", response_model=Conversation)
async def update_conversation(conv_id: str, conversation: Conversation):
    """Update a conversation"""
    conv_dict = conversation.model_dump()
    conv_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.conversations.update_one(
        {"id": conv_id},
        {"$set": conv_dict}
    )
    return Conversation(**conv_dict)

@api_router.delete("/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    """Delete a conversation"""
    result = await db.conversations.delete_one({"id": conv_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"success": True}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
