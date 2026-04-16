# Frontend Organization - Visual Guide

## 🎯 Complete Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     REACT APPLICATION                                  │
│                                                                          │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │              COMPONENTS & PAGES                                  │  │
│  │  ├─ pages/dashboard/OrganizerDashboard.tsx                       │  │
│  │  ├─ pages/dashboard/JudgeDashboard.tsx                           │  │
│  │  ├─ pages/dashboard/ParticipantDashboard.tsx                     │  │
│  │  ├─ pages/auth/Login.tsx                                         │  │
│  │  ├─ components/judge/EvaluationsPage.tsx                         │  │
│  │  ├─ components/phase3/AIInsights.tsx                             │  │
│  │  └─ ... (all other components)                                   │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│         ↓ Imports from ↓                                                │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                   LIBRARY LAYER                                  │  │
│  │                                                                  │  │
│  │  import { api, PHASE1_ENDPOINTS } from '@/lib'                 │  │
│  │  import type { Hackathon } from '@/types'                      │  │
│  │                                                                  │  │
│  │  ┌─────────────────────┬──────────────────────┐                │  │
│  │  │                     │                      │                │  │
│  │  ├─ lib/index.ts       ├─ types/index.ts      │                │  │
│  │  │  (Barrel Export)    │  (Barrel Export)     │                │  │
│  │  │                     │                      │                │  │
│  │  └─────────┬───────────┴──────────┬───────────┘                │  │
│  │            │                      │                             │  │
│  │            ↓                      ↓                             │  │
│  │  ┌──────────────────┐   ┌──────────────────┐                   │  │
│  │  │ lib/api.ts       │   │ types/api.ts     │                   │  │
│  │  │ ───────────────  │   │ ──────────────   │                   │  │
│  │  │ • api {}         │   │ • User (i)       │                   │  │
│  │  │ • BASE_URL       │   │ • Hackathon (i)  │                   │  │
│  │  │ • PHASE1_ENDPOINTS
 │   │ • Team (i)       │                   │  │
│  │  │ • PHASE2_ENDPOINTS
 │   │ • Evaluation (i) │                   │  │
│  │  │ • PHASE3_ENDPOINTS
 │   │ • Round (i)      │                   │  │
│  │  │ • ORG_ENDPOINTS │   │ • ... more    │                   │  │
│  │  │                  │   │              │                   │  │
│  │  └───────────────────   └──────────────┘                   │  │
│  │       ↓ Runtime Code        (Pure Types)                  │  │
│  │       (Requests, Auth)       (No Logic)                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                ↓                                    │
│                          HTTP Requests                              │
└─────────────────────────────────────────────────────────────────────┘
         ↓ CORS ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND API (FastAPI)                          │
