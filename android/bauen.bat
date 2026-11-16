@echo off
rem Baut die signierte Brewsaw-APK. Ergebnis: android\Brewsaw.apk
rem Voraussetzung: Werkzeuge in ..\.android-tools und Signaturschluessel (keystore.properties).
setlocal
cd /d "%~dp0"
set "JAVA_HOME=%~dp0..\.android-tools\jdk"
set "PATH=%JAVA_HOME%\bin;%PATH%"
call "%~dp0..\.android-tools\gradle\bin\gradle.bat" --no-daemon assembleRelease
if errorlevel 1 exit /b 1
copy /y "app\build\outputs\apk\release\app-release.apk" "Brewsaw.apk" >nul
echo.
echo Fertig: %~dp0Brewsaw.apk
