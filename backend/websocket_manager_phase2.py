"""
Phase 2: WebSocket Manager - Real-time Notifications & Events
Handles Socket.IO connections for live updates across all users
"""

import asyncio
import json
from typing import Dict, Set, List, Optional
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class WebSocketManager:
    """
    Manage WebSocket connections for real-time notifications
    Broadcasts events to specific users, teams, or entire hackathons
    """
    
    def __init__(self):
        # Track active connections
        self.active_connections: Dict[int, List] = {}  # user_id -> [websocket1, websocket2, ...]
        self.user_hackathons: Dict[int, Set[int]] = {}  # user_id -> {hackathon_ids}
        self.hackathon_users: Dict[int, Set[int]] = {}  # hackathon_id -> {user_ids}
        self.team_members: Dict[int, Set[int]] = {}     # team_id -> {user_ids}
    
    async def connect(self, user_id: int, websocket, hackathon_id: Optional[int] = None):
        """Register a new WebSocket connection"""
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        
        self.active_connections[user_id].append(websocket)
        
        if hackathon_id:
            if user_id not in self.user_hackathons:
                self.user_hackathons[user_id] = set()
            self.user_hackathons[user_id].add(hackathon_id)
            
            if hackathon_id not in self.hackathon_users:
                self.hackathon_users[hackathon_id] = set()
            self.hackathon_users[hackathon_id].add(user_id)
        
        logger.info(f"✅ User {user_id} connected via WebSocket")
    
    def disconnect(self, user_id: int, websocket):
        """Unregister a WebSocket connection"""
        if user_id in self.active_connections:
            if websocket in self.active_connections[user_id]:
                self.active_connections[user_id].remove(websocket)
            
            if not self.active_connections[user_id]:
                del self.active_connections[user_id]
                logger.info(f"❌ User {user_id} disconnected")
    
    async def broadcast_to_user(self, user_id: int, event: dict):
        """Send message to specific user"""
        if user_id in self.active_connections:
            message = json.dumps(event)
            for connection in self.active_connections[user_id]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.error(f"Error sending to user {user_id}: {e}")
    
    async def broadcast_to_team(self, team_id: int, event: dict):
        """Send message to all team members"""
        if team_id in self.team_members:
            for user_id in self.team_members[team_id]:
                await self.broadcast_to_user(user_id, event)
    
    async def broadcast_to_hackathon(self, hackathon_id: int, event: dict):
        """Send message to all users in a hackathon"""
        if hackathon_id in self.hackathon_users:
            for user_id in self.hackathon_users[hackathon_id]:
                await self.broadcast_to_user(user_id, event)
    
    async def broadcast_to_judges(self, hackathon_id: int, judge_ids: List[int], event: dict):
        """Send message to specific judges"""
        for judge_id in judge_ids:
            if judge_id in self.hackathon_users.get(hackathon_id, set()):
                await self.broadcast_to_user(judge_id, event)
    
    async def send_evaluation_submitted(self, hackathon_id: int, team_id: int, 
                                       judge_name: str, score: float, criteria: str):
        """Notify organizer that evaluation was submitted"""
        event = {
            "type": "EVALUATION_SUBMITTED",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "team_id": team_id,
            "judge_name": judge_name,
            "score": score,
            "criteria": criteria,
            "message": f"🎯 {judge_name} evaluated {criteria} with {score} points"
        }
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_team_advanced(self, hackathon_id: int, team_id: int, 
                                round_name: str, team_name: str):
        """Notify team they advanced to next round"""
        event = {
            "type": "TEAM_ADVANCED",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "team_id": team_id,
            "round_name": round_name,
            "team_name": team_name,
            "message": f"🎉 {team_name} has advanced to {round_name}!"
        }
        await self.broadcast_to_team(team_id, event)
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_leaderboard_updated(self, hackathon_id: int, 
                                      top_teams: List[dict]):
        """Notify all users leaderboard has updated"""
        event = {
            "type": "LEADERBOARD_UPDATED",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "top_teams": top_teams,
            "message": "📊 Leaderboard has been updated"
        }
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_round_started(self, hackathon_id: int, round_name: str, 
                                end_time: str):
        """Notify all users new round has started"""
        event = {
            "type": "ROUND_STARTED",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "round_name": round_name,
            "end_time": end_time,
            "message": f"🏁 {round_name} has started!"
        }
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_round_ending_soon(self, hackathon_id: int, round_name: str, 
                                     minutes_left: int):
        """Notify users round is ending soon"""
        event = {
            "type": "ROUND_ENDING_SOON",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "round_name": round_name,
            "minutes_left": minutes_left,
            "message": f"⏰ {round_name} ends in {minutes_left} minutes!"
        }
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_appeal_status_changed(self, user_id: int, appeal_id: int, 
                                        status: str, resolution: str):
        """Notify user appeal status changed"""
        event = {
            "type": "APPEAL_STATUS_CHANGED",
            "timestamp": datetime.utcnow().isoformat(),
            "appeal_id": appeal_id,
            "status": status,
            "resolution": resolution,
            "message": f"📋 Your appeal has been {status}: {resolution}"
        }
        await self.broadcast_to_user(user_id, event)
    
    async def send_judge_assigned(self, user_id: int, hackathon_name: str, 
                                 team_count: int, round_name: str):
        """Notify judge they've been assigned to evaluate"""
        event = {
            "type": "JUDGE_ASSIGNED",
            "timestamp": datetime.utcnow().isoformat(),
            "message": f"👨‍⚖️ You've been assigned to judge {team_count} teams in {round_name}",
            "hackathon_name": hackathon_name,
            "team_count": team_count,
            "round_name": round_name
        }
        await self.broadcast_to_user(user_id, event)
    
    async def send_permission_granted(self, user_id: int, permission_type: str):
        """Notify judge elevated permissions granted"""
        permission_labels = {
            "view_all_scores": "View All Scores",
            "re_evaluate": "Re-evaluate Teams",
            "override_blind": "Override Blind Evaluation"
        }
        label = permission_labels.get(permission_type, permission_type)
        
        event = {
            "type": "PERMISSION_GRANTED",
            "timestamp": datetime.utcnow().isoformat(),
            "permission_type": permission_type,
            "message": f"🔑 Permission granted: {label}"
        }
        await self.broadcast_to_user(user_id, event)
    
    async def send_real_time_score_update(self, hackathon_id: int, 
                                         team_id: int, old_score: float, 
                                         new_score: float):
        """Send real-time score update (for live leaderboard)"""
        event = {
            "type": "SCORE_UPDATED",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "team_id": team_id,
            "old_score": old_score,
            "new_score": new_score,
            "change": round(new_score - old_score, 2),
            "message": f"Score changed from {old_score} to {new_score}"
        }
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_anomaly_detected(self, hackathon_id: int, 
                                   anomaly_type: str, severity: int, 
                                   description: str):
        """Alert organizer of suspicious scoring"""
        event = {
            "type": "ANOMALY_DETECTED",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "anomaly_type": anomaly_type,
            "severity": severity,
            "description": description,
            "message": f"🚨 [{anomaly_type.upper()}] {description}"
        }
        await self.broadcast_to_hackathon(hackathon_id, event)
    
    async def send_live_analytics_update(self, hackathon_id: int, 
                                        analytics_data: dict):
        """Send live analytics update to organizer dashboard"""
        event = {
            "type": "ANALYTICS_UPDATE",
            "timestamp": datetime.utcnow().isoformat(),
            "hackathon_id": hackathon_id,
            "data": analytics_data
        }
        await self.broadcast_to_hackathon(hackathon_id, event)


# Global manager instance
manager = WebSocketManager()
