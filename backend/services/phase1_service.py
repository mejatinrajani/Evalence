"""
Services for Phase 1 Implementation
- Project Submission Service
- Judge Assignment Service
- Results Calculation Service
- Organizer Analytics Service
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from models import (
    Project, ProjectSubmissionLog, JudgeAssignment, ConflictOfInterest,
    Evaluation, EvaluationScore, Criteria, Team, User, Hackathon, Round
)
from schemas import (
    AssignmentStatusResponse, EvaluationProgressResponse, JudgePerformanceResponse,
    BottlenecksResponse, LeaderboardEntryResponse, TeamResultsDetail
)
import logging

logger = logging.getLogger(__name__)


class ProjectSubmissionService:
    """Handle all project submission and management operations"""
    
    @staticmethod
    def get_team_submission(hackathon_id: int, team_id: int, db: Session) -> Project:
        """Get a team's project submission for a hackathon"""
        return db.query(Project).filter(
            and_(
                Project.hackathon_id == hackathon_id,
                Project.team_id == team_id
            )
        ).first()
    
    @staticmethod
    def submit_or_update_project(
        team_id: int, 
        hackathon_id: int, 
        user_id: int,
        project_data: dict,
        db: Session
    ) -> Project:
        """Submit or update a project"""
        project = db.query(Project).filter(
            and_(
                Project.team_id == team_id,
                Project.hackathon_id == hackathon_id
            )
        ).first()
        
        if not project:
            project = Project(
                team_id=team_id,
                hackathon_id=hackathon_id,
                title=project_data.get('project_name', 'Untitled Project')
            )
            db.add(project)
        
        # Update fields
        project.title = project_data.get('project_name', project.title)
        project.description = project_data.get('description', project.description)
        project.demo_url = project_data.get('demo_url', project.demo_url)
        project.github_url = project_data.get('github_url', project.github_url)
        project.presentation_slide_url = project_data.get('presentation_slide_url', project.presentation_slide_url)
        project.project_video_url = project_data.get('project_video_url', project.project_video_url)
        project.tech_stack = project_data.get('tech_stack', project.tech_stack)
        
        if project_data.get('action') == 'submit':
            project.submission_status = 'submitted'
            project.submitted_at = datetime.utcnow()
        elif project_data.get('action') == 'draft':
            project.submission_status = 'draft'
        
        db.commit()
        
        # Log submission
        log_entry = ProjectSubmissionLog(
            project_id=project.id,
            action=project_data.get('action', 'updated'),
            submitted_by_id=user_id,
            notes=project_data.get('notes', None)
        )
        db.add(log_entry)
        db.commit()
        
        return project
    
    @staticmethod
    def get_submission_history(project_id: int, db: Session) -> list:
        """Get audit trail of project submissions"""
        return db.query(ProjectSubmissionLog).filter(
            ProjectSubmissionLog.project_id == project_id
        ).order_by(ProjectSubmissionLog.timestamp.desc()).all()


