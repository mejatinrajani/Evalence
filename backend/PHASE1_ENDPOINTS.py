"""
Phase 1 API Endpoints for Evalence Hackathon Platform
- Team Submission Portal
- Judge Assignment
- Organizer Dashboard
- Results & Leaderboard
"""

# Add these imports to main.py:
# from services.phase1_service import (
#     ProjectSubmissionService, JudgeAssignmentService, 
#     ResultsService, AnalyticsService
# )

# ============================================================
# TEAM SUBMISSION PORTAL ENDPOINTS
# ============================================================

# @app.get("/api/projects/my-submission", tags=["projects"])
# def get_team_submission(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Get team's project submission for a hackathon"""
#     try:
#         # Find team for current user
#         team = db.query(models.Team).join(
#             models.ParticipantRegistration,
#             models.ParticipantRegistration.team_id == models.Team.id
#         ).filter(
#             and_(
#                 models.ParticipantRegistration.user_id == current_user.id,
#                 models.Team.hackathon_id == hackathon_id
#             )
#         ).first()
#         
#         if not team:
#             raise HTTPException(status_code=404, detail="Team not found for this user")
#         
#         project = ProjectSubmissionService.get_team_submission(hackathon_id, team.id, db)
#         
#         if not project:
#             raise HTTPException(status_code=404, detail="No project submission found")
#         
#         return schemas.ProjectSubmissionResponse.from_orm(project)
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error retrieving submission: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/projects/submit", response_model=schemas.ProjectSubmissionResponse, tags=["projects"])
# def submit_project(request: schemas.ProjectSubmissionRequest, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Submit or update project for evaluation"""
#     try:
#         # Find team for current user
#         team = db.query(models.Team).join(
#             models.ParticipantRegistration,
#             models.ParticipantRegistration.team_id == models.Team.id
#         ).filter(
#             and_(
#                 models.ParticipantRegistration.user_id == current_user.id,
#                 models.Team.hackathon_id == request.hackathon_id
#             )
#         ).first()
#         
#         if not team:
#             raise HTTPException(status_code=403, detail="You are not a member of any team in this hackathon")
#         
#         # Check deadline
#         hackathon = db.query(models.Hackathon).get(request.hackathon_id)
#         if hackathon.status not in ['submission', 'evaluating']:
#             raise HTTPException(status_code=400, detail="Submission window is closed")
#         
#         project_data = request.dict()
#         project_data['action'] = 'submit'
#         
#         project = ProjectSubmissionService.submit_or_update_project(
#             team.id, request.hackathon_id, current_user.id, project_data, db
#         )
#         
#         return schemas.ProjectSubmissionResponse.from_orm(project)
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error submitting project: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.put("/api/projects/{project_id}", response_model=schemas.ProjectSubmissionResponse, tags=["projects"])
# def update_project(project_id: int, request: schemas.ProjectUpdateRequest, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Update existing project before submission"""
#     try:
#         project = db.query(models.Project).get(project_id)
#         if not project:
#             raise HTTPException(status_code=404, detail="Project not found")
#         
#         # Verify ownership
#         team = db.query(models.Team).join(
#             models.ParticipantRegistration,
#             models.ParticipantRegistration.team_id == models.Team.id
#         ).filter(
#             and_(
#                 models.ParticipantRegistration.user_id == current_user.id,
#                 models.Team.id == project.team_id
#             )
#         ).first()
#         
#         if not team:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         if project.submission_status == 'submitted':
#             raise HTTPException(status_code=400, detail="Cannot update submitted projects")
#         
#         project_data = request.dict(exclude_unset=True)
#         project_data['action'] = 'updated'
#         
#         project = ProjectSubmissionService.submit_or_update_project(
#             project.team_id, project.hackathon_id, current_user.id, project_data, db
#         )
#         
#         return schemas.ProjectSubmissionResponse.from_orm(project)
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error updating project: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.delete("/api/projects/{project_id}", tags=["projects"])
# def delete_project(project_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Delete/withdraw project submission"""
#     try:
#         project = db.query(models.Project).get(project_id)
#         if not project:
#             raise HTTPException(status_code=404, detail="Project not found")
#         
#         if project.submission_status == 'submitted':
#             raise HTTPException(status_code=400, detail="Cannot delete submitted projects")
#         
#         db.delete(project)
#         db.commit()
#         return {"status": "deleted"}
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error deleting project: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/projects/{project_id}/submission-history", tags=["projects"])
# def get_submission_history(project_id: int, db: Session = Depends(get_db)):
#     """Get audit trail of project submissions"""
#     try:
#         history = ProjectSubmissionService.get_submission_history(project_id, db)
#         return [schemas.ProjectSubmissionLogResponse.from_orm(log) for log in history]
#     except Exception as e:
#         logger.error(f"Error retrieving history: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# JUDGE ASSIGNMENT ENDPOINTS
# ============================================================

