# Evalence - Professional Hackathon Management Platform

## Project Overview

Evalence is a comprehensive hackathon management platform with:
- **Backend**: FastAPI + PostgreSQL (Neon)
- **Frontend**: React 19 + TypeScript + Vite
- **Authentication**: JWT-based with role-based access control (RBAC)
- **Features**: Hackathon creation, team management, project submissions, live judging, Z-score normalized leaderboards

## System Architecture

### Backend (FastAPI)
```
Backend Stack:
├── FastAPI (REST API framework)
├── SQLAlchemy (ORM)
├── PostgreSQL (Neon - serverless)
├── JWT Authentication (python-jose)
├── Email Service (Gmail SMTP)
└── Connection Pooling (for Neon serverless)
```

### Frontend (React)
```
Frontend Stack:
├── React 19 with TypeScript
├── Vite (build tool)
├── Tailwind CSS (styling)
├── React Router v7 (navigation)
├── Framer Motion (animations)
├── Recharts (data visualization)
└── Sonner (notifications)
```

## Quick Start

### 1. Backend Setup

#### Prerequisites
- Python 3.9+
- PostgreSQL (or Neon account)
- Gmail account with App Password

#### Installation

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env and fill in:
# 1. DATABASE_URL from Neon Dashboard
# 2. Gmail credentials (using App Password)
# 3. Generate new SECRET_KEY using:
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

**Important Security Notes:**
- Never commit `.env` to version control
- Use strong, random `SECRET_KEY`
- Use Gmail App Password (not regular password)
- Rotate credentials regularly

#### Running the Backend

```bash
# Start development server
python main.py

# The API will be available at:
# http://localhost:8000

# Access API documentation:
# http://localhost:8000/docs (Swagger UI)
# http://localhost:8000/redoc (ReDoc)
```

### 2. Frontend Setup

#### Prerequisites
- Node.js 18+
- npm or yarn

#### Installation

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install
```

#### Environment Configuration

```bash
# Create .env file
cp .env.example .env

# Edit .env - ensure API URL matches backend
VITE_API_URL=http://localhost:8000
```

#### Running the Frontend

```bash
# Start development server
npm run dev

# The frontend will be available at:
# http://localhost:5173
```

## User Roles & Permissions

### Super Admin
- Full platform control
- All permissions

### Mentor/Organizer
- Create and manage hackathons
- Manage teams and rounds
- Send announcements
- View evaluations

### Judge
- View assigned teams
- Submit and revise scores
- Access judge queue

### Participant
- Browse hackathons
- Join as team member
- Submit projects
- View leaderboard

## Authentication & Token Management

### Login Flow
1. User submits email and password
2. Backend validates credentials
3. Returns `access_token` (30 min expiry) and `refresh_token` (7 day expiry)
4. Frontend stores both tokens in localStorage
5. All requests include `Authorization: Bearer {access_token}`

### Token Refresh
- When access token expires (401 response)
- Frontend automatically requests new access token using refresh token
- If refresh fails, user is redirected to login

### Logout
- Frontend clears localStorage
- User redirected to login page

## API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user
POST   /api/auth/token             - Login (get tokens)
POST   /api/auth/refresh           - Refresh access token
GET    /api/auth/me                - Get current user profile
PUT    /api/auth/me                - Update profile
```

### Hackathons
```
POST   /api/hackathons             - Create hackathon (mentor)
GET    /api/hackathons             - List hackathons (paginated)
GET    /api/hackathons/{id}        - Get hackathon details
PUT    /api/hackathons/{id}/status - Update status (mentor)
GET    /api/hackathons/{id}/stats  - Get hackathon statistics
```

### Teams
```
GET    /api/hackathons/{id}/teams  - List teams
POST   /api/teams                  - Create team
PUT    /api/teams/{id}             - Update team
DELETE /api/teams/{id}             - Delete team
POST   /api/hackathons/{id}/teams/import - Bulk import from CSV/XLSX
```

### Projects
```
POST   /api/projects               - Submit project
GET    /api/hackathons/{id}/projects - List projects
```

### Evaluations
```
GET    /api/judge/queue            - Get judge evaluation queue
POST   /api/evaluations            - Submit score
```

### Leaderboard
```
GET    /api/hackathons/{id}/leaderboard - Get Z-score ranked standings
```

## Database Schema

### Users
- id, email, hashed_password, full_name, role
- bio, github_url, skills, avatar_url
- created_at, updated_at

### Hackathons
- id, name, description, status
- start_date, end_date, prize_pool, max_teams
- mentor_id (foreign key)
- created_at, updated_at

### Teams
- id, name, members (JSON), hackathon_id
- created_at, updated_at

