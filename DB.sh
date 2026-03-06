#!/bin/bash

# Variables
PROD_URL="postgresql://utkalUser:utkalautomobiles@72.62.245.103:5432/utkal"
LOCAL_URL="postgresql://moto:moto@localhost:5432/moto"

echo "🔄 Starting Sync: Prod -> Local..."

# Step 1: Wipe the local public schema
echo "🧹 Wiping local database tables..."
psql "$LOCAL_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Step 2: Dump from Prod and Pipe to Local
echo "📥 Transferring data (this may take a moment)..."
pg_dump -d "$PROD_URL" --no-owner --no-privileges | psql "$LOCAL_URL"

echo "✅ Sync Complete! Your local DB is now an exact copy of Prod."