# @app.get("/api/organizer/hackathons/{hackathon_id}/assignment-status", tags=["judge-assignment"])
# def get_assignment_status(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Get overview of judge assignments"""
#     try:
#         # Verify organizer permission
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         status = JudgeAssignmentService.get_assignment_status(hackathon_id, db)
#         return status
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting assignment status: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/organizer/judge-assignments/assign", response_model=schemas.JudgeAssignmentResponse, tags=["judge-assignment"])
# def assign_judge_to_team(request: schemas.AssignJudgeRequest, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Manually assign judge to team for a round"""
#     try:
#         # Verify organizer
#         hackathon = db.query(models.Hackathon).get(request.hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         # Check for conflicts
#         if JudgeAssignmentService.check_conflict(request.judge_id, request.team_id, request.hackathon_id, db):
#             raise HTTPException(status_code=409, detail="Conflict of interest detected")
#         
#         assignment = JudgeAssignmentService.assign_judge_to_team(
#             request.judge_id, request.team_id, request.round_id, request.hackathon_id, db
#         )
#         
#         return schemas.JudgeAssignmentResponse.from_orm(assignment)
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error assigning judge: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/organizer/judge-assignments/batch-assign", tags=["judge-assignment"])
# def batch_assign_judges(request: schemas.BatchAssignRequest, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Assign judges in bulk"""
#     try:
#         # Verify organizer
#         hackathon = db.query(models.Hackathon).get(request.hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         # Parse CSV if provided
#         assignments = []
#         if request.csv_data:
#             import csv
#             import io
#             reader = csv.DictReader(io.StringIO(request.csv_data))
#             assignments = list(reader)
#         
#         result = JudgeAssignmentService.batch_assign_judges(
#             request.hackathon_id, request.round_id, assignments, db
#         )
#         
#         return result
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error batch assigning judges: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.post("/api/organizer/conflicts-of-interest/record", response_model=schemas.ConflictResponse, tags=["judge-assignment"])
# def record_conflict(request: schemas.ConflictRequest, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Record a conflict of interest"""
#     try:
#         # Verify organizer
#         hackathon = db.query(models.Hackathon).get(request.hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         conflict = models.ConflictOfInterest(
#             judge_id=request.judge_id,
#             team_id=request.team_id,
#             hackathon_id=request.hackathon_id,
#             reason=request.reason,
#             created_by_id=current_user.id
#         )
#         db.add(conflict)
#         db.commit()
#         
#         judge = db.query(models.User).get(request.judge_id)
#         team = db.query(models.Team).get(request.team_id)
#         
#         return schemas.ConflictResponse(
#             id=conflict.id,
#             judge_id=judge.id,
#             judge_name=judge.full_name,
#             team_id=team.id,
#             team_name=team.name,
#             reason=conflict.reason,
#             created_at=conflict.created_at
#         )
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error recording conflict: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ORGANIZER DASHBOARD ENDPOINTS
# ============================================================

