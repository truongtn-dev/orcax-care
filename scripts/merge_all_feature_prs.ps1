# Merge all 11 feature branches into main via GitHub Pull Requests.
# Prerequisites: gh auth login (run once in terminal)
#
# Usage (from repo root):
#   powershell -ExecutionPolicy Bypass -File scripts/merge_all_feature_prs.ps1

$ErrorActionPreference = "Stop"
$gh = "C:\Program Files\GitHub CLI\gh.exe"
if (-not (Test-Path $gh)) { $gh = "gh" }

Write-Host "Checking gh auth..."
& $gh auth status
if ($LASTEXITCODE -ne 0) {
    Write-Host "Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Set-Location (Split-Path $PSScriptRoot -Parent)

# Existing open PRs (Qthang) — merge in dependency order
$existingPrs = @(5, 6, 7, 8, 9, 10)

Write-Host "`n=== Merge existing PRs ===" -ForegroundColor Cyan
foreach ($num in $existingPrs) {
    Write-Host "Merging PR #$num..."
    & $gh pr merge $num --merge --delete-branch
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "PR #$num failed (may already be merged or has conflicts). Continuing..."
    }
}

# Branches without PR yet (DukTkaq)
$newBranches = @(
    @{ branch = "feature/UC_17.1.1.1.1-update-encounter"; title = "feat: UC_17.1.1.1.1 update encounter details" },
    @{ branch = "feature/UC_24.3-remove-prescription-line"; title = "feat: UC_24.3 remove prescription line item" },
    @{ branch = "feature/UC_32-create-medicine"; title = "feat: UC_32 create medicine with initial stock" },
    @{ branch = "feature/UC_32-low-stock-alerts"; title = "feat: UC_32 low stock and expiring alerts" },
    @{ branch = "feature/UC_32-verify-prescription"; title = "feat: UC_32 verify prescription and QR code" }
)

Write-Host "`n=== Create and merge new PRs ===" -ForegroundColor Cyan
foreach ($item in $newBranches) {
    $branch = $item.branch
    $title = $item.title
    Write-Host "Creating PR: $branch"
    $prUrl = & $gh pr create --base main --head $branch --title $title --body "Merge $branch into main." 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Warning "Create PR failed for $branch : $prUrl"
        continue
    }
    Write-Host "Created: $prUrl"
    $prNum = ($prUrl -split '/')[-1]
    Write-Host "Merging PR #$prNum..."
    & $gh pr merge $prNum --merge --delete-branch
}

Write-Host "`n=== Done ===" -ForegroundColor Green
& $gh pr list --state open
Write-Host "Sync local main: git fetch origin && git checkout main && git pull origin main"
