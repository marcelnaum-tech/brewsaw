@echo off
rem Startet Brewsaw lokal und oeffnet die App im Browser.
cd /d "%~dp0"
start "" http://localhost:5199/
python server.py 5199
