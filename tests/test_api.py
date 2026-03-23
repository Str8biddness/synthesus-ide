import pytest
import pytest_asyncio

pytestmark = pytest.mark.asyncio

async def test_root_endpoint(async_client):
    """Test the root API endpoint"""
    response = await async_client.get("/api/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "SYNTHESUS" in data["message"]
    assert "version" in data

async def test_health_endpoint(async_client):
    """Test the health check endpoint"""
    response = await async_client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "timestamp" in data

async def test_get_settings(async_client, test_db):
    """Test getting default settings"""
    response = await async_client.get("/api/settings")
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "ai_config" in data
    assert data["ai_config"]["backend_type"] == "ollama"

async def test_save_settings(async_client, test_db):
    """Test saving settings"""
    settings_data = {
        "id": "default",
        "ai_config": {
            "backend_type": "lmstudio",
            "base_url": "http://localhost:1234",
            "model": "codellama",
            "temperature": 0.5,
            "max_tokens": 1024,
            "top_p": 0.95
        },
        "theme": "synthesus",
        "font_size": 16,
        "tab_size": 2,
        "auto_save": False,
        "plugins": ["code-completion"]
    }
    response = await async_client.post("/api/settings", json=settings_data)
    assert response.status_code == 200
    data = response.json()
    assert data["ai_config"]["backend_type"] == "lmstudio"
    assert data["font_size"] == 16
