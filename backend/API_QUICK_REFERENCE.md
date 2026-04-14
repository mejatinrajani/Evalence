# API Quick Reference - New Features

## 🎯 Feedback System

### Add Judge Feedback
```bash
curl -X POST http://localhost:8000/api/evaluations/123/feedback \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "feedback": "Strong technical execution",
    "suggestions": "Add unit tests and documentation"
  }'
```

### Get Team Feedback
```bash
curl http://localhost:8000/api/teams/1/feedback \
  -H "Authorization: Bearer {token}"
```

---

## 📊 Results & Analytics

### Export Results (JSON)
```bash
curl http://localhost:8000/api/me/hackathons/1/results/export?format=json \
  -H "Authorization: Bearer {token}"
```

### Export Results (CSV)
```bash
curl http://localhost:8000/api/me/hackathons/1/results/export?format=csv \
  -H "Authorization: Bearer {token}"
```

### Judge Performance
```bash
curl http://localhost:8000/api/me/hackathons/1/judge-performance \
  -H "Authorization: Bearer {token}"
```

### Team Progress
```bash
curl http://localhost:8000/api/me/hackathons/1/team-progress \
  -H "Authorization: Bearer {token}"
```

---

## 🚨 Appeals System

### Submit Appeal
```bash
curl -X POST http://localhost:8000/api/teams/1/appeals \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "evaluation_id": 123,
    "reason": "Scorer misunderstood our approach"
  }'
```

### Get Appeals (Organizer)
```bash
curl "http://localhost:8000/api/me/hackathons/1/appeals?status=pending" \
  -H "Authorization: Bearer {token}"
```

### Review Appeal
```bash
curl -X PUT http://localhost:8000/api/me/appeals/45/review \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "approved",
    "review_notes": "Appeal valid. Evaluator will reconsider."
  }'
```

---

## 🤖 Auto-Assignment

### Auto-Assign Judges
```bash
curl -X POST http://localhost:8000/api/me/hackathons/1/auto-assign-judges \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "balanced_workload": true,
    "judges_per_team": 3,
    "exclude_judge_ids": []
  }'
```

---

## 🔔 Notifications

### WebSocket Connection (JavaScript)
```javascript
const socket = new WebSocket(`ws://localhost:8000/ws/notifications/101`);

socket.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log(notification);
  // {
  //   "type": "notification",
  //   "title": "Evaluation Complete",
  //   "message": "Team A scores ready",
  //   "sent_at": "2024-01-15T10:30:00Z"
  // }
};
```

### Send Notification (REST)
```bash
curl -X POST http://localhost:8000/api/notifications/send \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Scores Posted",
    "message": "All evaluations complete",
    "recipient_ids": [101, 102, 103]
  }'
