# Crown Dental CRM - Database Migration Helper (PowerShell)
# 
# This script helps apply the CRM schema migration to Supabase.
# Run with: .\migrate.ps1

param(
    [switch]$Help
)

if ($Help) {
    Write-Host @"
Crown Dental CRM - Database Migration Helper

Usage: .\migrate.ps1

This script will:
1. Read your Supabase credentials from .env.local
2. Connect to your Supabase project
3. Apply the CRM schema migration
4. Create all necessary tables for the appointment system

Prerequisites:
- Node.js installed (for @supabase/supabase-js)
- .env.local file in Websites/Crowndentalstudio/ with Supabase keys

If the script fails to apply the migration:
1. Go to: https://app.supabase.com/
2. Open your project 'slcaejlhelduzdqjoafy'
3. SQL Editor > New Query
4. Open: supabase/migrations/20260416_000002_crm_schema.sql
5. Copy and paste the entire content
6. Click Run

"@
    exit 0
}

Write-Host "🔄 Crown Dental CRM - Database Migration Helper" -ForegroundColor Cyan
Write-Host ""

# Check if .env.local exists
$envPath = "Websites\Crowndentalstudio\.env.local"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ Error: .env.local file not found" -ForegroundColor Red
    Write-Host "   Expected path: $envPath"
    exit 1
}

Write-Host "✓ Found .env.local" -ForegroundColor Green

# Check if migration file exists
$migrationPath = "supabase\migrations\20260416_000002_crm_schema.sql"
if (-not (Test-Path $migrationPath)) {
    Write-Host "❌ Error: Migration file not found" -ForegroundColor Red
    Write-Host "   Expected path: $migrationPath"
    exit 1
}

Write-Host "✓ Found migration file" -ForegroundColor Green

# Check if @supabase/supabase-js is installed
Write-Host ""
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

try {
    npm list @supabase/supabase-js 2>&1 | Out-Null
    Write-Host "✓ @supabase/supabase-js installed" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Installing @supabase/supabase-js..." -ForegroundColor Yellow
    npm install @supabase/supabase-js 2>&1 | Out-Null
}

# Run the Node.js migration script
Write-Host ""
Write-Host "🚀 Applying migration..." -ForegroundColor Cyan
Write-Host ""

node migrate.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCCESS! Migration completed." -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Go to Crowndentalstudio app: http://localhost:3000"
    Write-Host "2. Create a patient (if not already done)"
    Write-Host "3. Click 'Book Appointment' button"
    Write-Host "4. Fill in the form and submit"
    Write-Host ""
    Write-Host "If you still see 'Failed to create appointment':"
    Write-Host "- Check browser DevTools (F12) > Network tab"
    Write-Host "- Look for the appointment request and see the exact error"
    Write-Host "- Share that error message for further debugging"
} else {
    Write-Host ""
    Write-Host "⚠️  Migration could not be applied automatically" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "💡 Manual workaround:" -ForegroundColor Yellow
    Write-Host "1. Open: https://app.supabase.com/" -ForegroundColor White
    Write-Host "2. Open project: slcaejlhelduzdqjoafy" -ForegroundColor White
    Write-Host "3. Go to: SQL Editor > New Query" -ForegroundColor White
    Write-Host "4. Open file: supabase\migrations\20260416_000002_crm_schema.sql" -ForegroundColor White
    Write-Host "5. Copy entire content and paste in SQL editor" -ForegroundColor White
    Write-Host "6. Click: Run" -ForegroundColor White
    exit 1
}
