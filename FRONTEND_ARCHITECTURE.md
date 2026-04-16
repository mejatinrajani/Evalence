# Frontend Architecture - Best Practices Guide

## 📁 Structure Overview

Your frontend follows the **industry-standard TypeScript/React organization**:

```
frontend/src/
├── lib/
│   ├── index.ts          ← Barrel export (re-exports api.ts + types)
│   └── api.ts            ← API client implementation + endpoint configurations
├── types/
│   ├── index.ts          ← Barrel export (re-exports api.ts types)
│   └── api.ts            ← TypeScript type definitions ONLY
├── components/           ← React components (organized by domain)
├── pages/                ← Page components
├── assets/               ← Images, fonts, etc.
└── App.tsx               ← Main application component
```

---

## ✅ Separation of Concerns (No Clash!)

### `lib/api.ts` - **Implementation & Configuration**
**Purpose:** Runtime API code and endpoint definitions
**Contains:**
- `BASE_URL` - API server configuration
- `PHASE1_ENDPOINTS`, `PHASE2_ENDPOINTS`, `PHASE3_ENDPOINTS`, `ORG_ENDPOINTS` - Endpoint mappings
- `api` object - Request handler, auth management, helpers

```typescript
// lib/api.ts
export const PHASE1_ENDPOINTS = { /* ... */ }
export const api = { /* ... */ }
```

### `types/api.ts` - **Type Definitions ONLY**
**Purpose:** TypeScript interfaces for type safety
**Contains:**
- `User`, `AuthToken` - Auth types
- `Hackathon`, `Team`, `Project` - Domain types
- `Evaluation`, `JudgeAssignment` - Feature types
- API response and form types

```typescript
// types/api.ts
export interface User { /* ... */ }
export interface Hackathon { /* ... */ }
export type ApiResponse<T> = { /* ... */ }
```

### ✨ **No Circular Dependencies**
- `types/api.ts` → imports nothing (pure data contracts)
- `lib/api.ts` → can import from types if needed (implementation detail)
- `lib/index.ts` → re-exports both for convenience
- Components → import from `@/lib` or `@/types` as needed

---

## 🎯 Usage Patterns

### ✅ **Recommended Import Patterns**

#### Option 1: Import from Barrel Exports (Cleanest)
```typescript
// Option A: Everything you need
import { api, PHASE1_ENDPOINTS } from '@/lib'
import type { Hackathon, User } from '@/types'

// Option B: If in lib folder, use direct imports
import { api } from './api'
```

#### Option 2: Import Directly from Submodules (When specific)
```typescript
import { api, PHASE2_ENDPOINTS } from '@/lib/api'
import type { Evaluation } from '@/types/api'
```

#### Option 3: Using Type Imports (TypeScript Best Practice)
```typescript
// Separate type imports - ensures types are removed in compiled JS
import { api } from '@/lib'
import type { Hackathon, Evaluation } from '@/types'
```

### ❌ **Anti-Patterns to Avoid**
```typescript
// ❌ DON'T: Relative paths are error-prone
import { api } from '../../../lib/api'
import { User } from '../../../types/api'

// ❌ DON'T: Mixing relative and absolute
import { api } from '../../lib/api'
import type { Hackathon } from '@/types/api'

// ❌ DON'T: Importing implementations from types folder
import { someRuntime } from '@/types/api'  // Types folder should only have interfaces!
```

---

## 📋 Import Migration Guide

If you have existing imports, here's how to standardize them:

### Current (Scattered Relative Paths)
```typescript
// pages/dashboard/OrganizerDashboard.tsx
import { api } from '../../lib/api'
```

### Migrated (Using Absolute Paths with Aliases)
```typescript
// pages/dashboard/OrganizerDashboard.tsx
import { api } from '@/lib'
```

### Benefits
- ✅ Easier to read
- ✅ No count-the-dots errors
- ✅ Works with refactoring tools
- ✅ IDE navigation is simpler

---

## 🔧 Configuration Files Updated

