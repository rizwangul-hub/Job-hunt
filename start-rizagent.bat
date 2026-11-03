@echo off
title RizAgent 24/7 Autonomous Job Hunter & Applier
color 0A

echo =====================================================================
echo  RIZAGENT 24/7 AUTONOMOUS JOB HUNTER & AUTO-APPLIER
echo  Candidate: Rizwan Ullah (rizwangul535@gmail.com | +92 325 5984244)
echo =====================================================================
echo.
echo Starting 24/7 Autonomous Radars:
echo - WhatsApp Real-Time Group Hunter
echo - LinkedIn Public Recruiter Radar (Pakistan & Worldwide Remote)
echo - Facebook & Instagram Tech Projects Radar
echo - Indeed Autonomous Job Hunter
echo - Direct Gmail CV (Resume.pdf) Dispatcher
echo.

cd /d "%~dp0backend"

:RUN_LOOP
echo [%date% %time%] Starting RizAgent Bot & Radars...
node scripts/whatsapp-bot.js
echo.
echo [WARNING] RizAgent process exited or restarted.
echo [%date% %time%] Auto-restarting in 5 seconds to ensure uninterrupted applying...
timeout /t 5 /nobreak >nul
goto RUN_LOOP
