# AI Differential Diagnosis Research - Setup Guide

This is a rater evaluation portal for assessing LLM-generated differential diagnoses.

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Create Local D1 Database

```bash
# Create local D1 database
bunx wrangler d1 create ai-dx-research

# Note the database_id from the output and update wrangler.jsonc if needed
```

### 3. Run Migrations

```bash
# Apply database schema
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0001_init.sql

# Seed vignettes
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0002_seed_vignettes.sql
```

### 4. Start Development Server

```bash
bun dev
```

Visit `http://localhost:5173`

## Study Workflow

### Phase 1: Generate Diagnoses (Admin)

1. Navigate to `/admin`
2. Enter your OpenAI API key
3. Click "Generate All Diagnoses"
4. Wait for completion (~2-3 minutes for 15 vignettes)

### Phase 2: Rater Evaluation

1. Navigate to `/` and click "Start Evaluation"
2. Raters complete consent form with their Rater ID (e.g., R001, R002)
3. Review calibration materials
4. Evaluate 15 vignettes (4 questions each)
5. Progress is saved automatically

## Routes

- `/` - Landing page
- `/admin` - Admin panel for LLM generation
- `/evaluate/consent` - Rater consent form
- `/evaluate/calibration` - Calibration session with practice cases
- `/evaluate/survey?raterId=XXX` - Main evaluation interface

## Database Schema

### Tables

**vignettes** - Clinical cases (pre-seeded with 15 cases)
- 6 common cases
- 5 ambiguous cases
- 4 emergent/red-flag cases

**llm_outputs** - AI-generated differential diagnoses
- 5 diagnoses per vignette
- Model: GPT-4o, Temperature: 0.1
- Structured output using Zod schema

**evaluations** - Rater assessments
- relevance_score (1-5)
- missing_critical (boolean)
- missing_diagnosis (text)
- safety_score (1-5)
- acceptable (boolean)
- comment (text)

## Environment Variables

No `.env` file needed for local development. For production:

- OpenAI API key is provided by rater/admin per session (not stored)
- D1 database is bound via `wrangler.jsonc`

## Deployment

### To Cloudflare Pages

```bash
# Build
bun run build

# Deploy
bun run deploy
```

### Production D1 Database

```bash
# Create production database
bunx wrangler d1 create ai-dx-research

# Update wrangler.jsonc with production database_id

# Run migrations on production
bunx wrangler d1 execute ai-dx-research --file=./migrations/0001_init.sql
bunx wrangler d1 execute ai-dx-research --file=./migrations/0002_seed_vignettes.sql
```

## Study Protocol (14 Days)

### Timeline

**Day 1-2:** Setup infrastructure, recruit raters
**Day 3-4:** Generate LLM outputs, test system
**Day 5-7:** Calibration session with raters
**Day 8-10:** Raters complete evaluations
**Day 11-13:** Data analysis
**Day 14:** Report findings

### Data Collection

All evaluations are stored in the D1 database. To export:

```bash
# Export evaluations table
bunx wrangler d1 execute ai-dx-research --command="SELECT * FROM evaluations" --json > evaluations.json
```

### Analytics

For analysis:
- Calculate mean Likert scores (relevance, safety)
- Compute proportions for binary metrics (acceptable)
- Calculate Fleiss kappa for inter-rater reliability
- Identify patterns by vignette category (common/ambiguous/emergent)

## Technical Stack

- **Framework:** TanStack Start (React)
- **Runtime:** Cloudflare Workers
- **Database:** Cloudflare D1 (SQLite)
- **LLM Integration:** Vercel AI SDK
- **Styling:** Tailwind CSS
- **Components:** shadcn/ui
- **Schema Validation:** Zod

## Key Features

✓ Structured LLM output with Zod schema (guaranteed JSON parsing)
✓ Progress tracking per rater
✓ Prevents duplicate evaluations
✓ Mobile-friendly responsive design
✓ Calibration materials included
✓ 15 pre-written clinical vignettes

## Troubleshooting

### Database not found
```bash
# Recreate local DB
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0001_init.sql
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0002_seed_vignettes.sql
```

### LLM generation fails
- Verify OpenAI API key is valid
- Check API key has sufficient credits
- Ensure network connectivity

### Evaluation not saving
- Check browser console for errors
- Verify D1 database is running locally
- Ensure all required fields are filled

## Support

For issues, contact the research coordinator or check application logs.
