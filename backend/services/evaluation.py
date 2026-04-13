"""
Evaluation Service for Judges Portal

Handles score validation, calculation, and evaluation processing.
"""

from typing import Dict, Tuple, Optional, List
from models import Criterion, Evaluation, User, Team
from sqlalchemy.orm import Session
from sqlalchemy import func


class EvaluationService:
    """Service for evaluation operations."""
    
    @staticmethod
    def validate_scores(
        scores: Dict[int, int],
        criteria: List[Criterion]
    ) -> Tuple[bool, Optional[str]]:
        """
        Validate that all scores are within valid ranges.
        
        Checks:
        1. All required criteria are present
        2. Each score is between 0 and max_points (inclusive)
        3. Scores are integers
        4. No extra criteria scores provided
        
        Args:
            scores: Dictionary mapping criterion_id to score value
            criteria: List of Criterion objects to validate against
        
        Returns:
            Tuple of (is_valid: bool, error_message: Optional[str])
        
        Examples:
            scores = {1: 20, 2: 15, 3: 18}
            criteria = [
                Criterion(id=1, max_points=25),
                Criterion(id=2, max_points=20),
                Criterion(id=3, max_points=20)
            ]
            result = validate_scores(scores, criteria)
            # Returns: (True, None)
        """
        
        if not scores or len(scores) == 0:
            return False, "No scores provided"
        
        if not criteria or len(criteria) == 0:
            return False, "No criteria to evaluate"
        
        # Check all criteria are scored
        criterion_ids = {c.id for c in criteria}
        provided_ids = {int(k) for k in scores.keys()}
        
        if provided_ids != criterion_ids:
            missing = criterion_ids - provided_ids
            if missing:
                return False, f"Missing scores for criteria: {missing}"
            extra = provided_ids - criterion_ids
            if extra:
                return False, f"Extra scores provided for: {extra}"
        
        # Validate each score
        for criterion in criteria:
            score = scores.get(criterion.id)
            
            if score is None:
                return False, f"Score for criterion {criterion.id} is missing"
            
            # Check type
            try:
                score_int = int(score)
            except (ValueError, TypeError):
                return False, f"Score for criterion {criterion.id} must be an integer"
            
            # Check range
            if score_int < 0:
                return False, f"Score {score_int} for {criterion.name} cannot be negative"
            
            if score_int > criterion.max_points:
                return False, f"Score {score_int} for {criterion.name} exceeds max {criterion.max_points}"
        
        return True, None
    
    @staticmethod
    def calculate_total_score(
        scores: Dict[int, int],
        criteria: List[Criterion]
    ) -> float:
        """
        Calculate total score with weight consideration.
        
        Formula:
        - If all criteria have weight: total = Σ(score_i * weight_i) / max_weighted_points
        - If no weights or uniform weights: total = Σ(score_i)
        
        Args:
            scores: Dictionary mapping criterion_id to score
            criteria: List of Criterion objects with max_points and optional weight
        
        Returns:
            Total score as float
        
        Example:
            scores = {1: 20, 2: 15, 3: 18}
            criteria = [
                Criterion(id=1, max_points=25, weight=1.0),
                Criterion(id=2, max_points=20, weight=0.8),
                Criterion(id=3, max_points=20, weight=1.0)
            ]
            total = calculate_total_score(scores, criteria)
            # Returns: weighted average
        """
        
        if not scores or not criteria:
            return 0.0
        
        # Check if any criterion has weight
        has_weights = any(hasattr(c, 'weight') and c.weight and c.weight != 1.0 for c in criteria)
        
        if not has_weights:
            # Simple sum
            total = sum(scores.get(c.id, 0) for c in criteria)
            return float(total)
        
        # Weighted calculation
        weighted_sum = 0.0
        weight_multiplier = 0.0
        
        for criterion in criteria:
            score = scores.get(criterion.id, 0)
            weight = getattr(criterion, 'weight', 1.0) or 1.0
            weighted_sum += score * weight
            weight_multiplier += criterion.max_points * weight
        
        if weight_multiplier == 0:
            return 0.0
        
        # Normalize to 0-100 scale
        total = (weighted_sum / weight_multiplier) * 100
        return round(total, 1)
    
    @staticmethod
    def convert_score_to_grade(percentage: float) -> str:
        """
        Convert percentage score to letter grade.
        
        Grading scale:
        90-100: A (Excellent)
        80-89:  B (Good)
        70-79:  C (Satisfactory)
        60-69:  D (Needs Improvement)
        0-59:   F (Failing)
        
        Args:
            percentage: Score as percentage (0-100)
        
        Returns:
            Letter grade (A, B+, B, C, D, F)
        """
        
        if percentage >= 90:
            return 'A'
        elif percentage >= 85:
            return 'B+'
        elif percentage >= 80:
            return 'B'
        elif percentage >= 75:
            return 'B-'
        elif percentage >= 70:
            return 'C+'
        elif percentage >= 65:
            return 'C'
        elif percentage >= 60:
            return 'D'
        else:
            return 'F'
    
    @staticmethod
    def get_score_color_code(percentage: float) -> str:
        """
        Get color code for score visualization.
        
        Args:
            percentage: Score as percentage (0-100)
        
        Returns:
            Color code: "red" (0-30%), "amber" (30-70%), "green" (70-100%)
        """
        
        if percentage < 30:
            return 'red'
        elif percentage < 70:
            return 'amber'
        else:
            return 'green'
    
    @staticmethod
    def calculate_criterion_percentage(
        score: int,
        max_points: int
    ) -> float:
        """
        Calculate percentage for a single criterion score.
        
        Args:
            score: The score given
            max_points: Maximum points for this criterion
        
        Returns:
            Percentage (0-100) rounded to 1 decimal
        """
        
        if max_points <= 0:
            return 0.0
        
        percentage = (score / max_points) * 100
        return round(percentage, 1)
    
    @staticmethod
    def get_judge_score_distribution(
        judge_id: int,
        hackathon_id: int,
        db: Session
    ) -> dict:
        """
        Get distribution of scores this judge has given.
        
        Returns:
            {
                'average_score': float,
                'median_score': float,
                'score_distribution': {
                    '90-100': int,
                    '80-89': int,
                    ...
                },
                'total_evaluations': int
            }
        """
        
        # Get all evaluations for this judge in this hackathon
        scores = db.query(
            func.sum(Evaluation.score).label('total_score'),
            func.count(Evaluation.id).label('count'),
            func.avg(Evaluation.score).label('avg_score')
        ).filter(
            Evaluation.judge_id == judge_id,
            Evaluation.hackathon_id == hackathon_id
        ).first()
        
        if not scores or scores[2] is None:
            return {
                'average_score': 0.0,
                'median_score': 0.0,
                'score_distribution': {},
                'total_evaluations': 0
            }
        
        all_scores = db.query(Evaluation.score).filter(
            Evaluation.judge_id == judge_id,
            Evaluation.hackathon_id == hackathon_id
        ).all()
        
        score_list = [s[0] for s in all_scores]
        
        # Calculate distribution buckets
        distribution = {
            '90-100': len([s for s in score_list if s >= 90]),
            '80-89': len([s for s in score_list if 80 <= s < 90]),
            '70-79': len([s for s in score_list if 70 <= s < 80]),
            '60-69': len([s for s in score_list if 60 <= s < 70]),
            '0-59': len([s for s in score_list if s < 60])
        }
        
        return {
            'average_score': round(float(scores[2]), 1),
            'median_score': sorted(score_list)[len(score_list)//2] if score_list else 0.0,
            'score_distribution': distribution,
            'total_evaluations': scores[1]
        }
    
    @staticmethod
    def can_edit_evaluation(
        evaluation: Evaluation,
        current_judge: User,
        round_status: str
    ) -> Tuple[bool, Optional[str]]:
        """
        Check if a judge can edit an evaluation.
        
        Rules:
        1. Judge must own the evaluation
        2. Round must not be closed
        3. Evaluation must not be finalized
        
        Args:
            evaluation: The Evaluation object
            current_judge: Current user (judge)
            round_status: Status of the evaluation round
        
        Returns:
            Tuple of (can_edit: bool, reason: Optional[str])
        """
        
        if evaluation.judge_id != current_judge.id:
            return False, "You can only edit your own evaluations"
        
        if round_status not in ['draft', 'evaluating', 'in_review']:
            return False, f"Cannot edit evaluations when round is {round_status}"
        
        if getattr(evaluation, 'is_final', False):
            return False, "This evaluation has been finalized and cannot be edited"
        
        return True, None


print("[INFO] EvaluationService loaded successfully")