### Projects
- id, title, description, github_url, demo_url
- tech_stack (JSON), team_id, hackathon_id
- created_at, updated_at

### Evaluations (Judging)
- id, score, feedback
- judge_id, team_id, criterion_id
- created_at, updated_at

### Rounds & Criteria
- Round: id, name, hackathon_id
- Criterion: id, name, max_points, round_id

## Leaderboard Algorithm (Z-Score Normalization)

The platform uses **Z-score normalization** to eliminate bias from different judges:

```
1. For each judge, calculate mean (μ) and standard deviation (σ) of their scores
2. For each team's score from judge J:
   z_score = (score - μ_J) / σ_J
3. Sum all z_scores per team
4. Rank teams by total z_score (descending)
```

This ensures fair ranking regardless of judge grading tendencies.

## Email Configuration

### Setup Gmail SMTP

1. Go to: https://myaccount.google.com/apppasswords
2. Select "Mail" and "Windows Computer" (or your device)
3. Generate App Password (16 characters)
4. Copy to `.env` as `SENDER_PASSWORD` (remove spaces)

### Email Templates
- Welcome email (new registration)
- Hackathon created (to organizer)
- Score submitted (to judge)
- Announcement notification (to participants)
- Leaderboard update (to team members)

## Database Connection (Neon)

### Getting Neon Connection String
1. Create account at https://console.neon.tech
2. Create project
3. Copy connection string
4. Add to `.env` as `DATABASE_URL`

### Connection Pooling
- Pool size: 2 (optimized for serverless)
- Max overflow: 5
- Timeout: 10 seconds
- Pre-ping: enabled (verifies connection)

## Development Workflow

### Running Both Backend & Frontend

**Terminal 1 - Backend:**
```bash
cd backend
python main.py
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

Navigate to `http://localhost:5173`

### Testing User Roles

1. **Create accounts** with different roles (Participant, Judge, Mentor)
2. **Log in** with each account
3. **Verify dashboards** show role-specific features

### Creating Test Data

```bash
# Access Swagger UI
http://localhost:8000/docs

# Test endpoints in order:
1. POST /api/auth/register (create mentor account)
2. POST /api/auth/token (login)
3. POST /api/hackathons (create hackathon)
4. POST /api/teams (add teams)
5. POST /api/projects (submit projects)
6. POST /api/evaluations (score projects)
7. GET /api/hackathons/{id}/leaderboard (view rankings)
```

## Deployment Checklist

- [ ] Generate new `SECRET_KEY`
- [ ] Create Neon production database
- [ ] Update `.env` with production URLs
- [ ] Update CORS origins in `main.py`
- [ ] Update email sender configuration
- [ ] Enable HTTPS
- [ ] Set up database backups
- [ ] Configure monitoring/logging
- [ ] Test all critical flows
- [ ] Update frontend API URL
- [ ] Enable rate limiting
- [ ] Set up CDN for static assets

## Troubleshooting

### Database Connection Issues
```
Error: could not connect to server
Solution: 
1. Verify DATABASE_URL in .env
2. Check Neon connection is active
3. Verify network access (firewall)
```

### Token Expiration
```
Error: 401 Unauthorized
Solution:
1. Frontend auto-refresh is triggered
2. If refresh fails, user redirected to login
3. Check SECRET_KEY consistency between backend and frontend
```

### Email Not Sending
```
Error: EmailService fails silently
Solution:
1. Verify Gmail App Password (not regular password)
2. Check SENDER_EMAIL in .env
3. Enable "Less secure apps" if using Gmail
4. Check SMTP credentials in .env
```

### CORS Issues
```
Error: Access to XMLHttpRequest blocked
Solution:
1. Frontend URL must be in CORS origins
2. Check `allow_origins` in main.py
3. Verify request includes proper headers
```

## Security Best Practices

### Before Production
1. ✅ Change `SECRET_KEY`
2. ✅ Use strong database passwords
3. ✅ Enable HTTPS everywhere
4. ✅ Rotate credentials monthly
5. ✅ Add rate limiting
6. ✅ Enable CORS properly (not `*`)
7. ✅ Use environment variables (not hardcoded)
8. ✅ Add API authentication logging
9. ✅ Set up error monitoring (Sentry)
10. ✅ Regular security audits

## Performance Optimization

### Backend
- [ ] Database indexing on frequently queried fields
- [ ] Connection pooling (already configured)
- [ ] API response caching
- [ ] Query optimization

### Frontend
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Bundle analysis

## Support & Documentation

- API Docs: http://localhost:8000/docs
- GitHub: [repository link]
- Issues: [GitHub issues page]
- Email: support@evalence.com

## License

[License information]

## Contributing

[Contributing guidelines]
