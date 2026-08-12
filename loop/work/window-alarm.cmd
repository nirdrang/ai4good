@echo off
REM window-alarm.cmd - PostToolUse / PostToolUseFailure: put the window alarm in front of the model.
REM
REM WHY A BATCH FILE AND NOT POWERSHELL. This runs after EVERY tool call in the system, in every
REM agent, forever. A `powershell -NoProfile` process costs roughly 200-400 ms on this machine and
REM would be paid on every one of them. `findstr` is an order of magnitude cheaper. The cost is
REM the whole reason the sensor composes the line and this only reads it.
REM
REM THE CHECKPOINT READS, IT NEVER COMPUTES. statusline.ps1 writes exactly one line to
REM window-verdict.txt on every refresh - OK, or ALARM ... , or UNKNOWN ... - and the first token
REM is the anchor. All this does is match that anchor and hand the line back.
REM
REM Exit 2 with text on stderr is the documented channel that shows the text to the model. Exit 0
REM is silence. There is no third answer: UNKNOWN is deliberately silent here, because a running
REM subagent can neither act on a broken sensor nor fix it, and an UNKNOWN alarm would fire on
REM every tool call in the system for as long as the founder session sits idle. The actors who
REM CAN act hear it loudly elsewhere - the spawn gate at every spawn, the stamp at every prompt.
REM
REM A missing verdict file is silence too. The gate and the stamp both report that state properly.

REM DO NOT WRAP THIS IN cmd /c IN settings.json. Measured 2026-08-12: under Git Bash sh, MSYS
REM path-mangling rewrites the /c switch into a Windows path, cmd never receives it, starts
REM interactively, reads EOF and exits 0 with no output - which is indistinguishable from a clear
REM window, the exact failure this guard exists to remove. It also passes an overhead check,
REM because a cmd that does nothing is fast. The bare quoted path in the hook entry works under
REM every shell that could be tested. Evidence:
REM loop/items/AI4DEV-82/artifacts/alarm-invocation-diagnosis.md

setlocal
if defined AI4GOOD_WINDOW_DIR (set "AI4GOOD_WD=%AI4GOOD_WINDOW_DIR%") else (set "AI4GOOD_WD=%LOCALAPPDATA%\ai4good-build\nirdrang-ai4good")
if not exist "%AI4GOOD_WD%\window-verdict.txt" exit /b 0
findstr /b /c:"ALARM" "%AI4GOOD_WD%\window-verdict.txt" 1>&2
if errorlevel 1 exit /b 0
exit /b 2