# @app.get("/api/organizer/hackathons/{hackathon_id}/evaluation-progress", tags=["organizer-dashboard"])
# def get_evaluation_progress(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Get evaluation progress by round"""
#     try:
#         # Verify organizer
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         progress = AnalyticsService.get_evaluation_progress(hackathon_id, db)
#         return progress
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting evaluation progress: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/organizer/hackathons/{hackathon_id}/judge-performance", tags=["organizer-dashboard"])
# def get_judge_performance(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Get judge performance metrics"""
#     try:
#         # Verify organizer
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         performance = AnalyticsService.get_judge_performance(hackathon_id, db)
#         return performance
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting judge performance: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/organizer/hackathons/{hackathon_id}/bottlenecks", tags=["organizer-dashboard"])
# def identify_bottlenecks(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Identify bottlenecks in evaluation process"""
#     try:
#         # Verify organizer
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         bottlenecks = AnalyticsService.identify_bottlenecks(hackathon_id, db)
#         return bottlenecks
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error identifying bottlenecks: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.get("/api/organizer/hackathons/{hackathon_id}/event-status", tags=["organizer-dashboard"])
# def get_event_status(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Get current event status"""
#     try:
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         return {
#             "current_phase": hackathon.status,
#             "can_transition_to_next": True,
#             "time_remaining_in_phase": None
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting event status: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.put("/api/organizer/hackathons/{hackathon_id}/transition-phase", tags=["organizer-dashboard"])
# def transition_hackathon_phase(hackathon_id: int, request: schemas.PhaseTransitionRequest, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Transition hackathon to next phase"""
#     try:
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         hackathon.status = request.new_phase
#         db.commit()
#         
#         logger.info(f"Hackathon {hackathon_id} transitioned to {request.new_phase}")
#         return {
#             "current_phase": hackathon.status,
#             "transitioned_at": datetime.utcnow()
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error transitioning phase: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# RESULTS & LEADERBOARD ENDPOINTS
# ============================================================

# @app.get("/api/results/leaderboard", tags=["results"])
# def get_leaderboard(hackathon_id: int, db: Session = Depends(get_db)):
#     """Get public leaderboard"""
#     try:
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.status != 'results':
#             raise HTTPException(status_code=400, detail="Results not yet published")
#         
#         leaderboard = ResultsService.get_leaderboard(hackathon_id, db)
#         
#         return {
#             "hackathon_id": hackathon_id,
#             "hackathon_name": hackathon.name,
#             "published_at": datetime.utcnow(),
#             "entries": leaderboard,
#             "total_teams": len(leaderboard),
#             "last_updated": datetime.utcnow()
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error getting leaderboard: {e}")
#         raise HTTPException(status_code=500, detail=str(e))


# @app.put("/api/organizer/hackathons/{hackathon_id}/publish-results", tags=["results"])
# def publish_results(hackathon_id: int, current_user: schemas.UserResponse = Depends(get_current_user), db: Session = Depends(get_db)):
#     """Publish final results"""
#     try:
#         hackathon = db.query(models.Hackathon).get(hackathon_id)
#         if not hackathon or hackathon.mentor_id != current_user.id:
#             raise HTTPException(status_code=403, detail="Unauthorized")
#         
#         hackathon.status = 'results'
#         db.commit()
#         
#         # Calculate final scores
#         rounds = db.query(models.Round).filter(models.Round.hackathon_id == hackathon_id).all()
#         for round_obj in rounds:
#             final_scores = ResultsService.calculate_final_scores(hackathon_id, round_obj.id, db)
#         
#         logger.info(f"Results published for hackathon {hackathon_id}")
#         return {
#             "status": "published",
#             "published_at": datetime.utcnow(),
#             "team_count": db.query(models.Team).filter(models.Team.hackathon_id == hackathon_id).count()
#         }
#     except HTTPException:
#         raise
#     except Exception as e:
#         logger.error(f"Error publishing results: {e}")
#         raise HTTPException(status_code=500, detail=str(e))