class JudgeAssignmentService:
    """Handle judge assignment operations"""
    
    @staticmethod
    def get_assignment_status(hackathon_id: int, db: Session) -> AssignmentStatusResponse:
        """Get overview of judge assignments"""
        total_judges = db.query(func.count(JudgeAssignment.judge_id.distinct())).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).scalar() or 0
        
        total_teams = db.query(func.count(Team.id)).filter(
            Team.hackathon_id == hackathon_id
        ).scalar() or 0
        
        assigned_teams = db.query(func.count(Team.id.distinct())).join(
            JudgeAssignment, JudgeAssignment.team_id == Team.id
        ).filter(
            Team.hackathon_id == hackathon_id,
            JudgeAssignment.hackathon_id == hackathon_id
        ).scalar() or 0
        
        conflicts = db.query(func.count(ConflictOfInterest.id)).filter(
            ConflictOfInterest.hackathon_id == hackathon_id
        ).scalar() or 0
        
        # Check workload balance
        judge_loads = db.query(
            JudgeAssignment.judge_id,
            func.count(JudgeAssignment.id).label('load')
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).group_by(JudgeAssignment.judge_id).all()
        
        workload_imbalance = False
        if judge_loads:
            loads = [load[1] for load in judge_loads]
            avg_load = sum(loads) / len(loads)
            max_load = max(loads)
            min_load = min(loads)
            if max_load > avg_load * 1.5 or min_load < avg_load * 0.5:
                workload_imbalance = True
        
        return AssignmentStatusResponse(
            total_judges=total_judges,
            assigned_judges=total_judges,
            unassigned_judges=0,
            total_teams=total_teams,
            assigned_teams=assigned_teams,
            unassigned_teams=total_teams - assigned_teams,
            conflicts_detected=conflicts,
            workload_imbalance=workload_imbalance
        )
    
    @staticmethod
    def assign_judge_to_team(
        judge_id: int, 
        team_id: int, 
        round_id: int, 
        hackathon_id: int,
        db: Session
    ) -> JudgeAssignment:
        """Manually assign a judge to a team"""
        # Check for existing assignment
        existing = db.query(JudgeAssignment).filter(
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.team_id == team_id,
                JudgeAssignment.hackathon_id == hackathon_id,
                JudgeAssignment.round_id == round_id
            )
        ).first()
        
        if existing:
            return existing
        
        assignment = JudgeAssignment(
            judge_id=judge_id,
            team_id=team_id,
            round_id=round_id,
            hackathon_id=hackathon_id,
            status='pending'
        )
        db.add(assignment)
        db.commit()
        return assignment
    
    @staticmethod
    def check_conflict(judge_id: int, team_id: int, hackathon_id: int, db: Session) -> bool:
        """Check if there's a conflict of interest"""
        conflict = db.query(ConflictOfInterest).filter(
            and_(
                ConflictOfInterest.judge_id == judge_id,
                ConflictOfInterest.team_id == team_id,
                ConflictOfInterest.hackathon_id == hackathon_id
            )
        ).first()
        return conflict is not None
    
    @staticmethod
    def batch_assign_judges(
        hackathon_id: int,
        round_id: int,
        assignments_data: list,
        db: Session
    ) -> dict:
        """Assign judges in bulk"""
        assigned = 0
        skipped_conflicts = 0
        errors = []
        
        for assignment_data in assignments_data:
            try:
                judge_id = assignment_data.get('judge_id')
                team_id = assignment_data.get('team_id')
                
                # Check for conflicts
                if JudgeAssignmentService.check_conflict(judge_id, team_id, hackathon_id, db):
                    skipped_conflicts += 1
                    continue
                
                JudgeAssignmentService.assign_judge_to_team(
                    judge_id, team_id, round_id, hackathon_id, db
                )
                assigned += 1
            except Exception as e:
                errors.append(str(e))
                logger.error(f"Error assigning judge: {e}")
        
        return {
            'assigned': assigned,
            'skipped_conflicts': skipped_conflicts,
            'errors': errors
        }


class ResultsService:
    """Calculate and manage hackathon results"""
    
    @staticmethod
    def calculate_final_scores(hackathon_id: int, round_id: int, db: Session) -> dict:
        """Calculate final scores with Z-score normalization"""
        # Get all evaluations for this round
        evaluations = db.query(Evaluation).filter(
            and_(
                Evaluation.hackathon_id == hackathon_id,
                Evaluation.round_id == round_id,
                Evaluation.status == 'completed'
            )
        ).all()
        
        scores_by_team = {}
        
        for evaluation in evaluations:
            team_id = evaluation.team_id
            if team_id not in scores_by_team:
                scores_by_team[team_id] = []
            
            # Get all criteria scores for this evaluation
            criteria_scores = db.query(EvaluationScore).filter(
                EvaluationScore.evaluation_id == evaluation.id
            ).all()
            
            total_score = sum(cs.score for cs in criteria_scores) / len(criteria_scores) if criteria_scores else 0
            scores_by_team[team_id].append(total_score)
        
        # Calculate mean and std dev
        final_scores = {}
        all_scores = []
        for team_id, scores in scores_by_team.items():
            avg_score = sum(scores) / len(scores) if scores else 0
            final_scores[team_id] = avg_score
            all_scores.extend(scores)
        
        # Apply Z-score normalization
        if all_scores:
            mean = sum(all_scores) / len(all_scores)
            variance = sum((x - mean) ** 2 for x in all_scores) / len(all_scores)
            std_dev = variance ** 0.5
            
            for team_id in final_scores:
                if std_dev > 0:
                    z_score = (final_scores[team_id] - mean) / std_dev
                    # Normalize to 0-100 range
                    final_scores[team_id] = max(0, min(100, 50 + (z_score * 15)))
        
        return final_scores
    
    @staticmethod
    def get_leaderboard(hackathon_id: int, db: Session) -> list:
        """Get leaderboard rankings"""
        # Get teams with their scores
        teams_with_scores = db.query(
            Team.id,
            Team.name,
            func.avg(EvaluationScore.score).label('avg_score'),
            func.count(Evaluation.id.distinct()).label('evaluation_count')
        ).join(
            Evaluation, Evaluation.team_id == Team.id
        ).outerjoin(
            EvaluationScore, EvaluationScore.evaluation_id == Evaluation.id
        ).filter(
            Team.hackathon_id == hackathon_id,
            Evaluation.status == 'completed'
        ).group_by(
            Team.id, Team.name
        ).order_by(
            func.avg(EvaluationScore.score).desc()
        ).all()
        
        leaderboard = []
        for rank, (team_id, team_name, avg_score, eval_count) in enumerate(teams_with_scores, 1):
            badge = None
            if rank == 1:
                badge = 'gold'
            elif rank == 2:
                badge = 'silver'
            elif rank == 3:
                badge = 'bronze'
            
            leaderboard.append(LeaderboardEntryResponse(
                rank=rank,
                team_id=team_id,
                team_name=team_name,
                final_score=float(avg_score or 0),
                avg_score=float(avg_score or 0),
                evaluations_received=eval_count or 0,
                badge=badge
            ))
        
        return leaderboard


