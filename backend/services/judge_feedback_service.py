"""
Phase 3: Judge Feedback Service
Handles judge feedback, ratings, and team responses
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, func
from typing import List, Dict, Optional
from datetime import datetime
import numpy as np
from backend.models_feedback import (
    JudgeFeedback, FeedbackTag, TeamResponse, JudgeRating,
    FeedbackCategory, DetailedEvaluation, FeedbackType
)
from backend.models import Evaluation, Team, User, Hackathon
from pydantic import BaseModel, Field


class FeedbackCreateRequest(BaseModel):
    """Request to create judge feedback"""
    judge_id: int
    team_id: int
    feedback_text: str
    feedback_type: str = "neutral"
    innovation_rating: float
    execution_rating: float
    presentation_rating: float
    market_potential_rating: float
    code_quality_score: Optional[float] = None
    ui_ux_score: Optional[float] = None
    scalability_score: Optional[float] = None
    documentation_score: Optional[float] = None
    is_public: bool = False
    private_notes: Optional[str] = None
    tags: List[str] = []


class JudgeFeedbackService:
    """Service for managing judge feedback and ratings"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_feedback(
        self,
        hackathon_id: int,
        judge_id: int,
        team_id: int,
        feedback_data: FeedbackCreateRequest
    ) -> JudgeFeedback:
        """Create detailed feedback from judge to team"""
        
        feedback = JudgeFeedback(
            hackathon_id=hackathon_id,
            judge_id=judge_id,
            team_id=team_id,
            feedback_text=feedback_data.feedback_text,
            feedback_type=feedback_data.feedback_type,
            innovation_rating=feedback_data.innovation_rating,
            execution_rating=feedback_data.execution_rating,
            presentation_rating=feedback_data.presentation_rating,
            market_potential_rating=feedback_data.market_potential_rating,
            code_quality_score=feedback_data.code_quality_score,
            ui_ux_score=feedback_data.ui_ux_score,
            scalability_score=feedback_data.scalability_score,
            documentation_score=feedback_data.documentation_score,
            is_public=feedback_data.is_public,
            private_notes=feedback_data.private_notes
        )
        
        self.db.add(feedback)
        self.db.flush()
        
        # Add tags
        for tag in feedback_data.tags:
            tag_obj = FeedbackTag(feedback_id=feedback.id, tag=tag)
            self.db.add(tag_obj)
        
        self.db.commit()
        return feedback
    
    def get_team_feedback(self, team_id: int, hackathon_id: int) -> List[Dict]:
        """Get all feedback for a team"""
        feedbacks = self.db.query(JudgeFeedback).filter(
            and_(
                JudgeFeedback.team_id == team_id,
                JudgeFeedback.hackathon_id == hackathon_id,
                JudgeFeedback.is_public == True
            )
        ).all()
        
        result = []
        for feedback in feedbacks:
            tags = self.db.query(FeedbackTag).filter(
                FeedbackTag.feedback_id == feedback.id
            ).all()
            
            response = self.db.query(TeamResponse).filter(
                TeamResponse.feedback_id == feedback.id
            ).first()
            
            result.append({
                "id": feedback.id,
                "judge_name": feedback.judge.full_name,
                "feedback_type": feedback.feedback_type,
                "text": feedback.feedback_text,
                "ratings": {
                    "innovation": feedback.innovation_rating,
                    "execution": feedback.execution_rating,
                    "presentation": feedback.presentation_rating,
                    "market_potential": feedback.market_potential_rating,
                    "code_quality": feedback.code_quality_score,
                    "ui_ux": feedback.ui_ux_score,
                    "scalability": feedback.scalability_score,
                    "documentation": feedback.documentation_score,
                },
                "tags": [t.tag for t in tags],
                "team_response": response.response_text if response else None,
                "created_at": feedback.created_at.isoformat()
            })
        
        return result
    
    def get_judge_feedback_summary(self, judge_id: int, hackathon_id: int) -> Dict:
        """Get summary statistics for a judge's feedback"""
        
        feedbacks = self.db.query(JudgeFeedback).filter(
            and_(
                JudgeFeedback.judge_id == judge_id,
                JudgeFeedback.hackathon_id == hackathon_id
            )
        ).all()
        
        if not feedbacks:
            return {"count": 0}
        
        innovation_scores = [f.innovation_rating for f in feedbacks]
        execution_scores = [f.execution_rating for f in feedbacks]
        presentation_scores = [f.presentation_rating for f in feedbacks]
        market_scores = [f.market_potential_rating for f in feedbacks]
        
        # Get feedback type distribution
        feedback_types = {}
        for f in feedbacks:
            feedback_types[f.feedback_type] = feedback_types.get(f.feedback_type, 0) + 1
        
        # Calculate correlation between judge's scores and team performance
        avg_judge_score = np.mean([
            np.mean([f.innovation_rating, f.execution_rating, f.presentation_rating, f.market_potential_rating])
            for f in feedbacks
        ])
        
        return {
            "total_feedback_count": len(feedbacks),
            "feedback_type_distribution": feedback_types,
            "average_ratings": {
                "innovation": np.mean(innovation_scores),
                "execution": np.mean(execution_scores),
                "presentation": np.mean(presentation_scores),
                "market_potential": np.mean(market_scores),
                "overall": avg_judge_score
            },
            "rating_std": {
                "innovation": np.std(innovation_scores),
                "execution": np.std(execution_scores),
                "presentation": np.std(presentation_scores),
                "market_potential": np.std(market_scores),
            }
        }
    
    def rate_judge(
        self,
        hackathon_id: int,
        judge_id: int,
        team_id: int,
        fairness: float,
        clarity: float,
        helpfulness: float,
        professionalism: float,
        comments: Optional[str] = None,
        would_recommend: bool = True
    ) -> JudgeRating:
        """Team rates a judge"""
        
        rating = JudgeRating(
            hackathon_id=hackathon_id,
            judge_id=judge_id,
            team_id=team_id,
            fairness_rating=fairness,
            clarity_rating=clarity,
            helpfulness_rating=helpfulness,
            professionalism_rating=professionalism,
            comments=comments,
            would_recommend=would_recommend
        )
        
        self.db.add(rating)
        self.db.commit()
        return rating
    
    def get_judge_quality_metrics(self, judge_id: int, hackathon_id: int) -> Dict:
        """Get quality metrics for a judge from team ratings"""
        
        ratings = self.db.query(JudgeRating).filter(
            and_(
                JudgeRating.judge_id == judge_id,
                JudgeRating.hackathon_id == hackathon_id
            )
        ).all()
        
        if not ratings:
            return {"rating_count": 0, "average_rating": 0}
        
        fairness_scores = [r.fairness_rating for r in ratings]
        clarity_scores = [r.clarity_rating for r in ratings]
        helpfulness_scores = [r.helpfulness_rating for r in ratings]
        professionalism_scores = [r.professionalism_rating for r in ratings]
        
        overall_avg = np.mean([
            np.mean([r.fairness_rating, r.clarity_rating, r.helpfulness_rating, r.professionalism_rating])
            for r in ratings
        ])
        
        recommend_count = sum(1 for r in ratings if r.would_recommend)
        
        return {
            "rating_count": len(ratings),
            "average_ratings": {
                "fairness": np.mean(fairness_scores),
                "clarity": np.mean(clarity_scores),
                "helpfulness": np.mean(helpfulness_scores),
                "professionalism": np.mean(professionalism_scores),
                "overall": overall_avg
            },
            "recommendation_score": recommend_count / len(ratings),
            "would_recommend_percentage": (recommend_count / len(ratings)) * 100
        }
    
    def get_team_response_rate(self, hackathon_id: int) -> Dict:
        """Get response rate statistics for teams responding to feedback"""
        
        total_feedback = self.db.query(func.count(JudgeFeedback.id)).filter(
            and_(
                JudgeFeedback.hackathon_id == hackathon_id,
                JudgeFeedback.is_public == True
            )
        ).scalar()
        
        responded_feedback = self.db.query(func.count(TeamResponse.id)).filter(
            TeamResponse.feedback_id.in_(
                self.db.query(JudgeFeedback.id).filter(
                    JudgeFeedback.hackathon_id == hackathon_id
                )
            )
        ).scalar()
        
        if total_feedback == 0:
            return {"response_rate": 0, "total": 0, "responded": 0}
        
        return {
            "response_rate": (responded_feedback / total_feedback) * 100,
            "total_feedback": total_feedback,
            "responded_to": responded_feedback,
            "pending": total_feedback - responded_feedback
        }
    
    def create_team_response(
        self,
        feedback_id: int,
        team_id: int,
        response_text: str,
        response_type: str = "acknowledgment"
    ) -> TeamResponse:
        """Create team response to judge feedback"""
        
        response = TeamResponse(
            feedback_id=feedback_id,
            team_id=team_id,
            response_text=response_text,
            response_type=response_type
        )
        
        self.db.add(response)
        self.db.commit()
        return response
    
    def get_feedback_insights(self, hackathon_id: int) -> Dict:
        """Get insights from all feedback in hackathon"""
        
        feedbacks = self.db.query(JudgeFeedback).filter(
            JudgeFeedback.hackathon_id == hackathon_id
        ).all()
        
        if not feedbacks:
            return {"total_feedback": 0}
        
        # Count feedback types
        feedback_types = {}
        for f in feedbacks:
            feedback_types[f.feedback_type] = feedback_types.get(f.feedback_type, 0) + 1
        
        # Most common tags
        all_tags = self.db.query(FeedbackTag.tag).filter(
            FeedbackTag.feedback_id.in_([f.id for f in feedbacks])
        ).all()
        
        tag_counts = {}
        for tag in all_tags:
            tag_counts[tag[0]] = tag_counts.get(tag[0], 0) + 1
        
        top_tags = sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Average scores across all feedback
        all_scores = [
            f.innovation_rating, f.execution_rating, f.presentation_rating, 
            f.market_potential_rating
            for f in feedbacks
        ]
        
        return {
            "total_feedback": len(feedbacks),
            "feedback_type_distribution": feedback_types,
            "top_tags": top_tags,
            "average_ratings": {
                "overall": np.mean(all_scores),
                "min": np.min(all_scores),
                "max": np.max(all_scores),
                "median": np.median(all_scores)
            }
        }
    
    def create_detailed_evaluation(
        self,
        evaluation_id: int,
        expertise_level: str,
        time_spent_minutes: int,
        evaluation_confidence: float,
        strengths: str,
        weaknesses: str,
        improvement_suggestions: str,
        project_completeness: float,
        project_originality: float,
        project_feasibility: float
    ) -> DetailedEvaluation:
        """Create detailed evaluation record"""
        
        # Calculate score deviation if possible
        evaluation = self.db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()
        score_deviation = 0.0
        
        if evaluation and evaluation.judge_id:
            judge_evals = self.db.query(Evaluation).filter(
                Evaluation.judge_id == evaluation.judge_id,
                Evaluation.hackathon_id == evaluation.hackathon_id
            ).all()
            
            if len(judge_evals) > 1:
                scores = [e.score for e in judge_evals if e.score]
                if scores:
                    mean_score = np.mean(scores)
                    std_score = np.std(scores)
                    if std_score > 0:
                        score_deviation = (evaluation.score - mean_score) / std_score
        
        detailed = DetailedEvaluation(
            evaluation_id=evaluation_id,
            expertise_level=expertise_level,
            time_spent_minutes=time_spent_minutes,
            evaluation_confidence=evaluation_confidence,
            strengths=strengths,
            weaknesses=weaknesses,
            improvement_suggestions=improvement_suggestions,
            project_completeness=project_completeness,
            project_originality=project_originality,
            project_feasibility=project_feasibility,
            score_deviation=score_deviation
        )
        
        self.db.add(detailed)
        self.db.commit()
        return detailed
