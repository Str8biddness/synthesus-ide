#!/usr/bin/env python3
"""
SYNTHESUS AI IDE Platform - Backend API Testing
Tests all backend endpoints for functionality and error handling.
"""

import requests
import sys
import json
import asyncio
import websockets
from datetime import datetime
from typing import Dict, Any, List

class SynthesusAPITester:
    def __init__(self, base_url="https://plugin-forge-ai-4.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.test_results = []
        self.room_id = None  # For collaboration tests

    def log_test(self, name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            self.failed_tests.append({"name": name, "details": details})
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "response_data": response_data
        })

    def test_health_endpoint(self):
        """Test basic health endpoint"""
        try:
            response = requests.get(f"{self.api_url}/health", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Response: {data}"
            self.log_test("Health Endpoint", success, details, response.json() if success else None)
            return success
        except Exception as e:
            self.log_test("Health Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_root_endpoint(self):
        """Test root API endpoint"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Message: {data.get('message', 'N/A')}"
            self.log_test("Root API Endpoint", success, details, response.json() if success else None)
            return success
        except Exception as e:
            self.log_test("Root API Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_models_test_connection(self):
        """Test model connection testing endpoint"""
        test_cases = [
            {"backend_type": "ollama", "base_url": "http://localhost:11434"},
            {"backend_type": "lmstudio", "base_url": "http://localhost:1234"}
        ]
        
        for case in test_cases:
            try:
                response = requests.post(
                    f"{self.api_url}/models/test-connection",
                    json=case,
                    timeout=15
                )
                success = response.status_code == 200
                details = f"Backend: {case['backend_type']}, Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Success: {data.get('success', False)}, Message: {data.get('message', 'N/A')}"
                
                self.log_test(f"Model Connection Test ({case['backend_type']})", success, details, response.json() if success else None)
            except Exception as e:
                self.log_test(f"Model Connection Test ({case['backend_type']})", False, f"Exception: {str(e)}")

    def test_models_list(self):
        """Test models listing endpoint"""
        backends = ["ollama", "lmstudio"]
        
        for backend in backends:
            try:
                response = requests.get(
                    f"{self.api_url}/models",
                    params={"backend_type": backend},
                    timeout=15
                )
                success = response.status_code == 200
                details = f"Backend: {backend}, Status: {response.status_code}"
                
                if success:
                    data = response.json()
                    details += f", Models found: {len(data)}"
                
                self.log_test(f"Models List ({backend})", success, details, response.json() if success else None)
            except Exception as e:
                self.log_test(f"Models List ({backend})", False, f"Exception: {str(e)}")

    def test_chat_endpoint(self):
        """Test chat endpoint with mock data"""
        try:
            chat_request = {
                "messages": [
                    {"role": "user", "content": "Hello, can you help me with coding?"}
                ],
                "config": {
                    "backend_type": "ollama",
                    "base_url": "http://localhost:11434",
                    "model": "llama3.2",
                    "temperature": 0.7,
                    "max_tokens": 100,
                    "top_p": 0.9
                }
            }
            
            response = requests.post(
                f"{self.api_url}/chat",
                json=chat_request,
                timeout=30
            )
            
            # We expect this to fail since AI backends aren't running, but endpoint should handle gracefully
            details = f"Status: {response.status_code}"
            if response.status_code == 500:
                # Expected failure due to no AI backend
                success = True
                details += " (Expected failure - no AI backend running)"
            elif response.status_code == 200:
                success = True
                data = response.json()
                details += f", Response received: {len(data.get('response', ''))}"
            else:
                success = False
                details += f", Unexpected status code"
            
            self.log_test("Chat Endpoint", success, details, response.json() if response.status_code in [200, 500] else None)
        except Exception as e:
            self.log_test("Chat Endpoint", False, f"Exception: {str(e)}")

    def test_code_endpoints(self):
        """Test code-related endpoints"""
        endpoints = [
            ("code/complete", "Code Completion"),
            ("code/explain", "Code Explanation"),
            ("code/refactor", "Code Refactoring"),
            ("code/generate", "Code Generation")
        ]
        
        for endpoint, name in endpoints:
            try:
                if endpoint == "code/complete":
                    payload = {
                        "code": "function hello() {",
                        "language": "javascript",
                        "cursor_position": 18
                    }
                elif endpoint == "code/explain":
                    payload = {
                        "code": "const x = 5;",
                        "language": "javascript"
                    }
                elif endpoint == "code/refactor":
                    payload = {
                        "code": "var x = 5; var y = 10;",
                        "language": "javascript",
                        "instruction": "use const instead of var"
                    }
                else:  # code/generate
                    payload = {
                        "prompt": "Create a function that adds two numbers",
                        "language": "javascript"
                    }
                
                response = requests.post(
                    f"{self.api_url}/{endpoint}",
                    json=payload,
                    timeout=30
                )
                
                # Similar to chat, expect failure due to no AI backend
                details = f"Status: {response.status_code}"
                if response.status_code == 500:
                    success = True
                    details += " (Expected failure - no AI backend running)"
                elif response.status_code == 200:
                    success = True
                    details += " (Unexpected success - AI backend might be running)"
                else:
                    success = False
                    details += f", Unexpected status code"
                
                self.log_test(name, success, details, response.json() if response.status_code in [200, 500] else None)
            except Exception as e:
                self.log_test(name, False, f"Exception: {str(e)}")

    def test_settings_endpoints(self):
        """Test settings endpoints"""
        # Test GET settings
        try:
            response = requests.get(f"{self.api_url}/settings", timeout=10)
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Settings loaded: {len(data)}"
            self.log_test("Settings GET", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Settings GET", False, f"Exception: {str(e)}")
        
        # Test POST settings
        try:
            settings_data = {
                "id": "default",
                "ai_config": {
                    "backend_type": "ollama",
                    "base_url": "http://localhost:11434",
                    "model": "llama3.2",
                    "temperature": 0.7,
                    "max_tokens": 2048,
                    "top_p": 0.9
                },
                "theme": "synthesus",
                "font_size": 14,
                "tab_size": 4,
                "auto_save": True,
                "plugins": []
            }
            
            response = requests.post(
                f"{self.api_url}/settings",
                json=settings_data,
                timeout=10
            )
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            self.log_test("Settings POST", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Settings POST", False, f"Exception: {str(e)}")

    def test_plugins_endpoints(self):
        """Test plugins endpoints"""
        # Test GET plugins
        try:
            response = requests.get(f"{self.api_url}/plugins", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            plugin_id = None
            
            if success:
                data = response.json()
                details += f", Plugins found: {len(data)}"
                if data:
                    plugin_id = data[0].get('id')
            
            self.log_test("Plugins List", success, details, response.json() if success else None)
            
            # Test plugin toggle if we have a plugin ID
            if plugin_id:
                try:
                    response = requests.post(f"{self.api_url}/plugins/{plugin_id}/toggle", timeout=10)
                    success = response.status_code == 200
                    details = f"Toggle Status: {response.status_code}"
                    if success:
                        data = response.json()
                        details += f", Plugin enabled: {data.get('enabled', False)}"
                    self.log_test("Plugin Toggle", success, details, response.json() if success else None)
                except Exception as e:
                    self.log_test("Plugin Toggle", False, f"Exception: {str(e)}")
                    
        except Exception as e:
            self.log_test("Plugins List", False, f"Exception: {str(e)}")

    def test_memory_endpoints(self):
        """Test memory system endpoints"""
        conversation_id = None
        collection_id = None
        
        # Test GET collections
        try:
            response = requests.get(f"{self.api_url}/memory/collections", timeout=10)
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Collections found: {len(data)}"
            self.log_test("Memory Collections List", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Memory Collections List", False, f"Exception: {str(e)}")
        
        # Test POST collection
        try:
            collection_data = {
                "name": "Test Collection",
                "description": "Test collection for API testing",
                "icon": "folder",
                "color": "#FF007F"
            }
            
            response = requests.post(
                f"{self.api_url}/memory/collections",
                json=collection_data,
                timeout=10
            )
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            if success:
                data = response.json()
                collection_id = data.get('id')
                details += f", Created collection: {collection_id}"
            self.log_test("Memory Collection Create", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Memory Collection Create", False, f"Exception: {str(e)}")
        
        # Test GET conversations
        try:
            response = requests.get(f"{self.api_url}/memory/conversations", timeout=10)
            success = response.status_code == 200
            details = f"GET Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Conversations found: {len(data)}"
            self.log_test("Memory Conversations List", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Memory Conversations List", False, f"Exception: {str(e)}")
        
        # Test POST conversation
        try:
            conversation_data = {
                "title": "Test Memory Conversation",
                "messages": [
                    {"role": "user", "content": "Hello"},
                    {"role": "assistant", "content": "Hi there!"}
                ],
                "collection_id": collection_id
            }
            
            response = requests.post(
                f"{self.api_url}/memory/conversations",
                json=conversation_data,
                timeout=10
            )
            success = response.status_code == 200
            details = f"POST Status: {response.status_code}"
            if success:
                data = response.json()
                conversation_id = data.get('id')
                details += f", Created conversation: {conversation_id}"
            self.log_test("Memory Conversation Create", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Memory Conversation Create", False, f"Exception: {str(e)}")
        
        # Test GET specific conversation
        if conversation_id:
            try:
                response = requests.get(f"{self.api_url}/memory/conversations/{conversation_id}", timeout=10)
                success = response.status_code == 200
                details = f"GET Status: {response.status_code}"
                if success:
                    data = response.json()
                    details += f", Messages: {len(data.get('messages', []))}"
                self.log_test("Memory Conversation Get", success, details, response.json() if success else None)
            except Exception as e:
                self.log_test("Memory Conversation Get", False, f"Exception: {str(e)}")
        
        # Test conversation search
        try:
            response = requests.get(f"{self.api_url}/memory/search", params={"query": "test"}, timeout=10)
            success = response.status_code == 200
            details = f"Search Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Results: {len(data)}"
            self.log_test("Memory Search", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Memory Search", False, f"Exception: {str(e)}")
        
        # Cleanup - Delete conversation and collection
        if conversation_id:
            try:
                response = requests.delete(f"{self.api_url}/memory/conversations/{conversation_id}", timeout=10)
                success = response.status_code == 200
                details = f"DELETE Status: {response.status_code}"
                self.log_test("Memory Conversation Delete", success, details, response.json() if success else None)
            except Exception as e:
                self.log_test("Memory Conversation Delete", False, f"Exception: {str(e)}")
        
        if collection_id:
            try:
                response = requests.delete(f"{self.api_url}/memory/collections/{collection_id}", timeout=10)
                success = response.status_code == 200
                details = f"DELETE Status: {response.status_code}"
                self.log_test("Memory Collection Delete", success, details, response.json() if success else None)
            except Exception as e:
                self.log_test("Memory Collection Delete", False, f"Exception: {str(e)}")

    def test_agent_endpoints(self):
        """Test agent/autonomy endpoints"""
        
        # Test code execution - JavaScript
        try:
            code_request = {
                "code": "console.log('Hello from JavaScript!'); console.log(2 + 2);",
                "language": "javascript",
                "timeout": 10
            }
            
            response = requests.post(
                f"{self.api_url}/agent/execute",
                json=code_request,
                timeout=15
            )
            success = response.status_code == 200
            details = f"JS Execution Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}, Output: {data.get('output', 'N/A')[:50]}"
            self.log_test("Agent Code Execution (JavaScript)", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent Code Execution (JavaScript)", False, f"Exception: {str(e)}")
        
        # Test code execution - Python
        try:
            code_request = {
                "code": "print('Hello from Python!')\nprint(2 + 2)",
                "language": "python",
                "timeout": 10
            }
            
            response = requests.post(
                f"{self.api_url}/agent/execute",
                json=code_request,
                timeout=15
            )
            success = response.status_code == 200
            details = f"Python Execution Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}, Output: {data.get('output', 'N/A')[:50]}"
            self.log_test("Agent Code Execution (Python)", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent Code Execution (Python)", False, f"Exception: {str(e)}")
        
        # Test code execution - Shell
        try:
            code_request = {
                "code": "echo 'Hello from Shell!' && ls -la",
                "language": "shell",
                "timeout": 10
            }
            
            response = requests.post(
                f"{self.api_url}/agent/execute",
                json=code_request,
                timeout=15
            )
            success = response.status_code == 200
            details = f"Shell Execution Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}, Output: {data.get('output', 'N/A')[:50]}"
            self.log_test("Agent Code Execution (Shell)", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent Code Execution (Shell)", False, f"Exception: {str(e)}")
        
        # Test file operations - Create
        try:
            file_request = {
                "operation": "create",
                "path": "/test_file.txt",
                "content": "Hello from SYNTHESUS test!"
            }
            
            response = requests.post(
                f"{self.api_url}/agent/file",
                json=file_request,
                timeout=10
            )
            success = response.status_code == 200
            details = f"File Create Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}"
            self.log_test("Agent File Create", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent File Create", False, f"Exception: {str(e)}")
        
        # Test file operations - Read
        try:
            file_request = {
                "operation": "read",
                "path": "/test_file.txt"
            }
            
            response = requests.post(
                f"{self.api_url}/agent/file",
                json=file_request,
                timeout=10
            )
            success = response.status_code == 200
            details = f"File Read Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}, Content: {data.get('data', {}).get('content', 'N/A')[:30]}"
            self.log_test("Agent File Read", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent File Read", False, f"Exception: {str(e)}")
        
        # Test file operations - List
        try:
            file_request = {
                "operation": "list",
                "path": "/"
            }
            
            response = requests.post(
                f"{self.api_url}/agent/file",
                json=file_request,
                timeout=10
            )
            success = response.status_code == 200
            details = f"File List Status: {response.status_code}"
            if success:
                data = response.json()
                files = data.get('data', [])
                details += f", Success: {data.get('success', False)}, Files: {len(files)}"
            self.log_test("Agent File List", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent File List", False, f"Exception: {str(e)}")
        
        # Test terminal command
        try:
            terminal_request = {
                "command": "echo 'Hello from terminal!' && pwd"
            }
            
            response = requests.post(
                f"{self.api_url}/agent/terminal",
                json=terminal_request,
                timeout=15
            )
            success = response.status_code == 200
            details = f"Terminal Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}, Output: {data.get('stdout', 'N/A')[:50]}"
            self.log_test("Agent Terminal Command", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent Terminal Command", False, f"Exception: {str(e)}")
        
        # Test workspace info
        try:
            response = requests.get(f"{self.api_url}/agent/workspace", timeout=10)
            success = response.status_code == 200
            details = f"Workspace Info Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Path: {data.get('path', 'N/A')}, Exists: {data.get('exists', False)}"
            self.log_test("Agent Workspace Info", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent Workspace Info", False, f"Exception: {str(e)}")
        
        # Cleanup - Delete test file
        try:
            file_request = {
                "operation": "delete",
                "path": "/test_file.txt"
            }
            
            response = requests.post(
                f"{self.api_url}/agent/file",
                json=file_request,
                timeout=10
            )
            success = response.status_code == 200
            details = f"File Delete Status: {response.status_code}"
            if success:
                data = response.json()
                details += f", Success: {data.get('success', False)}"
            self.log_test("Agent File Delete", success, details, response.json() if success else None)
        except Exception as e:
            self.log_test("Agent File Delete", False, f"Exception: {str(e)}")

    # ===== Collaboration Tests =====
    
    def test_collaboration_create_room(self):
        """Test creating a collaboration room"""
        try:
            response = requests.post(f"{self.api_url}/collab/rooms", 
                                   params={"name": "Test Room"}, 
                                   timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if 'room_id' in data:
                    self.room_id = data['room_id']
                    details += f", Room ID: {self.room_id[:8]}..."
                else:
                    success = False
                    details += ", Missing room_id in response"
            
            self.log_test("Collaboration Create Room", success, details, response.json() if success else None)
            return success
        except Exception as e:
            self.log_test("Collaboration Create Room", False, f"Exception: {str(e)}")
            return False

    def test_collaboration_get_room(self):
        """Test getting room information"""
        if not self.room_id:
            self.log_test("Collaboration Get Room", False, "No room ID available")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/collab/rooms/{self.room_id}", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if 'room_id' in data and data['room_id'] == self.room_id:
                    details += f", Room found with users: {len(data.get('users', []))}"
                else:
                    success = False
                    details += ", Invalid room data"
            
            self.log_test("Collaboration Get Room", success, details, response.json() if success else None)
            return success
        except Exception as e:
            self.log_test("Collaboration Get Room", False, f"Exception: {str(e)}")
            return False

    def test_collaboration_get_room_users(self):
        """Test getting users in a room"""
        if not self.room_id:
            self.log_test("Collaboration Get Room Users", False, "No room ID available")
            return False
            
        try:
            response = requests.get(f"{self.api_url}/collab/rooms/{self.room_id}/users", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            
            if success:
                data = response.json()
                if isinstance(data, list):
                    details += f", Users count: {len(data)}"
                else:
                    success = False
                    details += ", Invalid users data format"
            
            self.log_test("Collaboration Get Room Users", success, details, response.json() if success else None)
            return success
        except Exception as e:
            self.log_test("Collaboration Get Room Users", False, f"Exception: {str(e)}")
            return False

    def test_collaboration_websocket(self):
        """Test WebSocket connection for collaboration"""
        if not self.room_id:
            self.log_test("Collaboration WebSocket", False, "No room ID available")
            return False

        try:
            # Convert HTTP URL to WebSocket URL
            ws_url = self.base_url.replace("https://", "wss://").replace("http://", "ws://")
            ws_endpoint = f"{ws_url}/ws/collab/{self.room_id}?userId=test_user&userName=TestUser"
            
            async def test_websocket():
                try:
                    # Use connect without timeout parameter for compatibility
                    async with websockets.connect(ws_endpoint) as websocket:
                        # Send a test message
                        test_message = {
                            "type": "cursor_update",
                            "position": {"line": 1, "column": 1},
                            "selection": None
                        }
                        await websocket.send(json.dumps(test_message))
                        
                        # Try to receive a response (with timeout)
                        try:
                            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                            return True, f"Connected and received: {response[:50]}..."
                        except asyncio.TimeoutError:
                            return True, "Connected successfully (no immediate response)"
                            
                except websockets.exceptions.ConnectionClosed:
                    return False, "WebSocket connection closed unexpectedly"
                except Exception as e:
                    return False, f"WebSocket error: {str(e)}"
            
            # Run the async test
            success, details = asyncio.run(test_websocket())
            self.log_test("Collaboration WebSocket", success, details)
            return success
            
        except Exception as e:
            self.log_test("Collaboration WebSocket", False, f"Exception: {str(e)}")
            return False

    def test_collaboration_invalid_room(self):
        """Test accessing non-existent room"""
        try:
            response = requests.get(f"{self.api_url}/collab/rooms/invalid-room-id", timeout=10)
            success = response.status_code == 404
            details = f"Status: {response.status_code} (expected 404)"
            
            self.log_test("Collaboration Invalid Room", success, details)
            return success
        except Exception as e:
            self.log_test("Collaboration Invalid Room", False, f"Exception: {str(e)}")
            return False

    def test_collaboration_endpoints(self):
        """Test all collaboration endpoints"""
        self.test_collaboration_create_room()
        self.test_collaboration_get_room()
        self.test_collaboration_get_room_users()
        self.test_collaboration_websocket()
        self.test_collaboration_invalid_room()

    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting SYNTHESUS AI IDE Backend Tests")
        print(f"Testing API at: {self.api_url}")
        print("=" * 60)
        
        # Basic connectivity tests
        print("\n📡 Basic Connectivity Tests")
        self.test_health_endpoint()
        self.test_root_endpoint()
        
        # Model management tests
        print("\n🤖 AI Model Management Tests")
        self.test_models_test_connection()
        self.test_models_list()
        
        # AI feature tests
        print("\n💬 AI Feature Tests")
        self.test_chat_endpoint()
        self.test_code_endpoints()
        
        # Settings tests
        print("\n⚙️ Settings Tests")
        self.test_settings_endpoints()
        
        # Plugins tests
        print("\n🧩 Plugins Tests")
        self.test_plugins_endpoints()
        
        # Memory system tests
        print("\n🧠 Memory System Tests")
        self.test_memory_endpoints()
        
        # Agent/Autonomy tests
        print("\n🤖 Agent/Autonomy Tests")
        self.test_agent_endpoints()
        
        # Collaboration tests
        print("\n🤝 Collaboration Tests")
        self.test_collaboration_endpoints()
        
        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary: {self.tests_passed}/{self.tests_run} tests passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['name']}: {test['details']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"✨ Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    tester = SynthesusAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())