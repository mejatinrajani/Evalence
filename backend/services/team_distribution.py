"""
Team Distribution Service for Judges Portal

Handles fair and equal distribution of teams among judges.
"""

from typing import List, Optional
import random
from datetime import datetime
import math
from sqlalchemy.orm import Session
from sqlalchemy import func

from models import JudgeAssignment, User, Team, Round, Hackathon
from database import Base


class TeamDistributionService:
    """Service for distributing teams equally among judges."""
    
    @staticmethod
    def distribute_teams_for_round(
        hackathon_id: int,
        round_id: int,
        judges: List[User],
        teams: List[Team],
        db: Session,
        strategy: str = "round_robin"
    ) -> List[JudgeAssignment]:
        """
        Distribute teams equally among judges for a specific round.
        
        Algorithm:
        1. Validate inputs (judges, teams not empty)
        2. Calculate teams_per_judge = ceil(len(teams) / len(judges))
        3. Shuffle teams for randomness
        4. Assign sequentially using round-robin
        5. Distribute equally with fair remainder handling
        
        Args:
            hackathon_id: The hackathon to distribute for
            round_id: The round for evaluation
            judges: List of judges to distribute to
            teams: List of teams to distribute
            db: Database session
            strategy: "round_robin" or "random_balanced"
        
        Returns:
            List of created JudgeAssignment objects
        
        Example:
            - 12 teams, 4 judges → 3 per judge (all equal)
            - 13 teams, 4 judges → judge1: 3, judge2: 3, judge3: 3, judge4: 4
            - 7 teams, 10 judges → 7 judges get 1 team each, 3 get none
        """
        
        if not judges or not teams:
            raise ValueError("Judges and teams lists cannot be empty")
        
        assignments = []
        
        # Calculate distribution
        num_judges = len(judges)
        num_teams = len(teams)
        teams_per_judge = math.ceil(num_teams / num_judges)
        
        # Create a copy to shuffle
        teams_copy = teams.copy()
        
        # Randomize team order for fairness
        if strategy == "random_balanced":
            random.shuffle(teams_copy)
        
        # Distribute teams in round-robin fashion
        for idx, team in enumerate(teams_copy):
            judge_idx = idx % num_judges
            judge = judges[judge_idx]
            
            # Create assignment
            assignment = JudgeAssignment(
                hackathon_id=hackathon_id,
                judge_id=judge.id,
                team_id=team.id,
                round_id=round_id,
                status="pending",
                assigned_at=datetime.utcnow(),
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            db.add(assignment)
            assignments.append(assignment)
        
        db.commit()
        return assignments
    
    @staticmethod
    def get_distribution_stats(
        hackathon_id: int,
        round_id: int,
        db: Session
    ) -> dict:
        """
        Get statistics on current team distribution.
        
        Returns:
            {
                'total_judges': int,
                'total_teams': int,
                'teams_per_judge_min': int,
                'teams_per_judge_max': int,
                'judge_stats': [
                    {
                        'judge_id': int,
                        'judge_name': str,
                        'teams_assigned': int,
                        'completed': int,
                        'pending': int
                    }
                ]
            }
        """
        
        stats = db.query(
            JudgeAssignment.judge_id,
            User.full_name,
            func.count(JudgeAssignment.id).label('total_teams'),
            func.sum(
                case([
                    (JudgeAssignment.status == 'completed', 1)
                ], else_=0)
            ).label('completed'),
            func.sum(
                case([
                    (JudgeAssignment.status == 'pending', 1)
                ], else_=0)
            ).label('pending')
        ).join(
            User, JudgeAssignment.judge_id == User.id
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id,
            JudgeAssignment.round_id == round_id
        ).group_by(
            JudgeAssignment.judge_id,
            User.full_name
        ).all()
        
        judge_stats = [
            {
                'judge_id': s[0],
                'judge_name': s[1],
                'teams_assigned': s[2],
                'completed': s[3] or 0,
                'pending': s[4] or 0
            }
            for s in stats
        ]
        
        totals = db.query(func.count(JudgeAssignment.id)).filter(
            JudgeAssignment.hackathon_id == hackathon_id,
            JudgeAssignment.round_id == round_id
        ).scalar() or 0
        
        return {
            'total_judges': len(judge_stats),
            'total_teams': totals,
            'teams_per_judge_min': min([s['teams_assigned'] for s in judge_stats]) if judge_stats else 0,
            'teams_per_judge_max': max([s['teams_assigned'] for s in judge_stats]) if judge_stats else 0,
            'judge_stats': judge_stats
        }


from sqlalchemy import case

print("[INFO] TeamDistributionService loaded successfully")