│  ├─ /api/auth/* (Phase 1)                                           │
│  ├─ /api/hackathons/* (Phase 1)                                     │
│  ├─ /api/judge/* (Phase 2)                                          │
│  ├─ /api/ai/* (Phase 3)                                             │
│  ├─ /api/mentorship/* (Phase 3)                                     │
│  └─ ... (85+ endpoints)                                             │
└─────────────────────────────────────────────────────────────────────┘
         ↓ SQL Queries ↓
┌─────────────────────────────────────────────────────────────────────┐
│               POSTGRESQL DATABASE (Neon)                            │
│  ├─ Phase 1 Tables (15): User, Hackathon, Team, Evaluation, ...    │
│  ├─ Phase 2 Tables (7): RoundEnhanced, Appeal, Notification, ...   │
│  └─ Phase 3 Tables (14): AIScoringModel, MentorshipRequest, ...    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📂 File Tree with Annotations

```
frontend/
├── src/
│   ├── App.tsx
│   │
│   ├── lib/                          ← API Client Layer
│   │   ├── index.ts                  ✨ Barrel export for convenience
│   │   │   └── Re-exports: api, PHASE*_ENDPOINTS, + all types
│   │   │
│   │   └── api.ts                    (Implementation)
│   │       ├── BASE_URL              Configuration
│   │       ├── PHASE1_ENDPOINTS      ~50 endpoints
│   │       ├── PHASE2_ENDPOINTS      ~20 endpoints
│   │       ├── PHASE3_ENDPOINTS      ~15 endpoints
│   │       ├── ORG_ENDPOINTS         ~10 endpoints
│   │       └── api {}                Client (request, get, post, etc.)
│   │
│   ├── types/                        ← Type Definitions Layer
│   │   ├── index.ts                  ✨ Barrel export
│   │   │   └── Re-exports: all types from api.ts
│   │   │
│   │   └── api.ts                    (Type Definitions)
│   │       ├── User, AuthToken, ...  Auth types
│   │       ├── Hackathon, Team, ...  Domain types
│   │       ├── Evaluation, Round, ...Feature types
│   │       ├── JudgeAssignment, ...  Phase 2 types
│   │       ├── AIScoringModel, ...   Phase 3 types
│   │       └── ApiResponse, ...      Utility types
│   │
│   ├── components/                   ← Presentational Layer
│   │   ├── judge/
│   │   │   ├── EvaluationsPage.tsx   (imports from @/lib)
│   │   │   ├── MyRatingsPage.tsx
│   │   │   └── JudgeStatsPage.tsx
│   │   │
│   │   ├── phase3/
│   │   │   ├── AIInsights.tsx        (imports from @/lib)
│   │   │   ├── MentorshipMatching.tsx
│   │   │   ├── TeamMessaging.tsx
│   │   │   ├── AchievementsBadges.tsx
│   │   │   ├── AdvancedReporting.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── organizer/
│   │   │   ├── JudgeManagement.tsx   (imports from @/lib)
│   │   │   ├── CriteriaManager.tsx
│   │   │   └── ...
│   │   │
│   │   ├── Layout.tsx
│   │   ├── DashboardLayout.tsx
│   │   └── ...
│   │
│   ├── pages/                        ← Page Components (Route Views)
│   │   ├── auth/
│   │   │   ├── Login.tsx             (imports from @/lib)
│   │   │   ├── Register.tsx
│   │   │   └── ...
│   │   │
│   │   ├── dashboard/
│   │   │   ├── OrganizerDashboard.tsx(imports from @/lib)
│   │   │   ├── JudgeDashboard.tsx
│   │   │   ├── ParticipantDashboard.tsx
│   │   │   └── ...
│   │   │
│   │   ├── LandingPage.tsx           (imports from @/lib)
│   │   ├── Leaderboard.tsx
│   │   └── ...
│   │
│   ├── assets/                       ← Static Files
│   │   ├── images/
│   │   └── fonts/
│   │
│   ├── index.css
│   └── main.tsx
│
├── public/
│
├── tsconfig.json                     ← TypeScript Config (main)
├── tsconfig.app.json                 ← TypeScript Config (app)
│   └── Contains: baseUrl, paths aliases ✅ CONFIGURED
│
├── tsconfig.node.json                ← TypeScript Config (build tools)
│
├── vite.config.ts                    ← Vite Config
│   └── Contains: resolve.alias configuration ✅ CONFIGURED
│
├── eslint.config.js
├── package.json
└── package-lock.json
```

---

## 🔄 Import Flow Examples

### Example 1: Fetch Hackathons in OrganizerDashboard

```typescript
// pages/dashboard/OrganizerDashboard.tsx

// ✅ Import pattern (recommended)
import { api, ORG_ENDPOINTS } from '@/lib'
import type { Hackathon } from '@/types'

export default function OrganizerDashboard() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])

  useEffect(() => {
    // Use endpoint constant
    const endpoint = ORG_ENDPOINTS.hackathons.myHackathons  // /me/hackathons

    // Make request with auto-complete
    api.get(endpoint)
      .then((data: Hackathon[]) => setHackathons(data))
      .catch(console.error)
  }, [])

  return (
    <div>
      {hackathons.map((h: Hackathon) => (  ← Type-safe
        <div key={h.id}>{h.name}</div>
      ))}
    </div>
  )
}
```

### Example 2: Submit Evaluation in Judge EvaluationsPage

```typescript
// components/judge/EvaluationsPage.tsx

// ✅ Import pattern (recommended)
import { api, PHASE2_ENDPOINTS } from '@/lib'
import type { Evaluation, TeamQueueItem } from '@/types'

export function EvaluationsPage() {
  const [team, setTeam] = useState<TeamQueueItem | null>(null)

  const handleSubmit = async (scores: Record<number, number>) => {
    try {
      // Use endpoint constant
      const endpoint = PHASE2_ENDPOINTS.judge.submit

      // Make typed request
      const result = await api.post(endpoint, {
        team_id: team?.team_id,
        round_id: team?.round_id,
        scores: scores,
      })
      
      console.log('Submission successful:', result)
    } catch (error) {
      console.error('Failed to submit:', error)
    }
  }

  return (
    <div>
      {team && (
        <TeamEvaluationForm
          team={team}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
```

### Example 3: AI Insights Component

```typescript
// components/phase3/AIInsights.tsx

// ✅ Import pattern (recommended)
import { api, PHASE3_ENDPOINTS } from '@/lib'
import type { ScoringPrediction } from '@/types'

export function AIInsights() {
  const [predictions, setPredictions] = useState<ScoringPrediction[]>([])

  const loadPredictions = async () => {
    try {
      // Use endpoint constant
      const endpoint = PHASE3_ENDPOINTS.ai.predictions

      // Make typed request
      const data = await api.get(endpoint)
      setPredictions(data)
    } catch (error) {
      console.error('Failed to load:', error)
    }
  }

  return (
    <div>
      <button onClick={loadPredictions}>Load AI Predictions</button>
      {predictions.map((p: ScoringPrediction) => (
        <div key={p.id}>
          Score: {p.predicted_score}
          Confidence: {p.confidence_level}%
        </div>
      ))}
    </div>
  )
}
```

---

## 🚦 Import Decision Tree

```
What do you need?
│
├─ API Client (api.get, api.post, etc.)
│  └─ import { api } from '@/lib'
│
├─ Endpoint Constants (PHASE1_ENDPOINTS, etc.)
│  └─ import { PHASE1_ENDPOINTS } from '@/lib'
│
├─ Both Client + Endpoints (Most Common)
│  └─ import { api, PHASE1_ENDPOINTS } from '@/lib'
│
├─ Type Definitions (User, Hackathon, etc.)
│  └─ import type { Hackathon } from '@/types'
│
├─ Both Types + API (Full Setup)
│  └─ import { api, PHASE1_ENDPOINTS } from '@/lib'
│     import type { Hackathon, Evaluation } from '@/types'
│
└─ Everything (Rare)
   └─ import { api, PHASE1_ENDPOINTS } from '@/lib'
      import type { ... ALL TYPES ... } from '@/types'
```

---

## 🔗 Alias Path Reference

```
@/           → src/
@/lib        → src/lib/
@/types      → src/types/
@/components → src/components/
@/pages      → src/pages/
@/assets     → src/assets/
```

---

## ✅ Verification Checklist

Tool → Verify configuration:

### TypeScript (`tsconfig.app.json`)
```typescript
// Verify baseUrl is set
"baseUrl": "."

// Verify paths are mapped
"paths": {
  "@/*": ["src/*"],
  "@/lib/*": ["src/lib/*"],
  "@/types/*": ["src/types/*"],
  // ... etc
}
```

### Vite (`vite.config.ts`)
```typescript
// Verify alias is configured
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src'),
    '@/lib': path.resolve(__dirname, './src/lib'),
    '@/types': path.resolve(__dirname, './src/types'),
    // ... etc
  }
}
```

### Barrel Exports
```typescript
// lib/index.ts should exist and re-export:
export { api, BASE_URL, PHASE*_ENDPOINTS } from './api'
export type { User, Hackathon, ... } from '@/types/api'

// types/index.ts should exist and re-export:
export type * from './api'
```

---

## 🎯 Summary

```
✅ NO CLASH EXISTS
   • lib/api.ts = Runtime code (implementation)
   • types/api.ts = Type definitions only
   • Different purposes, zero conflicts

✅ PROPER ORGANIZATION
   • Barrel exports for convenience
   • Path aliases for clean imports
   • Separation of concerns maintained

✅ INDUSTRY STANDARD
   • Followed by Next.js, Vite, React projects
   • TypeScript recommended pattern
   • Scales as project grows

✅ READY FOR DEVELOPMENT
   • Start using: import { api } from '@/lib'
   • TypeScript will enforce correct usage
   • IDE autocomplete fully functional
```

---

**Your frontend is NOW organized following industry best practices! 🎉**
