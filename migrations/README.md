# Database Migrations

This directory contains SQL migration files for the D1 database.

## Migration Files

Migrations run in **alphabetical order** (0001, 0002, 0003, etc.):

1. `0001_init.sql` - Initial database schema
2. `0002_seed_vignettes.sql` - Seed initial vignettes
3. `0003_add_confidence_level.sql` - Add confidence_level column
4. `0004_add_ordering_score.sql` - Add ordering_score column

## Running Migrations

### Automated (Recommended)

```bash
# Local development
bun run db:migrate:local

# Production (standalone)
bun run db:migrate:prod

# Production (as part of deployment - RECOMMENDED)
bun run deploy  # Automatically runs migrations then deploys
```

### Manual (Individual Migration)

```bash
# Local
bunx wrangler d1 execute ai-dx-research --local --file=./migrations/XXXX_name.sql

# Production
bunx wrangler d1 execute ai-dx-research --file=./migrations/XXXX_name.sql
```

## Creating New Migrations

1. Create a new file with the next sequential number:
   ```
   migrations/0005_your_migration_name.sql
   ```

2. Write your SQL migration:
   ```sql
   -- Add new column
   ALTER TABLE evaluations ADD COLUMN new_field TEXT;

   -- Or create new table
   CREATE TABLE new_table (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     ...
   );
   ```

3. Test locally first:
   ```bash
   bunx wrangler d1 execute ai-dx-research --local --file=./migrations/0005_your_migration_name.sql
   ```

4. Run on production:
   ```bash
   bun run db:migrate:prod
   ```

## Important Notes

- **Migrations are additive**: Once run in production, never modify existing migration files
- **Idempotency**: D1 doesn't track applied migrations, so migrations may error if already applied (this is expected)
- **Schema changes**: Always use `ALTER TABLE` for existing tables, not `DROP TABLE`
- **Data migrations**: Be careful with data transformations in production
- **Automatic deployment**: `bun run deploy` automatically runs migrations before deploying
- **GitHub Actions**: Migrations also run automatically on push to `main` branch

## Rollback

D1 doesn't support automatic rollbacks. To rollback:

1. Create a new migration that reverses the changes
2. For example, if `0005_add_field.sql` added a column:
   ```sql
   -- 0006_remove_field.sql
   ALTER TABLE evaluations DROP COLUMN new_field;
   ```