class AnalyticsService:
    """Generate analytics and dashboard data"""
    
    @staticmethod
    def get_evaluation_progress(hackathon_id: int, db: Session) -> list:
        """Get evaluation progress by round"""
        rounds = db.query(Round).filter(
            Round.hackathon_id == hackathon_id
        ).all()
        
        progress = []
        for round_obj in rounds:
            total_teams = db.query(func.count(Team.id)).filter(
                Team.hackathon_id == hackathon_id
            ).scalar() or 1
            
            completed = db.query(func.count(Evaluation.id.distinct())).filter(
                and_(
                    Evaluation.round_id == round_obj.id,
                    Evaluation.status == 'completed'
                )
            ).scalar() or 0
            
            in_progress = db.query(func.count(Evaluation.id.distinct())).filter(
                and_(
                    Evaluation.round_id == round_obj.id,
                    Evaluation.status == 'in_progress'
                )
            ).scalar() or 0
            
            avg_score = db.query(func.avg(Evaluation.score)).filter(
                and_(
                    Evaluation.round_id == round_obj.id,
                    Evaluation.status == 'completed'
                )
            ).scalar()
            
            progress.append(EvaluationProgressResponse(
                round_id=round_obj.id,
                round_name=round_obj.name,
                total_teams=total_teams,
                completed=completed,
                in_progress=in_progress,
                pending=total_teams - completed - in_progress,
                completion_percent=round(100.0 * completed / total_teams, 2) if total_teams > 0 else 0,
                avg_score=float(avg_score) if avg_score else None
            ))
        
        return progress
    
    @staticmethod
    def get_judge_performance(hackathon_id: int, db: Session) -> list:
        """Get performance metrics for each judge"""
        judges_data = db.query(
            User.id,
            User.full_name,
            func.count(JudgeAssignment.id).label('assigned_count'),
            func.count(
                func.distinct(
                    func.case(
                        (Evaluation.status == 'completed', Evaluation.id),
                        else_=None
                    )
                )
            ).label('completed_count'),
            func.avg(Evaluation.score).label('avg_score')
        ).join(
            JudgeAssignment, JudgeAssignment.judge_id == User.id
        ).outerjoin(
            Evaluation, and_(
                Evaluation.judge_id == User.id,
                Evaluation.hackathon_id == hackathon_id
            )
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).group_by(
            User.id, User.full_name
        ).all()
        
        performance = []
        for judge_id, judge_name, assigned, completed, avg_score in judges_data:
            performance.append(JudgePerformanceResponse(
                judge_id=judge_id,
                judge_name=judge_name,
                assigned_count=assigned or 0,
                completed_count=completed or 0,
                avg_score=float(avg_score) if avg_score else None,
                avg_time_per_eval=None,
                score_std_dev=None,
                last_activity=None
            ))
        
        return performance
    
    @staticmethod
    def identify_bottlenecks(hackathon_id: int, db: Session) -> BottlenecksResponse:
        """Identify slow judges, unassigned teams, common issues"""
        # Idle judges (0 completed)
        idle_judges = db.query(
            User.id,
            User.full_name,
            func.count(JudgeAssignment.id).label('assigned_count')
        ).join(
            JudgeAssignment, JudgeAssignment.judge_id == User.id
        ).outerjoin(
            Evaluation, and_(
                Evaluation.judge_id == User.id,
                Evaluation.status == 'completed'
            )
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id,
            Evaluation.id == None
        ).group_by(
            User.id, User.full_name
        ).all()
        
        # Unassigned teams
        unassigned_teams = db.query(func.count(Team.id)).filter(
            Team.hackathon_id == hackathon_id
        ).scalar() or 0
        
        assigned_teams = db.query(func.count(Team.id.distinct())).join(
            JudgeAssignment, JudgeAssignment.team_id == Team.id
        ).filter(
            Team.hackathon_id == hackathon_id,
            JudgeAssignment.hackathon_id == hackathon_id
        ).scalar() or 0
        
        stalled_evals = db.query(func.count(JudgeAssignment.id)).filter(
            and_(
                JudgeAssignment.hackathon_id == hackathon_id,
                JudgeAssignment.status.in_(['pending', 'in_progress']),
                JudgeAssignment.assigned_at < datetime.utcnow() - timedelta(hours=2)
            )
        ).scalar() or 0
        
        return BottlenecksResponse(
            idle_judges=[{'judge_id': j[0], 'judge_name': j[1], 'assigned_count': j[2]} 
                        for j in idle_judges],
            slow_judges=[],
            unassigned_teams=unassigned_teams - assigned_teams,
            stalled_evaluations=stalled_evals
        )
