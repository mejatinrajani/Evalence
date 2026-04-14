"""
WebSocket Manager - Handle WebSocket connections and broadcasting
"""
import json
import logging
from typing import Dict, List, Set
from datetime import datetime
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class WebSocketManager:
    """Manager for WebSocket connections and broadcasting"""

    def __init__(self):
        # {user_id: [websockets]}
        self.active_connections: Dict[int, List[WebSocket]] = {}
        # {hackathon_id: [user_ids]}
        self.hackathon_subscribers: Dict[int, Set[int]] = {}

    async def connect(self, websocket: WebSocket, user_id: int, hackathon_id: int):
        """Register new WebSocket connection"""
        await websocket.accept()

        if user_id not in self.active_connections:
            self.active_connections[user_id] = []

        self.active_connections[user_id].append(websocket)

        if hackathon_id not in self.hackathon_subscribers:
            self.hackathon_subscribers[hackathon_id] = set()

        self.hackathon_subscribers[hackathon_id].add(user_id)

        logger.info(f"User {user_id} connected to hackathon {hackathon_id}")

    def disconnect(self, user_id: int, websocket: WebSocket):
        """Unregister WebSocket connection"""
        if user_id in self.active_connections:
            try:
                self.active_connections[user_id].remove(websocket)
            except ValueError:
                pass

            if not self.active_connections[user_id]:
                del self.active_connections[user_id]

    async def broadcast_event(
        self,
        event_type: str,
        data: Dict,
        hackathon_id: int = None,
        exclude_user_id: int = None
    ):
        """Broadcast event to connected clients"""

        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        message_json = json.dumps(message)

        # Determine recipients
        recipients = set()
        if hackathon_id:
            recipients = self.hackathon_subscribers.get(hackathon_id, set()).copy()
        else:
            recipients = set(self.active_connections.keys()).copy()

        if exclude_user_id:
            recipients.discard(exclude_user_id)

        # Send to all recipients
        for user_id in recipients:
            if user_id in self.active_connections:
                for websocket in self.active_connections[user_id]:
                    try:
                        await websocket.send_text(message_json)
                    except Exception as e:
                        logger.error(f"Failed to send message to user {user_id}: {str(e)}")

    async def send_to_user(
        self,
        user_id: int,
        event_type: str,
        data: Dict
    ):
        """Send event to specific user"""
        if user_id not in self.active_connections:
            return

        message = {
            "type": event_type,
            "data": data,
            "timestamp": datetime.utcnow().isoformat()
        }

        message_json = json.dumps(message)

        for websocket in self.active_connections[user_id]:
            try:
                await websocket.send_text(message_json)
            except Exception as e:
                logger.error(f"Failed to send message: {str(e)}")


# Global instance
ws_manager = WebSocketManager()
