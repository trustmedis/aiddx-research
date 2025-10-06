# AI Differential Diagnosis Research

Rater evaluation portal for assessing LLM-generated clinical differential diagnoses.

## Overview

This application supports a **14-day proof-of-concept study** to evaluate whether LLM-generated differential diagnoses are clinically useful according to medical professionals.

### Study Design

- **Vignettes:** 15 clinical cases (6 common, 5 ambiguous, 4 emergent)
- **Raters:** 6-8 physicians
- **Model:** GPT-4o with temperature 0.1
- **Evaluation:** 4 questions per vignette
  1. Relevance (1-5 Likert)
  2. Missing critical diagnosis (Yes/No + text)
  3. Safety concern (1-5 Likert)
  4. Acceptable for clinical use (Yes/No)

## Quick Start

```bash
# Install dependencies
bun install

# Create and seed local database
bunx wrangler d1 create ai-dx-research
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0001_init.sql
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0002_seed_vignettes.sql

# Start development server
bun dev
```

Visit `http://localhost:5173`

See [SETUP.md](./SETUP.md) for detailed instructions.

## Application Flow

1. **Admin Panel** (`/admin`) - Generate LLM outputs for all vignettes
2. **Landing Page** (`/`) - Study overview and entry point
3. **Consent** (`/evaluate/consent`) - Rater consent form
4. **Calibration** (`/evaluate/calibration`) - Training with 2 practice cases
5. **Survey** (`/evaluate/survey`) - Evaluate 15 vignettes

## Technology Stack

- **Framework:** TanStack Start (React + Cloudflare Workers)
- **Database:** Cloudflare D1 (SQLite)
- **LLM:** Vercel AI SDK with OpenAI GPT-4o
- **Schema:** Zod for structured LLM output
- **UI:** Tailwind CSS + shadcn/ui

## Key Features

- Structured LLM output (guaranteed JSON parsing)
- Progress tracking per rater
- Duplicate evaluation prevention
- Mobile-responsive design
- Calibration materials included
- 15 pre-written clinical vignettes

## Deployment

```bash
# Build and deploy to Cloudflare Pages
bun run build
bun run deploy
```

For production setup and data export, see [SETUP.md](./SETUP.md).

## License

Research use only.
