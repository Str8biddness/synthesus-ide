"""
SYNTHESUS Collaboration Server
Real-time collaborative editing using WebSockets and Y.js protocol
"""
import asyncio
import json
import logging
from typing import Dict, Set, Optional
from dataclasses import dataclass, field
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

@dataclass
class User:
    id: str
    name: str
    color: str
    cursor_position: Optional[Dict] = None
    selection: Optional[Dict] = None
    connected_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

@dataclass 
class Room:
    id: str
    name: str
    users: Dict[str, User] = field(default_factory=dict)
    document_content: str = ""
    created_at: str = field(default_factory=lambda: datetime.utcnow().isoformat())

class CollaborationManager:
    """Manages collaboration rooms and real-time sync"""
    
    def __init__(self):
        self.rooms: Dict[str, Room] = {}
        self.user_connections: Dict[str, Set] = {}  # user_id -> set of websockets
        self.websocket_to_user: Dict[int, str] = {}  # ws id -> user_id
        self.websocket_to_room: Dict[int, str] = {}  # ws id -> room_id
        
        # User colors for cursor display
        self.colors = [
            "#FF007F", "#FFD700", "#00FF88", "#00D4FF", 
            "#FF6B00", "#A855F7", "#EF4444", "#10B981"
        ]
        self.color_index = 0
    
    def get_next_color(self) -> str:
        color = self.colors[self.color_index % len(self.colors)]
        self.color_index += 1
        return color
    
    def create_room(self, room_id: str, name: str = "") -> Room:
        """Create a new collaboration room"""
        if room_id not in self.rooms:
            self.rooms[room_id] = Room(
                id=room_id,
                name=name or f"Room {room_id[:8]}"
            )
        return self.rooms[room_id]
    
    def get_room(self, room_id: str) -> Optional[Room]:
        """Get an existing room"""
        return self.rooms.get(room_id)
    
    def join_room(self, room_id: str, user_id: str, user_name: str, websocket) -> User:
        """Add a user to a room"""
        room = self.create_room(room_id)
        
        # Create user if not exists
        if user_id not in room.users:
            room.users[user_id] = User(
                id=user_id,
                name=user_name,
                color=self.get_next_color()
            )
        
        # Track websocket connection
        ws_id = id(websocket)
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(websocket)
        self.websocket_to_user[ws_id] = user_id
        self.websocket_to_room[ws_id] = room_id
        
        return room.users[user_id]
    
    def leave_room(self, websocket) -> Optional[tuple]:
        """Remove a user's websocket from a room"""
        ws_id = id(websocket)
        
        user_id = self.websocket_to_user.pop(ws_id, None)
        room_id = self.websocket_to_room.pop(ws_id, None)
        
        if user_id and user_id in self.user_connections:
            self.user_connections[user_id].discard(websocket)
            
            # If no more connections, remove user from room
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                if room_id and room_id in self.rooms:
                    self.rooms[room_id].users.pop(user_id, None)
        
        return (user_id, room_id) if user_id and room_id else None
    
    def update_cursor(self, room_id: str, user_id: str, position: Dict, selection: Dict = None):
        """Update user's cursor position"""
        room = self.rooms.get(room_id)
        if room and user_id in room.users:
            room.users[user_id].cursor_position = position
            room.users[user_id].selection = selection
    
    def get_room_users(self, room_id: str) -> list:
        """Get all users in a room"""
        room = self.rooms.get(room_id)
        if room:
            return [
                {
                    "id": u.id,
                    "name": u.name,
                    "color": u.color,
                    "cursor": u.cursor_position,
                    "selection": u.selection
                }
                for u in room.users.values()
            ]
        return []
    
    async def broadcast_to_room(self, room_id: str, message: dict, exclude_ws=None):
        """Broadcast a message to all users in a room"""
        room = self.rooms.get(room_id)
        if not room:
            return
        
        exclude_id = id(exclude_ws) if exclude_ws else None
        
        for user_id in room.users:
            if user_id in self.user_connections:
                for ws in self.user_connections[user_id]:
                    if id(ws) != exclude_id:
                        try:
                            await ws.send_json(message)
                        except Exception as e:
                            logger.error(f"Failed to send to user {user_id}: {e}")

# Global collaboration manager instance
collab_manager = CollaborationManager()
