#!/bin/bash

# Migration script for D1 database
# Usage:
#   ./scripts/migrate.sh local    # Run migrations locally
#   ./scripts/migrate.sh prod     # Run migrations in production

set -e

ENV=${1:-local}
DB_NAME="ai-dx-research"

if [ "$ENV" = "local" ]; then
  REMOTE_FLAG="--local"
  echo "Running migrations on LOCAL database..."
elif [ "$ENV" = "prod" ]; then
  REMOTE_FLAG=""
  echo "Running migrations on PRODUCTION database..."
else
  echo "Invalid environment. Use 'local' or 'prod'"
  exit 1
fi

echo "Database: $DB_NAME"
echo "Environment: $ENV"
echo ""

# Get all migration files in order
MIGRATIONS=($(ls migrations/*.sql | sort))

# Run each migration
for migration in "${MIGRATIONS[@]}"; do
  echo "Running: $migration"
  bunx wrangler d1 execute $DB_NAME $REMOTE_FLAG --file=$migration
  if [ $? -eq 0 ]; then
    echo "✓ Success: $migration"
  else
    echo "✗ Failed: $migration"
    exit 1
  fi
  echo ""
done

echo "All migrations completed successfully!"
