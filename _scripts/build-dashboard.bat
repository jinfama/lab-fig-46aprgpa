@echo off
REM build-dashboard.bat - generate <project>/dashboard/ locally (no git, no push).
REM
REM From any project folder (cmd.exe or PowerShell):
REM
REM     build-dashboard.bat                              (full build of cwd)
REM     build-dashboard.bat --only figures               (figures tab only)
REM     build-dashboard.bat --only papers
REM     build-dashboard.bat --only status
REM     build-dashboard.bat --project "D:\proyectos\X"   (explicit path)
REM
REM Output: <project>/dashboard/index.html (open in browser).
REM Nothing leaves the project. Use publish-hub.bat to mirror to GitHub Pages.

setlocal
set "PY=C:\Users\jinfa\AppData\Local\Programs\Python\Python312\python.exe"
set "SCRIPT=%~dp0dashboard.py"

if "%~1"=="" goto cwd
set "FIRST=%~1"
if "%FIRST:~0,9%"=="--project" goto passthrough
if "%FIRST:~0,2%"=="--" goto cwd_with_args
goto passthrough

:cwd
"%PY%" "%SCRIPT%" --project "%CD%"
exit /b %ERRORLEVEL%

:cwd_with_args
"%PY%" "%SCRIPT%" --project "%CD%" %*
exit /b %ERRORLEVEL%

:passthrough
"%PY%" "%SCRIPT%" %*
exit /b %ERRORLEVEL%
