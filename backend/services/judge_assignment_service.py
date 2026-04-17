"""
Judge Assignment and Optimization Service
Implements intelligent assignment algorithms with conflict detection and workload balancing
"""

from typing import List, Dict, Set, Tuple, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import numpy as np
import logging
from datetime import datetime

from models import Hackathon, User, Team, Evaluation, ConflictOfInterest, JudgeAssignment

logger = logging.getLogger(__name__)


class JudgeAssignmentService:
    """Service for intelligent judge assignment"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def assign_judges(
        self,
        hackathon_id: int,
        strategy: JudgeAssignmentStrategy = JudgeAssignmentStrategy.balanced_workload,
        auto_resolve_conflicts: bool = True
    ) -> Tuple[List[JudgeAssignment], Dict]:
        """Run judge assignment with specified strategy"""
        
        judges = self.db.query(User).filter(User.role == "judge").all()
        teams = self.db.query(Team).filter(Team.hackathon_id == hackathon_id).all()
        
        if not judges or not teams:
            raise ValueError("Insufficient judges or teams for assignment")
        
        # Build conflict graph
        conflicts = self._build_conflict_graph(hackathon_id)
        
        # Clear existing assignments
        self.db.query(JudgeAssignment).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).delete()
        
        # Run appropriate strategy
        if strategy == JudgeAssignmentStrategy.balanced_workload:
            assignments = self._assign_balanced_workload(
                judges, teams, conflicts, hackathon_id, auto_resolve_conflicts
            )
        elif strategy == JudgeAssignmentStrategy.skill_based:
            assignments = self._assign_skill_based(
                judges, teams, conflicts, hackathon_id, auto_resolve_conflicts
            )
        elif strategy == JudgeAssignmentStrategy.diversity:
            assignments = self._assign_diversity(
                judges, teams, conflicts, hackathon_id, auto_resolve_conflicts
            )
        elif strategy == JudgeAssignmentStrategy.random:
            assignments = self._assign_random(
                judges, teams, conflicts, hackathon_id, auto_resolve_conflicts
            )
        else:
            raise ValueError(f"Unknown strategy: {strategy}")
        
        # Save assignments
        for assignment in assignments:
            self.db.add(assignment)
        
        self.db.commit()
        
        # Calculate statistics
        stats = {
            "total_assignments": len(assignments),
            "conflicts_avoided": len([a for a in assignments if a.confidence_score > 0.8]),
            "fallback_assignments": len([a for a in assignments if a.confidence_score <= 0.8]),
            "unassigned_teams": len(teams) - len(assignments)
        }
        
        logger.info(f"Judge assignment completed: {stats}")
        return assignments, stats
    
    def _build_conflict_graph(self, hackathon_id: int) -> Set[Tuple[int, int]]:
        """Build a set of (judge_id, team_id) conflicts"""
        conflicts = self.db.query(ConflictOfInterest).filter(
            ConflictOfInterest.hackathon_id == hackathon_id
        ).all()
        return {(c.judge_id, c.team_id) for c in conflicts}
    
    def _assign_balanced_workload(
        self,
        judges: List[User],
        teams: List[Team],
        conflicts: Set[Tuple[int, int]],
        hackathon_id: int,
        auto_resolve: bool
    ) -> List[JudgeAssignment]:
        """Assign judges to balance workload evenly"""
        assignments = []
        judge_loads = {j.id: 0 for j in judges}
        
        # Sort teams by ID (stable ordering)
        teams_sorted = sorted(teams, key=lambda t: t.id)
        
        for team in teams_sorted:
            # Get available judges (no conflict)
            available = [
                j for j in judges
                if (j.id, team.id) not in conflicts
            ]
            
            if available:
                # Assign to judge with lowest workload
                best_judge = min(available, key=lambda j: judge_loads[j.id])
                confidence = 0.95  # High confidence, no conflict
            elif auto_resolve:
                # All judges have conflict, pick least conflicted
                best_judge = min(judges, key=lambda j: judge_loads[j.id])
                confidence = 0.6  # Low confidence, forced assignment
            else:
                logger.warning(f"Cannot assign team {team.id} - all judges have conflicts")
                continue
            
            assignment = JudgeAssignment(
                hackathon_id=hackathon_id,
                judge_id=best_judge.id,
                team_id=team.id,
                strategy_used=JudgeAssignmentStrategy.balanced_workload,
                assignment_order=judge_loads[best_judge.id] + 1,
                confidence_score=confidence
            )
            assignments.append(assignment)
            judge_loads[best_judge.id] += 1
        
        return assignments
    
    def _assign_skill_based(
        self,
        judges: List[User],
        teams: List[Team],
        conflicts: Set[Tuple[int, int]],
        hackathon_id: int,
        auto_resolve: bool
    ) -> List[JudgeAssignment]:
        """Assign judges based on skill match with team tech stack"""
        assignments = []
        judge_loads = {j.id: 0 for j in judges}
        
        # Get judge preferences and team tech stacks
        judge_prefs = {}
        for judge in judges:
            pref = self.db.query(JudgePreference).filter(
                JudgePreference.judge_id == judge.id
            ).first()
            judge_prefs[judge.id] = pref
        
        team_techs = {}
        for team in teams:
            tech = self.db.query(TeamTechStack).filter(
                TeamTechStack.team_id == team.id
            ).first()
            tech_list = []
            if tech:
                tech_list = (tech.frontend or []) + (tech.backend or [])
            team_techs[team.id] = tech_list
        
        teams_sorted = sorted(teams, key=lambda t: t.id)
        
        for team in teams_sorted:
            team_tech = team_techs.get(team.id, [])
            
            # Score each judge based on tech match
            judge_scores = {}
            for judge in judges:
                if (judge.id, team.id) in conflicts:
                    judge_scores[judge.id] = -1  # Conflict
                    continue
                
                pref = judge_prefs.get(judge.id)
                score = 0
                
                if pref:
                    # Match with preferred tech
                    matches = len(set(team_tech) & set(pref.preferred_techs or []))
                    score += matches * 2
                    
                    # Penalize avoided tech
                    avoided = len(set(team_tech) & set(pref.avoided_techs or []))
                    score -= avoided * 5
                    
                    # Balance by workload
                    score -= judge_loads[judge.id] * 0.5
                
                judge_scores[judge.id] = score
            
            # Assign to best scoring judge with no conflict
            best_judge = max(
                [j for j in judges if judge_scores.get(j.id, -1) >= 0],
                key=lambda j: judge_scores.get(j.id, 0),
                default=None
            )
            
            if best_judge is None and auto_resolve:
                # Fallback to least loaded
                best_judge = min(judges, key=lambda j: judge_loads[j.id])
                confidence = 0.5
            elif best_judge:
                confidence = min(0.99, 0.7 + judge_scores[best_judge.id] * 0.1)
            else:
                logger.warning(f"Cannot assign team {team.id} - no suitable judge")
                continue
            
            assignment = JudgeAssignment(
                hackathon_id=hackathon_id,
                judge_id=best_judge.id,
                team_id=team.id,
                strategy_used=JudgeAssignmentStrategy.skill_based,
                assignment_order=judge_loads[best_judge.id] + 1,
                confidence_score=confidence
            )
            assignments.append(assignment)
            judge_loads[best_judge.id] += 1
        
        return assignments
    
    def _assign_diversity(
        self,
        judges: List[User],
        teams: List[Team],
        conflicts: Set[Tuple[int, int]],
        hackathon_id: int,
        auto_resolve: bool
    ) -> List[JudgeAssignment]:
        """Assign judges to maximize diversity of evaluation"""
        assignments = []
        judge_loads = {j.id: 0 for j in judges}
        judge_team_history = {j.id: [] for j in judges}
        
        teams_sorted = sorted(teams, key=lambda t: t.id)
        
        for team in teams_sorted:
            available = [
                j for j in judges
                if (j.id, team.id) not in conflicts
            ]
            
            if available:
                # Pick judge with most diverse history
                scoring = []
                for judge in available:
                    # Diversity = how different this team is from recent assignments
                    history = judge_team_history[judge.id][-3:]  # Last 3 teams
                    diversity = len(set(["team"] + history)) - 1  # Unique teams
                    
                    # Also balance workload
                    load_score = judge_loads[judge.id]
                    
                    total_score = diversity - (load_score * 0.3)
                    scoring.append((total_score, judge))
                
                best_judge = max(scoring, key=lambda x: x[0])[1]
                confidence = 0.9
            elif auto_resolve:
                best_judge = min(judges, key=lambda j: judge_loads[j.id])
                confidence = 0.5
            else:
                logger.warning(f"Cannot assign team {team.id}")
                continue
            
            assignment = JudgeAssignment(
                hackathon_id=hackathon_id,
                judge_id=best_judge.id,
                team_id=team.id,
                strategy_used=JudgeAssignmentStrategy.diversity,
                assignment_order=judge_loads[best_judge.id] + 1,
                confidence_score=confidence
            )
            assignments.append(assignment)
            judge_loads[best_judge.id] += 1
            judge_team_history[best_judge.id].append(team.id)
        
        return assignments
    
    def _assign_random(
        self,
        judges: List[User],
        teams: List[Team],
        conflicts: Set[Tuple[int, int]],
        hackathon_id: int,
        auto_resolve: bool
    ) -> List[JudgeAssignment]:
        """Assign judges randomly"""
        import random
        assignments = []
        judge_loads = {j.id: 0 for j in judges}
        
        teams_sorted = sorted(teams, key=lambda t: random.random())
        
        for team in teams_sorted:
            available = [
                j for j in judges
                if (j.id, team.id) not in conflicts
            ]
            
            if available:
                best_judge = random.choice(available)
                confidence = 0.8
            elif auto_resolve:
                best_judge = random.choice(judges)
                confidence = 0.5
            else:
                logger.warning(f"Cannot assign team {team.id}")
                continue
            
            assignment = JudgeAssignment(
                hackathon_id=hackathon_id,
                judge_id=best_judge.id,
                team_id=team.id,
                strategy_used=JudgeAssignmentStrategy.random,
                assignment_order=judge_loads[best_judge.id] + 1,
                confidence_score=confidence
            )
            assignments.append(assignment)
            judge_loads[best_judge.id] += 1
        
        return assignments
    
    def rebalance_workload(self, hackathon_id: int, threshold: float = 1.5) -> int:
        """Rebalance judge workload if imbalance detected"""
        assignments = self.db.query(JudgeAssignment).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).all()
        
        # Calculate current loads
        judge_loads = {}
        judge_pending = {}
        for assign in assignments:
            judge_loads[assign.judge_id] = judge_loads.get(assign.judge_id, 0) + 1
            if assign.status != "completed":
                judge_pending[assign.judge_id] = judge_pending.get(assign.judge_id, 0) + 1
        
        if not judge_pending:
            return 0
        
        avg_pending = np.mean(list(judge_pending.values()))
        max_pending = max(judge_pending.values())
        
        # Check if rebalancing needed
        if max_pending / avg_pending < threshold:
            return 0
        
        # Rebalance
        rebalanced = 0
        overloaded = [j for j, l in judge_pending.items() if l > avg_pending * threshold]
        underloaded = [j for j, l in judge_pending.items() if l < avg_pending / threshold]
        
        for overloaded_judge in overloaded:
            for underloaded_judge in underloaded:
                # Move pending assignments from overloaded to underloaded
                pending_assigns = self.db.query(JudgeAssignment).filter(
                    and_(
                        JudgeAssignment.judge_id == overloaded_judge,
                        JudgeAssignment.status == "assigned"
                    )
                ).all()
                
                for assign in pending_assigns[:1]:  # Move one at a time
                    assign.judge_id = underloaded_judge
                    rebalanced += 1
                    break
        
        self.db.commit()
        logger.info(f"Rebalanced {rebalanced} assignments")
        return rebalanced
    
    def get_judge_statistics(self, judge_id: int, hackathon_id: int) -> Dict:
        """Get judge assignment statistics"""
        assignments = self.db.query(JudgeAssignment).filter(
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.hackathon_id == hackathon_id
            )
        ).all()
        
        completed = [a for a in assignments if a.status == "completed"]
        pending = [a for a in assignments if a.status in ["assigned", "started"]]
        
        return {
            "total_assignments": len(assignments),
            "completed": len(completed),
            "pending": len(pending),
            "completion_rate": len(completed) / len(assignments) if assignments else 0,
            "avg_confidence": np.mean([a.confidence_score for a in assignments]) if assignments else 0
        }
