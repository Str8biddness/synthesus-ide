import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from server import app
import asyncio

@pytest.fixture
def anyio_backend():
    return "asyncio"

@pytest_asyncio.fixture
async def async_client():
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client

@pytest_asyncio.fixture
async def test_db():
    # Setup test database
    from server import db
    # Clean up before each test
    await db.conversations.delete_many({})
    await db.collections.delete_many({})
    await db.settings.delete_many({})
    yield db
    # Cleanup after test
    await db.conversations.delete_many({})
    await db.collections.delete_many({})
    await db.settings.delete_many({})
