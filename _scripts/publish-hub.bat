@echo off
REM publish-hub.bat - mirror <project>/dashboard/ to the public lab-fig-46aprgpa hub.
REM
REM This is OPT-IN. The default workflow is to use build-dashboard.bat for the
REM local dashboard (lives inside the project) and only run publish-hub.bat
REM when you explicitly want the project visible on GitHub Pages.
REM
REM From any project folder (cmd.exe or PowerShell):
REM
REM     publish-hub.bat                              (build + push cwd)
REM     publish-hub.bat --only figures               (refresh figures + push)
REM     publish-hub.bat --no-push                    (mirror locally, no push)
REM     publish-hub.bat --project "D:\proyectos\X"   (explicit path)
REM
REM Slug = name of the project folder. One project = one URL, always.
REM Hub: https://jinfama.github.io/lab-fig-46aprgpa/<slug>/

setlocal
set "PY=C:\Users\jinfa\AppData\Local\Programs\Python\Python312\python.exe"
set "SCRIPT=%~dp0publish-hub.py"

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