```

---

## 📋 Request/Response Examples

### Feedback Request
```json
{
  "feedback": "Excellent innovation and execution",
  "suggestions": "Consider adding mobile support and accessibility features"
}
```

### Feedback Response
```json
{
  "message": "Feedback added successfully",
  "evaluation_id": 123
}
```

### Appeal Request
```json
{
  "evaluation_id": 456,
  "reason": "Judge may have missed key architectural decisions explained in presentation"
}
```

### Appeal Response (Submit)
```json
{
  "appeal_id": 45,
  "status": "pending",
  "message": "Appeal submitted successfully. The organizer will review it shortly.",
  "submitted_at": "2024-01-15T10:30:00Z"
}
```

### Appeal Review Request
```json
{
  "status": "approved",
  "review_notes": "Upon review, the appeal is valid. Judge will re-evaluate."
}
```

### Results Export Response (JSON)
```json
{
  "format": "json",
  "results": [
    {
      "rank": 1,
      "team_id": 1,
      "team_name": "Team Alpha",
      "members": [
        {"name": "Alice", "email": "alice@example.com"},
        {"name": "Bob", "email": "bob@example.com"}
      ],
      "project_title": "AI-Powered Analytics",
      "project_url": "https://github.com/teamalpha/project",
      "demo_url": "https://demo.teamalpha.com",
      "average_score": 94.5,
      "evaluation_count": 3,
      "tech_stack": ["React", "Python", "FastAPI"]
    },
    {
      "rank": 2,
      "team_id": 2,
      "team_name": "Team Beta",
      "average_score": 88.0,
      ...
    }
  ],
  "exported_at": "2024-01-15T10:30:00Z"
}
```

### Judge Performance Response
```json
{
  "hackathon_id": 1,
  "total_judges": 5,
  "judges": [
    {
      "judge_id": 101,
      "total_assigned": 20,
      "completed": 18,
      "in_progress": 1,
      "pending": 1,
      "avg_completion_time": 2.5,
      "consistency_score": 87.5
    },
    {
      "judge_id": 102,
      "total_assigned": 18,
      "completed": 18,
      "in_progress": 0,
      "pending": 0,
      "avg_completion_time": 2.1,
      "consistency_score": 92.0
    }
  ]
}
```

### Team Progress Response
```json
{
  "hackathon_id": 1,
  "total_teams": 10,
  "teams": [
    {
      "team_id": 1,
      "team_name": "Team Alpha",
      "members_count": 4,
      "project_submitted": true,
      "project_title": "AI Analytics Platform",
      "total_judges_assigned": 3,
      "evaluations_completed": 3,
      "evaluation_progress": 100.0
    },
    {
      "team_id": 2,
      "team_name": "Team Beta",
      "members_count": 3,
      "project_submitted": true,
      "project_title": "Web3 Marketplace",
      "total_judges_assigned": 3,
      "evaluations_completed": 2,
      "evaluation_progress": 66.67
    }
  ]
}
```

### Auto-Assign Response
```json
{
  "message": "Auto-assignment completed",
  "assignments_created": 30,
  "total_judges": 10,
  "total_teams": 10,
  "rounds_processed": 3
}
```

---

## 🔐 Authentication Header

All endpoints require JWT token:
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get Token:**
```bash
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"
```

---

## 🔑 Role Requirements

| Feature | Required Role |
|---------|---------------|
| Add Feedback | judge, super_admin |
| Submit Appeal | participant, judge, mentor |
| Review Appeal | mentor, super_admin |
| View Judge Performance | mentor, super_admin |
| Auto-Assign Judges | mentor, super_admin |
| Export Results | mentor, super_admin |
| Send Notifications | mentor, super_admin |
| Team Progress | mentor, super_admin |

---

## ⚠️ Error Responses

### 400 Bad Request
```json
{
  "error": true,
  "status_code": 400,
  "detail": "Invalid score for criterion: must be 0-100",
  "path": "/api/judge/evaluations/submit"
}
```

### 403 Forbidden
```json
{
  "error": true,
  "status_code": 403,
  "detail": "Cannot edit finalized evaluation",
  "path": "/api/me/hackathons/1/judge-assignments/123"
}
```

### 404 Not Found
```json
{
  "error": true,
  "status_code": 404,
  "detail": "Appeal not found",
  "path": "/api/me/appeals/999"
}
```

### 500 Internal Server Error
```json
{
  "error": true,
  "status_code": 500,
  "detail": "Failed to fetch dashboard: database connection error",
  "path": "/api/judge/dashboard"
}
```

---

## 📝 Status Values

### Appeal Status
- `pending` - Awaiting organizer review
- `approved` - Appeal accepted, will be addressed
- `rejected` - Appeal denied
- `withdrawn` - Team withdrew appeal

### Judge Assignment Status
- `pending` - Not yet started
- `evaluating` - Currently in progress
- `completed` - All scores submitted

### Notification Type
- `info` - General information
- `warning` - Warning/caution
- `success` - Operation successful
- `error` - Error occurred

---

## 🎓 Common Workflows

### Workflow 1: Judge Leaves Feedback
1. Judge completes evaluation
2. Judge logs detailed feedback
```bash
POST /api/evaluations/{eval_id}/feedback
```
3. Team can view feedback later
```bash
GET /api/teams/{team_id}/feedback
```

### Workflow 2: Team Appeals Score
1. Team views their scores
2. Team submits appeal
```bash
POST /api/teams/{team_id}/appeals
```
3. Organizer reviews and responds
```bash
PUT /api/me/appeals/{appeal_id}/review
```
4. Team notified of decision (via notification)

### Workflow 3: Organizer Gets Results
1. Organizer exports results
```bash
GET /api/me/hackathons/{id}/results/export?format=csv
```
2. Results include all team data and scores
3. Can share CSV with stakeholders

### Workflow 4: Auto-Assign Judges
1. Organizer creates judges
2. Organizer creates teams
3. Organizer calls auto-assign
```bash
POST /api/me/hackathons/{id}/auto-assign-judges
```
4. Judges notified (via WebSocket notification)
5. Each judge sees their assignments in queue

---

## 🔍 Query Parameters

### Results Export
- `format` (optional): "json" or "csv" (default: json)

### Appeals List
- `status_filter` (optional): "pending", "approved", "rejected"

### Judge Progress
- `hackathon_id` (optional): Filter by hackathon

### Team Progress
- Sorted by evaluation_progress DESC (highest first)

---

## 📞 Support

For issues or questions:
1. Check NEW_FEATURES.md for detailed documentation
2. Review IMPLEMENTATION_SUMMARY.md for technical details
3. Check error messages in response for hints
4. Review database models in models.py

---

**API Version:** 2.0.0  
**Last Updated:** 2024
