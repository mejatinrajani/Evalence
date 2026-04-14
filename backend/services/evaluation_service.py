"""
Evaluation Service - Handle complex evaluation logic with transaction management
"""
from sqlalchemy import and_
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Dict, List
import logging
from models import Evaluation, EvaluationScore, EvaluationAudit, User

logger = logging.getLogger(__name__)


class EvaluationService:
    """Service for handling evaluation submission and persistence"""

    @staticmethod
    def submit_evaluation(
        db: Session,
        evaluation_id: int,
        scores_dict: Dict[int, float],
        feedback: str,
        judge_id: int,
        ip_address: str = None
    ) -> Dict:
        """
        Atomically submit evaluation with all scores

        Args:
            db: Database session
            evaluation_id: Evaluation to submit
            scores_dict: {criteria_id: score}
            feedback: Judge feedback
            judge_id: Judge submitting
            ip_address: IP for audit

        Returns:
            {status: success/error, message: ..., evaluation_id: ..., ...}

        Raises:
            ValueError: If validation fails
        """

        # Step 1: Fetch evaluation
        evaluation = db.query(Evaluation).filter(
            and_(
                Evaluation.id == evaluation_id,
                Evaluation.judge_id == judge_id
            )
        ).first()

        if not evaluation:
            raise ValueError("Evaluation not found")

        # Step 2: Validate scores
        for criteria_id, score in scores_dict.items():
            if not isinstance(score, (int, float)):
                raise ValueError(f"Invalid score type for criteria {criteria_id}")
            if not (0 <= score <= 100):
                raise ValueError(f"Score {score} out of range for criteria {criteria_id}")

        # Step 3: Check for duplicate submission
        if evaluation.is_finalized:
            raise ValueError("Evaluation already submitted")

        try:
            # Step 4: Get old scores for audit trail
            old_scores = {}
            for existing_score in evaluation.scores:
                old_scores[existing_score.criteria_id] = existing_score.score

            # Delete existing scores
            db.query(EvaluationScore).filter(
                EvaluationScore.evaluation_id == evaluation_id
            ).delete()

            # Step 5: Create new scores
            total_score = 0
            for criteria_id, score in scores_dict.items():
                eval_score = EvaluationScore(
                    evaluation_id=evaluation_id,
                    criteria_id=criteria_id,
                    score=float(score),
                    comment=""
                )
                db.add(eval_score)
                total_score += score

            # Step 6: Update evaluation
            evaluation.status = "completed"
            evaluation.feedback = feedback
            evaluation.submitted_at = datetime.utcnow()
            evaluation.submitted_by_id = judge_id
            evaluation.is_finalized = True
            evaluation.finalized_at = datetime.utcnow()

            # Step 7: Create audit record
            audit = EvaluationAudit(
                evaluation_id=evaluation_id,
                action="submitted",
                changed_by_id=judge_id,
                old_values=old_scores,
                new_values=scores_dict,
                ip_address=ip_address
            )
            db.add(audit)

            # Step 8: Commit transaction
            db.commit()

            # Calculate average
            avg_score = total_score / len(scores_dict) if scores_dict else 0

            return {
                "status": "success",
                "evaluation_id": evaluation_id,
                "message": "Evaluation submitted successfully",
                "average_score": avg_score,
                "scores_count": len(scores_dict),
                "timestamp": evaluation.submitted_at.isoformat()
            }

        except Exception as e:
            db.rollback()
            logger.error(f"Evaluation submission failed: {str(e)}")
            raise ValueError(f"Database error: {str(e)}")

    @staticmethod
    def get_evaluation_with_criteria(
        db: Session,
        evaluation_id: int,
        judge_id: int
    ) -> Dict:
        """Fetch evaluation with all criteria for UI form"""
        from models import Round

        evaluation = db.query(Evaluation).filter(
            Evaluation.id == evaluation_id
        ).first()

        if not evaluation:
            raise ValueError("Evaluation not found")

        if evaluation.judge_id != judge_id:
            raise ValueError("Not authorized")

        # Get round with criteria
        round_obj = db.query(Round).filter(Round.id == evaluation.round_id).first()

        # Get current scores
        current_scores = {}
        for score in evaluation.scores:
            current_scores[score.criteria_id] = score.score

        # Format response
        criteria_list = [
            {
                "id": c.id,
                "name": c.name,
                "description": c.description,
                "weight": c.weight,
                "max_score": 100
            }
            for c in round_obj.criteria
        ]

        return {
            "id": evaluation.id,
            "team_id": evaluation.team_id,
            "team_name": evaluation.team.name,
            "round_id": evaluation.round_id,
            "round_name": round_obj.name,
            "criteria": criteria_list,
            "current_scores": current_scores,
            "status": evaluation.status,
            "feedback": evaluation.feedback or "",
            "average_score": self._calculate_average_score(criteria_list, current_scores)
        }

    @staticmethod
    def save_evaluation_draft(
        db: Session,
        evaluation_id: int,
        scores_dict: Dict[int, float],
        feedback: str,
        judge_id: int,
        submit: bool = False
    ) -> Dict:
        """Save evaluation as draft or submit"""
        evaluation = db.query(Evaluation).filter(
            Evaluation.id == evaluation_id
        ).first()

        if not evaluation or evaluation.judge_id != judge_id:
            raise ValueError("Not authorized")

        try:
            # Validate scores
            for criteria_id, score in scores_dict.items():
                if not (0 <= score <= 100):
                    raise ValueError(f"Score out of range: {score}")

            # Delete old scores
            db.query(EvaluationScore).filter(
                EvaluationScore.evaluation_id == evaluation_id
            ).delete()

            # Create new scores
            for criteria_id, score in scores_dict.items():
                eval_score = EvaluationScore(
                    evaluation_id=evaluation_id,
                    criteria_id=int(criteria_id),
                    score=float(score),
                    comment=""
                )
                db.add(eval_score)

            # Update evaluation
            evaluation.feedback = feedback
            evaluation.status = "completed" if submit else "in_progress"
            evaluation.last_modified = datetime.utcnow()

            if submit:
                evaluation.submitted_at = datetime.utcnow()
                evaluation.submitted_by_id = judge_id
                evaluation.is_finalized = True
                evaluation.finalized_at = datetime.utcnow()

            db.commit()

            avg_score = sum(scores_dict.values()) / len(scores_dict) if scores_dict else 0

            return {
                "status": "success",
                "id": evaluation_id,
                "message": "Evaluation saved successfully",
                "is_draft": not submit,
                "average_score": avg_score
            }
        except Exception as e:
            db.rollback()
            raise ValueError(str(e))

    @staticmethod
    def _calculate_average_score(criteria_list: List, current_scores: Dict) -> float:
        """Calculate weighted average score"""
        if not criteria_list or not current_scores:
            return 0.0

        total_weighted = 0.0
        total_weight = 0.0

        for criterion in criteria_list:
            c_id = criterion["id"]
            weight = criterion.get("weight", 1.0)
            score = current_scores.get(c_id, 0)

            total_weighted += score * weight
            total_weight += weight

        return total_weighted / total_weight if total_weight > 0 else 0.0
