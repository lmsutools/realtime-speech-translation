# Run this script to ensure clean build on Windows

Write-Host "=== Electron Build Fix Script ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Kill all related processes
Write-Host "Step 1: Killing all related processes..." -ForegroundColor Yellow
$processNames = @('realtime*', 'electron*', 'app-builder*', 'node')
foreach ($name in $processNames) {
    Get-Process | Where-Object { $_.ProcessName -like $name -and $_.Id -ne $PID } | ForEach-Object {
        Write-Host "  Killing process: $($_.ProcessName) (PID: $($_.Id))" -ForegroundColor Gray
        Stop-Process -Id $_.Id -Force -ErrorAction SilentlyContinue
    }
}
Write-Host "  Done!" -ForegroundColor Green
Start-Sleep -Seconds 3

# Step 2: Clean directories with multiple methods
Write-Host ""
Write-Host "Step 2: Cleaning build directories..." -ForegroundColor Yellow
$dirsToClean = @('dist', 'build', 'node_modules/.cache')

foreach ($dir in $dirsToClean) {
    if (Test-Path $dir) {
        Write-Host "  Cleaning: $dir" -ForegroundColor Gray
        
        # Method 1: Try cmd rmdir first (often more successful on Windows)
        cmd /c "rmdir /s /q `"$dir`"" 2>$null
        
        # Method 2: If still exists, try PowerShell methods
        if (Test-Path $dir) {
            # First, try to remove read-only attributes
            Get-ChildItem $dir -Recurse -Force -ErrorAction SilentlyContinue | ForEach-Object {
                $_.Attributes = 'Normal'
            }
            
            # Then remove items
            Remove-Item $dir -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Method 3: If STILL exists, use robocopy trick
        if (Test-Path $dir) {
            $emptyDir = "$env:TEMP\empty_dir_$(Get-Random)"
            New-Item -ItemType Directory -Path $emptyDir -Force | Out-Null
            robocopy $emptyDir $dir /mir /r:1 /w:1 | Out-Null
            Remove-Item $emptyDir -Force -ErrorAction SilentlyContinue
            Remove-Item $dir -Force -ErrorAction SilentlyContinue
        }
    }
}

# Clean individual files
$filesToClean = @('bundle.js', 'package-lock.json')
foreach ($file in $filesToClean) {
    if (Test-Path $file) {
        Write-Host "  Removing: $file" -ForegroundColor Gray
        Remove-Item $file -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "  Done!" -ForegroundColor Green

# Step 3: Clear npm cache
Write-Host ""
Write-Host "Step 3: Clearing npm cache..." -ForegroundColor Yellow
npm cache clean --force
Write-Host "  Done!" -ForegroundColor Green

# Step 4: Reinstall dependencies
Write-Host ""
Write-Host "Step 4: Reinstalling dependencies..." -ForegroundColor Yellow
npm install
Write-Host "  Done!" -ForegroundColor Green

Write-Host ""
Write-Host "=== Build environment is now clean! ===" -ForegroundColor Green
Write-Host ""
Write-Host "You can now run: npm run dist-portable" -ForegroundColor Cyan