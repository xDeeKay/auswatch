# Restarts the Next.js dev server cleanly on Windows.
#
# `next dev` running under this environment's background-shell wrapper leaves
# its underlying node.exe (next-server) process alive after the wrapper task
# is stopped, still bound to the dev port. A stale process here also means
# `.next` may hold build output that doesn't match a currently-running dev
# server (e.g. left over from an `npm run build` verification pass), which
# next dev doesn't reliably recover from. This script kills only a process
# it can positively identify as a Next.js dev/start server on the target
# port, clears `.next`, and starts a fresh dev server.

param(
    [int]$Port = 3000
)

$ErrorActionPreference = "Stop"

$listeners = netstat -ano | Select-String ":$Port\s+.*LISTENING\s+(\d+)$"

foreach ($line in $listeners) {
    $processId = ($line -split "\s+")[-1]
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$processId" -ErrorAction SilentlyContinue

    if (-not $proc) {
        continue
    }

    if ($proc.CommandLine -match "next[\\/]dist[\\/]server[\\/]lib[\\/]start-server\.js") {
        Write-Host "Stopping stale Next.js dev server (PID $processId) on port $Port"
        Stop-Process -Id $processId -Force -Confirm:$false
    }
    else {
        Write-Warning "Port $Port is held by a non-Next.js process (PID $processId): $($proc.CommandLine). Not stopping it automatically."
    }
}

Start-Sleep -Milliseconds 500

if (Test-Path .next) {
    Remove-Item -Recurse -Force .next
}

npm run dev
