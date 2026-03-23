import pytest
from unittest.mock import AsyncMock, patch, MagicMock

pytestmark = pytest.mark.asyncio

async def test_create_conversation(async_client, test_db):
    """Test creating a new conversation"""
    conversation_data = {
        "title": "Test Conversation",
        "messages": [],
        "tags": ["test", "api"]
    }
    response = await async_client.post("/api/memory/conversations", json=conversation_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Test Conversation"
    assert "id" in data
    assert "created_at" in data
    assert data["tags"] == ["test", "api"]

async def test_list_conversations(async_client, test_db):
    """Test listing conversations"""
    # Create a conversation first
    conv_data = {"title": "List Test", "messages": []}
    await async_client.post("/api/memory/conversations", json=conv_data)
    
    response = await async_client.get("/api/memory/conversations")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

async def test_get_conversation(async_client, test_db):
    """Test getting a specific conversation"""
    # Create a conversation
    conv_data = {
        "title": "Get Test",
        "messages": [{"role": "user", "content": "Hello"}]
    }
    create_response = await async_client.post("/api/memory/conversations", json=conv_data)
    conv_id = create_response.json()["id"]
    
    response = await async_client.get(f"/api/memory/conversations/{conv_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Get Test"
    assert len(data["messages"]) == 1

async def test_update_conversation(async_client, test_db):
    """Test updating a conversation"""
    # Create a conversation
    conv_data = {"title": "Update Test", "messages": []}
    create_response = await async_client.post("/api/memory/conversations", json=conv_data)
    conv_id = create_response.json()["id"]
    
    # Update it
    update_data = {
        "id": conv_id,
        "title": "Updated Title",
        "messages": [{"role": "user", "content": "New message"}]
    }
    response = await async_client.put(f"/api/memory/conversations/{conv_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "Updated Title"

async def test_delete_conversation(async_client, test_db):
    """Test deleting a conversation"""
    # Create a conversation
    conv_data = {"title": "Delete Test", "messages": []}
    create_response = await async_client.post("/api/memory/conversations", json=conv_data)
    conv_id = create_response.json()["id"]
    
    # Delete it
    response = await async_client.delete(f"/api/memory/conversations/{conv_id}")
    assert response.status_code == 200
    assert response.json()["success"] is True
    
    # Verify it's gone
    get_response = await async_client.get(f"/api/memory/conversations/{conv_id}")
    assert get_response.status_code == 404

async def test_search_conversations(async_client, test_db):
    """Test searching conversations"""
    # Create a conversation with searchable content
    conv_data = {
        "title": "Search Test",
        "messages": [{"role": "user", "content": "python code generator"}]
    }
    await async_client.post("/api/memory/conversations", json=conv_data)
    
    response = await async_client.get("/api/memory/search?query=python")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 1

async def test_create_collection(async_client, test_db):
    """Test creating a collection"""
    collection_data = {
        "name": "My Collection",
        "description": "Test collection",
        "icon": "folder",
        "color": "#FF007F"
    }
    response = await async_client.post("/api/memory/collections", json=collection_data)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "My Collection"
    assert "id" in data
