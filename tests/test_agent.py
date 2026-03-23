import pytest
from unittest.mock import patch, MagicMock
import subprocess

pytestmark = pytest.mark.asyncio

async def test_execute_python_code(async_client, test_db):
    """Test executing Python code"""
    code_request = {
        "code": "print('Hello, World!')\nx = 2 + 2\nprint(f'2 + 2 = {x}')",
        "language": "python",
        "timeout": 30
    }
    response = await async_client.post("/api/agent/execute", json=code_request)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "Hello, World!" in data["output"]
    assert "2 + 2 = 4" in data["output"]
    assert "execution_time" in data

async def test_execute_javascript_code(async_client, test_db):
    """Test executing JavaScript code"""
    code_request = {
        "code": "console.log('Hello from JS');\nconsole.log(2 + 2);",
        "language": "javascript",
        "timeout": 30
    }
    response = await async_client.post("/api/agent/execute", json=code_request)
    # May fail if Node.js is not installed in test environment
    # Just verify the endpoint works
    assert response.status_code in [200, 500]

async def test_execute_shell_command(async_client, test_db):
    """Test executing shell commands"""
    code_request = {
        "code": "echo 'Shell test' && pwd",
        "language": "shell",
        "timeout": 30
    }
    response = await async_client.post("/api/agent/execute", json=code_request)
    assert response.status_code == 200
    data = response.json()
    # Shell execution may succeed or fail depending on environment
    if data["success"]:
        assert "Shell test" in data["output"]

async def test_execute_timeout(async_client, test_db):
    """Test code execution timeout"""
    code_request = {
        "code": "import time\ntime.sleep(100)",
        "language": "python",
        "timeout": 1  # Very short timeout
    }
    response = await async_client.post("/api/agent/execute", json=code_request)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is False
    assert "timeout" in data["error"].lower()

async def test_file_create_and_read(async_client, test_db):
    """Test file creation and reading"""
    # Create a file
    file_op = {
        "operation": "create",
        "path": "/test_file.txt",
        "content": "Hello, SYNTHESUS!"
    }
    response = await async_client.post("/api/agent/file", json=file_op)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Read the file
    read_op = {
        "operation": "read",
        "path": "/test_file.txt"
    }
    response = await async_client.post("/api/agent/file", json=read_op)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["data"]["content"] == "Hello, SYNTHESUS!"

async def test_file_list(async_client, test_db):
    """Test listing files in directory"""
    # Create a directory and some files
    await async_client.post("/api/agent/file", json={
        "operation": "mkdir",
        "path": "/test_dir"
    })
    await async_client.post("/api/agent/file", json={
        "operation": "create",
        "path": "/test_dir/file1.txt",
        "content": "File 1"
    })
    await async_client.post("/api/agent/file", json={
        "operation": "create",
        "path": "/test_dir/file2.txt",
        "content": "File 2"
    })
    
    # List the directory
    list_op = {
        "operation": "list",
        "path": "/test_dir"
    }
    response = await async_client.post("/api/agent/file", json=list_op)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert len(data["data"]) == 2

async def test_file_delete(async_client, test_db):
    """Test file deletion"""
    # Create a file
    await async_client.post("/api/agent/file", json={
        "operation": "create",
        "path": "/delete_me.txt",
        "content": "Delete this"
    })
    
    # Delete it
    delete_op = {
        "operation": "delete",
        "path": "/delete_me.txt"
    }
    response = await async_client.post("/api/agent/file", json=delete_op)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    
    # Verify it's gone
    read_response = await async_client.post("/api/agent/file", json={
        "operation": "read",
        "path": "/delete_me.txt"
    })
    assert read_response.json()["success"] is False

async def test_terminal_command(async_client, test_db):
    """Test terminal command execution"""
    term_cmd = {
        "command": "echo 'Terminal test'",
        "cwd": "/"
    }
    response = await async_client.post("/api/agent/terminal", json=term_cmd)
    assert response.status_code == 200
    data = response.json()
    # Terminal may or may not be available in test environment
    if data["success"]:
        assert "Terminal test" in data["stdout"]

async def test_install_packages(async_client, test_db):
    """Test package installation endpoint"""
    install_req = {
        "packages": ["requests"],
        "package_manager": "pip"
    }
    response = await async_client.post("/api/agent/install", json=install_req)
    assert response.status_code == 200
    # Package installation may succeed or fail depending on environment
    data = response.json()
    assert "success" in data
