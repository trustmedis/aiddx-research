# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AI Differential Diagnosis Research - A rater evaluation portal for assessing LLM-generated clinical differential diagnoses. This is a 14-day proof-of-concept study to evaluate whether LLM-generated differential diagnoses are clinically useful according to medical professionals.

## Common Commands

### Development
```bash
# Install dependencies
bun install

# Start development server (runs on port 3000)
bun dev

# Build for production
bun run build

# Preview production build
bun run preview

# Lint and type-check
bun run lint
```

### Database Operations
```bash
# Setup local database (create + run all migrations)
bun run db:setup:local

# Run all migrations on local database
bun run db:migrate:local

# Run all migrations on production database
bun run db:migrate:prod

# Run single migration manually (if needed)
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0001_init.sql

# Export evaluation data
bunx wrangler d1 execute ai-dx-research --command="SELECT * FROM evaluations" --json > evaluations.json
```

### Migration System
Migrations are located in `migrations/` and run in alphabetical order:
- `0001_init.sql` - Initial schema (vignettes, llm_outputs, evaluations)
- `0002_seed_vignettes.sql` - Seed 15 clinical vignettes
- `0003_add_confidence_level.sql` - Add confidence_level column
- `0004_add_ordering_score.sql` - Add ordering_score column

**Automatic Deployment**: GitHub Actions workflow (`.github/workflows/deploy.yml`) runs migrations on production before deployment.

### Deployment
```bash
# Deploy to Cloudflare Pages (runs migrations automatically)
bun run deploy

# Deploy without running migrations (if needed)
bun run deploy:skip-migrations

# Generate Cloudflare types
bun run cf-typegen
```

## Architecture

### Technology Stack
- **Framework**: TanStack Start (React + Cloudflare Workers runtime)
- **Database**: Cloudflare D1 (SQLite)
- **LLM Integration**: Vercel AI SDK with OpenRouter/OpenAI GPT-4o
- **Schema Validation**: Zod for structured LLM output
- **UI**: Tailwind CSS v4 + shadcn/ui components
- **Runtime**: Cloudflare Workers (server-side)

### Application Flow
1. **Admin Panel** (`/admin`) - Generate LLM differential diagnoses for all vignettes
2. **Landing Page** (`/`) - Study overview and entry point
3. **Consent** (`/evaluate/consent`) - Rater consent form with rater ID input
4. **Calibration** (`/evaluate/calibration`) - Training session with 2 practice cases
5. **Survey** (`/evaluate/survey`) - Main evaluation interface for 15 vignettes

### Core Architecture Patterns

#### Server Functions Pattern
All server-side operations use TanStack Start's `createServerFn` in `src/server/functions.ts`:
- Input validation with `.inputValidator()`
- Database access via `env.DB` (Cloudflare Workers environment binding)
- Server functions handle: LLM generation, data persistence, progress tracking

#### Database Layer
`src/lib/db.ts` provides a `Database` class that wraps D1 operations:
- Vignette management (CRUD operations)
- LLM output persistence (JSON-serialized diagnoses)
- Evaluation tracking per rater
- Progress calculation and duplicate prevention via `hasEvaluatedVignette()`

#### LLM Integration
`src/lib/llm.ts` handles structured LLM output:
- Uses Vercel AI SDK's `generateObject()` with Zod schema
- Enforces 1-5 differential diagnoses per vignette
- Temperature: 0.1 for consistency
- Model: OpenAI GPT-4o via OpenRouter
- Prompt template optimized for Indonesian epidemiological context

### Database Schema

**vignettes** - Clinical cases (15 pre-seeded)
- Categories: common (6), ambiguous (5), emergent (4)
- Fields: id, category, content, patient_initials, created_at

**llm_outputs** - AI-generated differential diagnoses
- Stores JSON array of 5 diagnoses with ICD-10 codes
- Fields: id, vignette_id, diagnoses (JSON), model_name, temperature, created_at

**evaluations** - Rater assessments
- Four evaluation metrics per vignette
- Fields: id, rater_id, vignette_id, llm_output_id, relevance_score (1-5), missing_critical (boolean), missing_diagnosis (text), safety_score (1-5), acceptable (boolean), comment, created_at

### Key Implementation Details

#### Structured LLM Output
The `DiagnosisSchema` in `src/lib/llm.ts` ensures guaranteed JSON parsing:
- Uses Zod's `.min(1).max(5)` to enforce 1-5 diagnoses
- Each diagnosis includes: condition, ICD-10 code, supporting evidence, likelihood rank, diagnostic tests, regional considerations
- Maps detailed schema to simplified `Diagnosis[]` type

#### Progress Tracking
`getRaterProgress()` in `src/lib/db.ts`:
- Tracks completed vignette IDs per rater
- Prevents duplicate evaluations via `hasEvaluatedVignette()`
- `getNextVignette()` automatically selects next unevaluated vignette

#### Environment Configuration
- `wrangler.jsonc` defines D1 database bindings
- Two database configs: local-dev-db and production (database_id: 1ce1ff15-dd43-4672-b124-5790f26ecd03)
- OpenRouter API key provided per-session (not stored in environment)

### Route Structure
- `src/routes/__root.tsx` - Root layout
- `src/routes/index.tsx` - Landing page
- `src/routes/admin/index.tsx` - Admin panel for LLM generation
- `src/routes/evaluate/consent.tsx` - Consent form
- `src/routes/evaluate/calibration.tsx` - Calibration training
- `src/routes/evaluate/survey.tsx` - Main evaluation interface

### Development Notes

#### When modifying vignettes:
- Update `migrations/0002_seed_vignettes.sql` for new clinical cases
- Regenerate LLM outputs via `/admin` panel after changes
- Ensure category is one of: common, ambiguous, emergent

#### When adding evaluation metrics:
- Update `Evaluation` type in `src/types/index.ts`
- Modify schema in `migrations/0001_init.sql`
- Update `saveEvaluation()` in `src/lib/db.ts`
- Update evaluation form in `src/routes/evaluate/survey.tsx`

#### LLM Configuration:
- Default model: configurable in `src/server/functions.ts`
- Temperature fixed at 0.1 for reproducibility
- Prompt template in `src/lib/llm.ts` is optimized for Indonesian medical context
- API key passed at runtime (not stored in environment)