### `tsconfig.app.json`
Path aliases for TypeScript compiler:
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@/lib/*": ["src/lib/*"],
      "@/types/*": ["src/types/*"],
      "@/components/*": ["src/components/*"],
      "@/pages/*": ["src/pages/*"],
      "@/assets/*": ["src/assets/*"]
    }
  }
}
```

### `vite.config.ts`
Path aliases for Vite bundler:
```typescript
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/types': path.resolve(__dirname, './src/types'),
      // ... other paths
    }
  }
})
```

---

## 📊 File Organization by Concern

### API Request Logic Flow
```
Component
    ↓
@/lib/api (or @/lib for barrel export)
    ├── PHASE*_ENDPOINTS (choose endpoint)
    ├── api.request() (execute request)
    └── Handle auth, errors, retries
    ↓
Backend API
```

### Type Safety Flow
```
Component
    ↓
@/types/api (or @/types for barrel export)
    ├── Use interface for API response
    ├── Check function parameters
    └── Get IDE autocomplete
    ↓
TypeScript Compiler checks at build time
```

---

## 🎨 Best Practices Checklist

- [x] **Barrel exports** configured (`lib/index.ts`, `types/index.ts`)
- [x] **Path aliases** defined in `tsconfig.app.json`
- [x] **Path aliases** configured in `vite.config.ts`
- [x] **Separation of concerns**: Types ≠ Implementation
- [x] **No circular dependencies**
- [x] **Consistent naming**: `@/` prefix for absolute imports
- [x] **Type imports**: Use `import type` for types only
- [ ] **Gradual migration**: Update imports file-by-file (optional)

---

## 🚀 Next Steps

### Option 1: Keep Current Relative Imports (Works Fine ✅)
No changes needed - the barrel exports are available if you want to use them later.

### Option 2: Gradual Migration (Recommended)
Start updating imports in new files:
```typescript
// NEW FILES: Use absolute paths
import { api, PHASE1_ENDPOINTS } from '@/lib'
import type { Hackathon } from '@/types'

// OLD FILES: Keep as-is (relative paths still work)
import { api } from '../../lib/api'
```

### Option 3: Full Refactor (If Time Permits)
Use IDE refactoring to update all imports across the codebase.

---

## 📚 Example: Complete Component Usage

```typescript
// src/pages/dashboard/OrganizerDashboard.tsx

// ✅ Recommended imports using absolute paths
import { api, PHASE1_ENDPOINTS, ORG_ENDPOINTS } from '@/lib'
import type { Hackathon, User } from '@/types'

// Component
export default function OrganizerDashboard() {
  const [hackathons, setHackathons] = useState<Hackathon[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  useEffect(() => {
    // Fetch user
    api.get(PHASE1_ENDPOINTS.auth.me)
      .then((user: User) => setCurrentUser(user))
      .catch(console.error)

    // Fetch hackathons
    api.get(ORG_ENDPOINTS.hackathons.myHackathons)
      .then((data: Hackathon[]) => setHackathons(data))
      .catch(console.error)
  }, [])

  return (
    <div>
      <h1>Welcome, {currentUser?.full_name}</h1>
      {hackathons.map((h) => (
        <div key={h.id}>{h.name}</div>
      ))}
    </div>
  )
}
```

---

## 🔍 Troubleshooting

### "Module not found" Error
**Problem:** Import using `@/` alias doesn't work
**Solution:** Restart dev server after updating `tsconfig.json` or `vite.config.ts`

### TypeScript not recognizing paths
**Problem:** `@/lib` import shows red squiggly in editor
**Solution:** 
1. Force TypeScript reload: `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. Clear `.vscode/settings.json` cache if present

### IDE autocomplete not working
**Problem:** VSCode doesn't autocomplete from `@/lib`
**Solution:** Ensure `tsconfig.app.json` is in root config chain (it's referenced in `tsconfig.json`)

---

## 📖 Summary

### ✅ **What's Correct**
- ✅ Separate `lib/api.ts` and `types/api.ts` (no clash)
- ✅ API client handles implementation
- ✅ Types handle interfaces
- ✅ Path aliases configured
- ✅ Barrel exports available

### ✅ **What's Flexible**
- ✅ Can use old relative imports (still work)
- ✅ Can use new absolute imports (recommended)
- ✅ Mix of both during migration (perfectly fine)

### 🎯 **Recommended Approach**
For new code: Use `@/lib` and `@/types` aliases
For existing code: Keep as-is or gradually update

---

## 📞 Quick Reference

| Need | Import From | Example |
|------|------------|---------|
| API Client | `@/lib` | `import { api } from '@/lib'` |
| Endpoints | `@/lib` | `import { PHASE1_ENDPOINTS } from '@/lib'` |
| Type Definitions | `@/types` | `import type { Hackathon } from '@/types'` |
| Use Types in Component | Direct Types | `const h: Hackathon = { ... }` |
| Relative Path (Old) | Works too | `import { api } from '../../lib/api'` |

---

**Your frontend is now perfectly organized with industry best practices! 🎉**
