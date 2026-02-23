@echo off
title Gerador Rápido de APK - DetailGo
color 0A
echo ======================================================
echo         GERADOR RÁPIDO DE APK - DETAILGO
echo ======================================================
echo.

cd /d C:\Users\jribe\Desktop\projetos\DetailGo

REM ======================================================
REM MENU SIMPLES
REM ======================================================
echo Escolha o tipo de build:
echo 1) Debug (rápido, ideal para testes)
echo 2) Release (otimizado, para compartilhar)
echo ======================================================
set /p BUILD_TYPE="Digite 1 ou 2: "

if "%BUILD_TYPE%"=="2" (
    set BUILD_MODE=release
    set OUTPUT_NAME=DetailGo_App.apk
) else (
    set BUILD_MODE=debug
    set OUTPUT_NAME=DetailGo_Debug.apk
)
echo.

REM ======================================================
REM LIMPEZA
REM ======================================================
echo 1. Limpando build anterior...
cd android
call ./gradlew clean
cd ..
echo ✅ Limpeza concluída!
echo.

REM ======================================================
REM GERAR APK DIRETO
REM ======================================================
echo 2. Gerando APK %BUILD_MODE%...
echo.

cd android

if "%BUILD_MODE%"=="debug" (
    call ./gradlew assembleDebug
    set "APK_PATH=app\build\outputs\apk\debug\app-debug.apk"
) else (
    call ./gradlew assembleRelease
    set "APK_PATH=app\build\outputs\apk\release\app-release.apk"
)

if %errorlevel% neq 0 (
    echo ❌ Erro na compilação!
    cd ..
    pause
    exit /b
)

cd ..
echo ✅ APK gerada com sucesso!
echo.

REM ======================================================
REM COPIAR PARA ÁREA DE TRABALHO
REM ======================================================
echo 3. Copiando APK para área de trabalho...
copy android\%APK_PATH% C:\Users\jribe\Desktop\%OUTPUT_NAME% /y

if %errorlevel% equ 0 (
    echo ✅ APK copiada com sucesso!
    echo 📁 Local: C:\Users\jribe\Desktop\%OUTPUT_NAME%
    
    echo.
    echo 📦 Tamanho da APK:
    dir C:\Users\jribe\Desktop\%OUTPUT_NAME% | find "."
) else (
    echo ❌ Erro ao copiar APK!
)
echo.

REM ======================================================
REM INSTALAR (opcional)
REM ======================================================
echo Deseja instalar no celular agora?
echo 1) Sim
echo 2) Não (só gerar APK)
set /p INSTALL_OPTION="Digite 1 ou 2: "

if "%INSTALL_OPTION%"=="1" (
    echo.
    echo 4. Instalando no celular...
    adb install -r android\%APK_PATH%
    if %errorlevel% equ 0 (
        echo ✅ App instalado com sucesso!
    ) else (
        echo ⚠️  Falha na instalação.
        echo    Tente: adb uninstall com.testapp
        echo    Depois execute este script novamente.
    )
)

echo.
echo ======================================================
echo ✅ PROCESSO CONCLUÍDO!
echo ======================================================
echo 📱 APK pronta: C:\Users\jribe\Desktop\%OUTPUT_NAME%
echo ======================================================

pause