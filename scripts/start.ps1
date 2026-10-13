# ClaimLens AI — Windows Startup Script
# Run from the project root: claimlens-ai/
# Prerequisites: Python 3.10+, Node.js 18+, pip, npm

param(
    [switch]$Seed,
    [switch]$ResetDB
)

$ErrorActionPreference = "Stop"
$ROOT = Split-Path -Parent $PSScriptRoot

Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  🔬 ClaimLens AI — Startup                          ║" -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ── Setup API ───────────────────────────────────────────────────────────────
Write-Host "📦 Installing Python dependencies..." -ForegroundColor Yellow
Set-Location "$ROOT\apps\api"
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) { Write-Error "pip install failed"; exit 1 }

# Copy env if missing
if (-not (Test-Path ".env")) {
    Copy-Item "$ROOT\.env.example" ".env"
    Write-Host "⚠️  Created .env from .env.example — review settings." -ForegroundColor Yellow
}

# Reset DB if requested
if ($ResetDB) {
    Write-Host "🗑️  Resetting database..." -ForegroundColor Red
    Remove-Item "claimlens.db" -ErrorAction SilentlyContinue
    Write-Host "Database cleared." -ForegroundColor Green
}

# ── Setup Web ───────────────────────────────────────────────────────────────
Write-Host "`n📦 Installing Node.js dependencies..." -ForegroundColor Yellow
Set-Location "$ROOT\apps\web"
npm install --silent
if ($LASTEXITCODE -ne 0) { Write-Error "npm install failed"; exit 1 }

if (-not (Test-Path ".env.local")) {
    @"
NEXT_PUBLIC_API_URL=http://localhost:8000/api
NEXT_PUBLIC_APP_NAME=ClaimLens AI
NEXT_PUBLIC_DEMO_MODE=true
"@ | Out-File ".env.local" -Encoding utf8
    Write-Host "✅ Created apps/web/.env.local" -ForegroundColor Green
}

# ── Start Services ──────────────────────────────────────────────────────────
Write-Host "`n🚀 Starting ClaimLens AI services..." -ForegroundColor Green

# Start API
$apiProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT\apps\api'; Write-Host '🔬 API Server starting...' -ForegroundColor Cyan; uvicorn main:app --reload --port 8000"
) -PassThru

Start-Sleep -Seconds 3

# Start Web
$webProcess = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$ROOT\apps\web'; Write-Host '🌐 Web App starting...' -ForegroundColor Magenta; npm run dev"
) -PassThru

Write-Host "`n╔══════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ ClaimLens AI is running!                         ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  🌐 Web App:   http://localhost:3000                 ║" -ForegroundColor Green
Write-Host "║  🔬 API:       http://localhost:8000                 ║" -ForegroundColor Green
Write-Host "║  📚 API Docs:  http://localhost:8000/docs            ║" -ForegroundColor Green
Write-Host "║                                                      ║" -ForegroundColor Green
Write-Host "║  Demo Accounts:                                      ║" -ForegroundColor Green
Write-Host "║  patient1@demo.claimlens.ai  /  Demo@Patient1       ║" -ForegroundColor Green
Write-Host "║  investigator@demo.claimlens.ai  /  Demo@Invest1    ║" -ForegroundColor Green
Write-Host "║  admin@demo.claimlens.ai  /  Demo@Admin1            ║" -ForegroundColor Green
Write-Host "╚══════════════════════════════════════════════════════╝`n" -ForegroundColor Green

Write-Host "Press Ctrl+C to stop all services." -ForegroundColor Yellow
Wait-Process -Id $apiProcess.Id, $webProcess.Id
