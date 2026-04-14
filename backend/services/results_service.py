"""
Results Service - Calculate leaderboard with z-score normalization
"""
import logging
from typing import Dict, List
from statistics import mean, stdev
from sqlalchemy.orm import Session
from models import Evaluation, EvaluationScore, Hackathon, HackathonJudge

logger = logging.getLogger(__name__)


class ResultsCalculator:
    """Calculate leaderboard with z-score normalization"""

    @staticmethod
    def calculate_z_score_normalization(scores: List[float]) -> Dict[float, float]:
        """
        Calculate z-scores for list of scores

        z = (x - μ) / σ

        Returns: {original_score: z_score}
        """
        if len(scores) < 2:
            # Can't calculate std dev with < 2 values
            return {score: 0.0 for score in scores}

        try:
            mu = mean(scores)
            sigma = stdev(scores)

            if sigma == 0:
                # All scores identical
                return {score: 0.0 for score in scores}

            z_scores = {}
            for score in scores:
                z = (score - mu) / sigma
                z_scores[score] = z

            return z_scores

        except Exception as e:
            logger.error(f"Z-score calculation error: {str(e)}")
            # Fallback: return all zeros
            return {score: 0.0 for score in scores}

    @staticmethod
    def calculate_team_scores(
        db: Session,
        hackathon_id: int,
        include_rounds: List[int] = None
    ) -> Dict:
        """
        Calculate final scores for all teams

        Process:
        1. Get all evaluations for hackathon
        2. Group by team
        3. Calculate weighted average per evaluation
        4. Normalize across teams
        5. Rank
        """

        hackathon = db.query(Hackathon).filter(Hackathon.id == hackathon_id).first()
        if not hackathon:
            raise ValueError("Hackathon not found")

        # Get all finalized evaluations
        evaluations = db.query(Evaluation).filter(
            Evaluation.hackathon_id == hackathon_id,
            Evaluation.is_finalized == True
        ).all()

        if not evaluations:
            raise ValueError("No evaluations found")

        # Calculate team scores
        team_scores: Dict[int, List[float]] = {}  # {team_id: [scores]}
        team_info: Dict[int, Dict] = {}  # {team_id: {name, members}}

        for evaluation in evaluations:
            team_id = evaluation.team_id

            if team_id not in team_scores:
                team_scores[team_id] = []
                team_info[team_id] = {
                    "name": evaluation.team.name,
                    "member_count": len(evaluation.team.members) if evaluation.team.members else 0,
                    "project": evaluation.team.project.title if evaluation.team.project else "N/A"
                }

            # Calculate weighted average for this evaluation
            criteria_scores = []
            total_weight = 0
            weighted_sum = 0

            for score in evaluation.scores:
                criteria = score.criteria
                weight = criteria.weight or 1.0

                weighted_sum += score.score * weight
                total_weight += weight
                criteria_scores.append(score.score)

            if total_weight > 0:
                avg_score = weighted_sum / total_weight
            else:
                avg_score = mean(criteria_scores) if criteria_scores else 0

            team_scores[team_id].append(avg_score)

        # Calculate final scores and z-scores
        all_final_scores = []
        team_results = []

        for team_id, scores in team_scores.items():
            final_score = mean(scores) if scores else 0
            all_final_scores.append(final_score)
            team_results.append({
                "team_id": team_id,
                "scores": scores,
                "final_score": final_score
            })

        # Calculate z-scores
        z_map = ResultsCalculator.calculate_z_score_normalization(all_final_scores)

        # Add z-scores to results
        for result in team_results:
            result["z_score"] = z_map.get(result["final_score"], 0)

        # Sort by final score descending
        team_results.sort(key=lambda x: x["final_score"], reverse=True)

        # Format response with ranking
        leaderboard = []
        for rank, result in enumerate(team_results, start=1):
            team_id = result["team_id"]
            leaderboard.append({
                "rank": rank,
                "team_id": team_id,
                "team_name": team_info[team_id]["name"],
                "final_score": round(result["final_score"], 2),
                "z_score": round(result["z_score"], 3),
                "member_count": team_info[team_id]["member_count"],
                "project_title": team_info[team_id]["project"],
                "evaluations_count": len(result["scores"]),
                "scores_by_evaluation": [round(s, 2) for s in result["scores"]]
            })

        # Statistics
        stats = {
            "mean": round(mean(all_final_scores), 2) if all_final_scores else 0,
            "std_dev": round(stdev(all_final_scores), 2) if len(all_final_scores) > 1 else 0,
            "highest_score": round(max(all_final_scores), 2) if all_final_scores else 0,
            "lowest_score": round(min(all_final_scores), 2) if all_final_scores else 0,
            "total_teams": len(leaderboard),
            "total_evaluations": len(evaluations)
        }

        return {
            "status": "success",
            "leaderboard": leaderboard,
            "statistics": stats
        }

    @staticmethod
    def get_judge_assignments(
        db: Session,
        hackathon_id: int
    ) -> List[Dict]:
        """
        Get summary of judge assignments

        Returns:
            [{
                "judge_id": 1,
                "judge_name": "Alice",
                "teams_assigned": 5,
                "evaluations_completed": 5,
                "completion_percentage": 100,
                "scores_breakdown": {...}
            }, ...]
        """

        # Get all judges for this hackathon
        judges = db.query(HackathonJudge).filter(
            HackathonJudge.hackathon_id == hackathon_id
        ).all()

        results = []

        for judge_assignment in judges:
            judge = judge_assignment.judge

            # Get all evaluations by this judge
            evaluations = db.query(Evaluation).filter(
                Evaluation.judge_id == judge.id,
                Evaluation.hackathon_id == hackathon_id
            ).all()

            # Get assigned teams
            from models import Team
            teams = db.query(Team).filter(Team.hackathon_id == hackathon_id).all()

            # Calculate stats
            completed_count = sum(1 for e in evaluations if e.is_finalized)
            total_assigned = len(teams)  # Simplified: assume all teams assigned

            # Score breakdown
            scores_breakdown = {}
            for evaluation in evaluations:
                if evaluation.is_finalized:
                    team_name = evaluation.team.name
                    avg_score = mean([s.score for s in evaluation.scores]) if evaluation.scores else 0

                    scores_breakdown[team_name] = {
                        "avg": round(avg_score, 1),
                        "count": len(evaluation.scores)
                    }

            results.append({
                "judge_id": judge.id,
                "judge_name": judge.full_name,
                "teams_assigned": total_assigned,
                "evaluations_completed": completed_count,
                "completion_percentage": int((completed_count / total_assigned * 100) if total_assigned > 0 else 0),
                "scores_breakdown": scores_breakdown
            })

        return results
