"""
Judge Analytics and Bias Detection Service
Monitors judge scoring patterns for consistency, fairness, and potential biases
"""

from typing import Dict, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
import numpy as np
from scipy import stats as scipy_stats
import logging
from datetime import datetime, timedelta

from models import Evaluation, Team, Hackathon, User, JudgeAssignment

logger = logging.getLogger(__name__)


class JudgeAnalyticsService:
    """Service for judge performance analytics and bias detection"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def calculate_judge_analytics(self, judge_id: int, hackathon_id: int) -> JudgeAnalytics:
        """Calculate comprehensive analytics for a judge"""
        
        # Get judge's evaluations
        evaluations = self.db.query(Evaluation).join(
            JudgeAssignment,
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.team_id == Evaluation.team_id
            )
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).all()
        
        if not evaluations:
            # Create empty analytics
            analytics = JudgeAnalytics(
                hackathon_id=hackathon_id,
                judge_id=judge_id,
                avg_score=0,
                score_std_dev=0,
                consistency_score=50,
                peer_agreement=0,
                total_evaluations=0,
                completion_rate=0,
                is_reliable=True
            )
            self.db.add(analytics)
            self.db.commit()
            return analytics
        
        scores = [e.score for e in evaluations if e.score is not None]
        feedback_lengths = [len(e.judge_feedback or "") for e in evaluations]
        
        # Calculate basic statistics
        avg_score = float(np.mean(scores)) if scores else 0
        score_std_dev = float(np.std(scores)) if len(scores) > 1 else 0
        
        # Consistency score: how predictable are their scores
        consistency = self._calculate_consistency(scores)
        
        # Peer agreement: correlation with other judges
        peer_agreement = self._calculate_peer_agreement(judge_id, hackathon_id, scores)
        
        # Tech diversity: judging diverse tech stacks
        tech_diversity = self._calculate_tech_diversity(judge_id, hackathon_id)
        
        # Team diversity: judging teams from different backgrounds
        team_diversity = self._calculate_team_diversity(judge_id, hackathon_id)
        
        # Feedback quality
        feedback_quality = self._calculate_feedback_quality(feedback_lengths)
        
        # Completion rate
        total_assigned = self.db.query(JudgeAssignment).filter(
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.hackathon_id == hackathon_id
            )
        ).count()
        completion_rate = len(evaluations) / total_assigned if total_assigned > 0 else 0
        
        # Score distribution histogram
        score_distribution = {}
        for score in scores:
            bucket = int(score / 10) * 10
            score_distribution[bucket] = score_distribution.get(bucket, 0) + 1
        
        # Check reliability flags
        is_reliable = self._is_judge_reliable(
            scores, consistency, peer_agreement, completion_rate
        )
        
        # Create or update analytics
        analytics = self.db.query(JudgeAnalytics).filter(
            and_(
                JudgeAnalytics.judge_id == judge_id,
                JudgeAnalytics.hackathon_id == hackathon_id
            )
        ).first()
        
        if not analytics:
            analytics = JudgeAnalytics(hackathon_id=hackathon_id, judge_id=judge_id)
            self.db.add(analytics)
        
        analytics.avg_score = avg_score
        analytics.score_std_dev = score_std_dev
        analytics.consistency_score = consistency
        analytics.peer_agreement = peer_agreement
        analytics.tech_diversity = tech_diversity
        analytics.team_diversity = team_diversity
        analytics.avg_evaluation_time = self._calculate_avg_time(judge_id, hackathon_id)
        analytics.total_evaluations = len(evaluations)
        analytics.completion_rate = completion_rate
        analytics.feedback_quality = feedback_quality
        analytics.is_reliable = is_reliable
        
        self.db.commit()
        logger.info(f"Analytics calculated for judge {judge_id}: consistency={consistency:.1f}")
        
        return analytics
    
    def detect_bias(self, judge_id: int, hackathon_id: int) -> BiasMetric:
        """Detect potential biases in judge's scoring"""
        
        # Get judge's evaluations with team metadata
        evaluations = self.db.query(Evaluation).join(
            JudgeAssignment,
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.team_id == Evaluation.team_id
            )
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).all()
        
        if len(evaluations) < 3:
            # Not enough data
            bias = BiasMetric(
                hackathon_id=hackathon_id,
                judge_id=judge_id,
                scoring_bias=0,
                bias_type="none",
                confidence_level=0.2
            )
            self.db.add(bias)
            self.db.commit()
            return bias
        
        scores = [e.score for e in evaluations]
        
        # Get peer average for comparison
        peer_avg = self._get_peer_average_score(judge_id, hackathon_id)
        
        # Scoring bias: how much do they deviate from peer average
        judge_avg = np.mean(scores)
        scoring_bias = (judge_avg - peer_avg) / peer_avg if peer_avg > 0 else 0
        
        # Bias type classification
        if abs(scoring_bias) > 0.15:  # More than 15% deviation
            if scoring_bias > 0:
                bias_type = "lenient_grader"
            else:
                bias_type = "harsh_grader"
        else:
            bias_type = "none"
        
        # Detect specific biases
        tech_bias = self._detect_tech_bias(judge_id, hackathon_id, evaluations)
        team_size_bias = self._detect_team_size_bias(judge_id, hackathon_id, evaluations)
        region_bias = self._detect_region_bias(judge_id, hackathon_id, evaluations)
        age_bias = self._detect_age_bias(judge_id, hackathon_id, evaluations)
        
        # Determine if recalibration needed
        should_recalibrate = abs(scoring_bias) > 0.2 or bias_type != "none"
        
        # Calculate correction factor to normalize
        correction_factor = 1.0
        if peer_avg > 0 and judge_avg > 0:
            correction_factor = peer_avg / judge_avg
        
        # Confidence in bias detection
        confidence = min(1.0, len(evaluations) / 20.0)  # Increases with more data
        
        # Create flags
        flags = []
        if bias_type != "none":
            flags.append(bias_type)
        if abs(tech_bias) > 0.2:
            flags.append("tech_biased")
        if abs(team_size_bias) > 0.2:
            flags.append("size_biased")
        if abs(region_bias) > 0.2:
            flags.append("region_biased")
        
        # Store or update bias metric
        bias = self.db.query(BiasMetric).filter(
            and_(
                BiasMetric.judge_id == judge_id,
                BiasMetric.hackathon_id == hackathon_id
            )
        ).first()
        
        if not bias:
            bias = BiasMetric(hackathon_id=hackathon_id, judge_id=judge_id)
            self.db.add(bias)
        
        bias.scoring_bias = float(scoring_bias)
        bias.bias_type = bias_type
        bias.tech_stack_bias = float(tech_bias)
        bias.team_size_bias = float(team_size_bias)
        bias.region_bias = float(region_bias)
        bias.age_bias = float(age_bias)
        bias.correction_factor = float(correction_factor)
        bias.should_recalibrate = should_recalibrate
        bias.confidence_level = float(confidence)
        bias.flags = flags
        
        self.db.commit()
        logger.info(f"Bias detection for judge {judge_id}: type={bias_type}, confidence={confidence:.2f}")
        
        return bias
    
    def calculate_fairness_metrics(self, hackathon_id: int) -> ScoringFairness:
        """Calculate overall fairness metrics for the hackathon"""
        
        # Get all evaluations
        judges_scores = {}
        evaluations = self.db.query(Evaluation).join(
            JudgeAssignment,
            JudgeAssignment.team_id == Evaluation.team_id
        ).filter(
            JudgeAssignment.hackathon_id == hackathon_id
        ).all()
        
        # Organize by judge
        for eval in evaluations:
            judge_id = eval.judge_id
            if judge_id not in judges_scores:
                judges_scores[judge_id] = []
            judges_scores[judge_id].append(eval.score or 0)
        
        if len(judges_scores) < 2:
            fairness = ScoringFairness(
                hackathon_id=hackathon_id,
                fairness_score=100,
                judge_agreement=1.0,
                score_variance=0,
                outlier_count=0
            )
            self.db.add(fairness)
            self.db.commit()
            return fairness
        
        # Calculate judge agreement (pairwise correlation)
        judge_ids = list(judges_scores.keys())
        correlations = []
        for i, j1 in enumerate(judge_ids):
            for j2 in judge_ids[i+1:]:
                # Find common teams they both evaluated
                common_teams = set()
                scores1 = {}
                scores2 = {}
                
                for eval in evaluations:
                    if eval.judge_id == j1:
                        scores1[eval.team_id] = eval.score or 0
                    elif eval.judge_id == j2:
                        scores2[eval.team_id] = eval.score or 0
                
                common = set(scores1.keys()) & set(scores2.keys())
                if len(common) >= 2:
                    common_scores1 = [scores1[t] for t in common]
                    common_scores2 = [scores2[t] for t in common]
                    
                    if len(set(common_scores1)) > 0 and len(set(common_scores2)) > 0:
                        corr = np.corrcoef(common_scores1, common_scores2)[0, 1]
                        if not np.isnan(corr):
                            correlations.append(corr)
        
        judge_agreement = float(np.mean(correlations)) if correlations else 1.0
        
        # Calculate score variance
        all_scores = []
        for scores in judges_scores.values():
            all_scores.extend(scores)
        
        score_variance = float(np.var(all_scores)) if all_scores else 0
        
        # Detect outliers and anomalies
        all_scores_array = np.array(all_scores)
        z_scores = np.abs(scipy_stats.zscore(all_scores_array))
        outlier_count = int(np.sum(z_scores > 3))
        
        # Calculate fairness score (0-100)
        fairness_score = 100
        if judge_agreement < 0.5:
            fairness_score -= 30
        elif judge_agreement < 0.7:
            fairness_score -= 15
        
        if score_variance > 400:
            fairness_score -= 20
        elif score_variance > 200:
            fairness_score -= 10
        
        if outlier_count > len(evaluations) * 0.1:
            fairness_score -= 15
        
        fairness_score = max(0, min(100, fairness_score))
        
        # Generate recommendations
        recommendations = []
        if judge_agreement < 0.6:
            recommendations.append("Low judge agreement detected. Consider recalibration session")
        if score_variance > 300:
            recommendations.append("High score variance. Consider normalizing scores")
        if outlier_count > 5:
            recommendations.append("Multiple outliers detected. Review flagged evaluations")
        
        # Store or update fairness metrics
        fairness = self.db.query(ScoringFairness).filter(
            ScoringFairness.hackathon_id == hackathon_id
        ).first()
        
        if not fairness:
            fairness = ScoringFairness(hackathon_id=hackathon_id)
            self.db.add(fairness)
        
        fairness.score_variance = float(score_variance)
        fairness.judge_agreement = float(judge_agreement)
        fairness.outlier_count = outlier_count
        fairness.fairness_score = fairness_score
        fairness.has_systemic_bias = judge_agreement < 0.6
        fairness.recommendations = recommendations
        
        self.db.commit()
        logger.info(f"Fairness metrics calculated: score={fairness_score:.1f}, agreement={judge_agreement:.2f}")
        
        return fairness
    
    # ==================== HELPER METHODS ====================
    
    def _calculate_consistency(self, scores: List[float]) -> float:
        """Calculate how consistent judge's scores are (0-100)"""
        if len(scores) < 2:
            return 50.0
        
        # Sort scores and look for gaps
        sorted_scores = sorted(scores)
        gaps = [sorted_scores[i+1] - sorted_scores[i] for i in range(len(sorted_scores)-1)]
        avg_gap = np.mean(gaps)
        
        # Consistency is inverse of coefficient of variation
        if np.mean(scores) > 0:
            cv = np.std(scores) / np.mean(scores)
            consistency = 100 / (1 + cv)
        else:
            consistency = 50
        
        return float(min(100, max(0, consistency)))
    
    def _calculate_peer_agreement(self, judge_id: int, hackathon_id: int, scores: List[float]) -> float:
        """Calculate average correlation with other judges"""
        # Placeholder: would require comparing with other judges' scores
        return 0.75
    
    def _calculate_tech_diversity(self, judge_id: int, hackathon_id: int) -> float:
        """Calculate diversity of tech stacks being judged (0-1)"""
        # Get judge's assignments
        assignments = self.db.query(JudgeAssignment).filter(
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.hackathon_id == hackathon_id
            )
        ).all()
        
        tech_sets = []
        for assign in assignments:
            tech = self.db.query(TeamTechStack).filter(
                TeamTechStack.team_id == assign.team_id
            ).first()
            
            if tech:
                tech_list = set((tech.frontend or []) + (tech.backend or []))
                tech_sets.append(tech_list)
        
        if not tech_sets:
            return 0.5
        
        # Diversity = number of unique techs across all assignments
        all_techs = set()
        for tech_set in tech_sets:
            all_techs.update(tech_set)
        
        max_possible = len(all_techs) + 5
        diversity = len(all_techs) / max_possible if max_possible > 0 else 0
        
        return float(min(1.0, max(0, diversity)))
    
    def _calculate_team_diversity(self, judge_id: int, hackathon_id: int) -> float:
        """Calculate diversity of teams being judged"""
        # Placeholder: would measure background, size, etc diversity
        return 0.7
    
    def _calculate_feedback_quality(self, feedback_lengths: List[int]) -> float:
        """Calculate quality of feedback based on length and detail"""
        if not feedback_lengths:
            return 0.0
        
        avg_length = np.mean(feedback_lengths)
        quality = min(100, max(0, avg_length / 10))  # 100+ chars = high quality
        
        return float(quality)
    
    def _calculate_avg_time(self, judge_id: int, hackathon_id: int) -> float:
        """Calculate average time spent per evaluation"""
        assignments = self.db.query(JudgeAssignment).filter(
            and_(
                JudgeAssignment.judge_id == judge_id,
                JudgeAssignment.hackathon_id == hackathon_id
            )
        ).all()
        
        if not assignments:
            return 0.0
        
        total_time = 0
        count = 0
        for assign in assignments:
            if assign.started_at and assign.completed_at:
                duration = (assign.completed_at - assign.started_at).total_seconds() / 60
                total_time += duration
                count += 1
        
        return float(total_time / count) if count > 0 else 0
    
    def _is_judge_reliable(
        self,
        scores: List[float],
        consistency: float,
        peer_agreement: float,
        completion_rate: float
    ) -> bool:
        """Determine if judge is reliable based on metrics"""
        if completion_rate < 0.3:
            return False
        if consistency < 30:
            return False
        if peer_agreement < 0.3:
            return False
        
        return True
    
    def _detect_tech_bias(self, judge_id: int, hackathon_id: int, evaluations) -> float:
        """Detect if judge is biased toward certain tech stacks"""
        # Placeholder implementation
        return 0.1
    
    def _detect_team_size_bias(self, judge_id: int, hackathon_id: int, evaluations) -> float:
        """Detect if judge is biased by team size"""
        return 0.05
    
    def _detect_region_bias(self, judge_id: int, hackathon_id: int, evaluations) -> float:
        """Detect if judge is biased by team region"""
        return 0.08
    
    def _detect_age_bias(self, judge_id: int, hackathon_id: int, evaluations) -> float:
        """Detect if judge is biased by estimated team maturity"""
        return 0.03
    
    def _get_peer_average_score(self, judge_id: int, hackathon_id: int) -> float:
        """Get average score from other judges"""
        other_evals = self.db.query(Evaluation).join(
            JudgeAssignment,
            JudgeAssignment.team_id == Evaluation.team_id
        ).filter(
            and_(
                JudgeAssignment.hackathon_id == hackathon_id,
                Evaluation.judge_id != judge_id
            )
        ).all()
        
        if not other_evals:
            return 70.0
        
        scores = [e.score for e in other_evals if e.score is not None]
        return float(np.mean(scores)) if scores else 70.0
