@echo off
setlocal

set SOURCE=%~dp0..\.next\standalone
set DEST=C:\inetpub\wwwroot\bolt-dev\bolt-value-summary

echo.
echo ============================================================
echo  Deploying bolt-value-summary to IIS
echo  Source : %SOURCE%
echo  Dest   : %DEST%
echo ============================================================
echo.

:: Verify the build exists
if not exist "%SOURCE%\server.js" (
    echo ERROR: Standalone build not found. Run "pnpm build" first.
    exit /b 1
)

:: Ensure destination exists
if not exist "%DEST%" mkdir "%DEST%"

:: Copy server entry point and package manifest
robocopy "%SOURCE%" "%DEST%" server.js package.json /IS /IT
echo.

:: Copy trimmed node_modules (required runtime deps only)
echo Copying node_modules...
robocopy "%SOURCE%\node_modules" "%DEST%\node_modules" /E /IS /IT /NFL /NDL /NJH /NJS
echo Done.
echo.

:: Remove stale .next so old hashed chunks don't shadow the new build
if exist "%DEST%\.next" (
    echo Removing old .next...
    rmdir /S /Q "%DEST%\.next"
    echo Done.
)

:: Copy .next server bundle and static assets
echo Copying .next...
robocopy "%SOURCE%\.next" "%DEST%\.next" /E /IS /IT /NFL /NDL /NJH /NJS
echo Done.
echo.

:: Copy public assets
echo Copying public...
robocopy "%SOURCE%\public" "%DEST%\public" /E /IS /IT /NFL /NDL /NJH /NJS
echo Done.
echo.

:: robocopy exit codes 0-7 are success (bit flags for files copied/skipped/etc.)
:: Only codes 8+ indicate an actual error.
if %ERRORLEVEL% GEQ 8 (
    echo ERROR: robocopy reported a failure. Check output above.
    exit /b %ERRORLEVEL%
)

echo ============================================================
echo  Deployment complete.
echo  Start the server with BOLT Server, or manually:
echo    cd %DEST% ^&^& set PORT=3014 ^&^& node server.js
echo ============================================================
echo.

endlocal
