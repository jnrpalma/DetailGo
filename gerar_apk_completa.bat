@echo off
echo ========================================
echo Gerando APK completa com bundle incluso
echo ========================================
echo.

cd C:\Users\jribe\Desktop\projetos\DetailGo

echo 1. Criando pasta assets...
if not exist android\app\src\main\assets mkdir android\app\src\main\assets

echo 2. Gerando bundle JavaScript...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res

echo 3. Limpando build anterior...
cd android
call ./gradlew clean

echo 4. Gerando nova APK...
call ./gradlew assembleDebug

echo 5. Instalando no celular...
adb install -r app\build\outputs\apk\debug\app-debug.apk

echo.
echo ========================================
echo ✅ APK gerada e instalada com sucesso!
echo ========================================
pause