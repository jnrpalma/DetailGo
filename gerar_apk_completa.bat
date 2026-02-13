@echo off
echo ========================================
echo Gerando APK completa com bundle incluso
echo ========================================
echo.

cd /d C:\Users\jribe\Desktop\projetos\DetailGo

echo 1. Removendo resources antigos para evitar conflitos...
if exist android\app\src\main\res\drawable-* (
    echo Removendo drawable-*...
    rmdir /s /q android\app\src\main\res\drawable-*
)
if exist android\app\src\main\res\raw (
    echo Removendo raw...
    rmdir /s /q android\app\src\main\res\raw
)

echo 2. Limpando cache do React Native...
cd android
call ./gradlew clean
cd ..

echo 3. Criando pasta assets...
if not exist android\app\src\main\assets mkdir android\app\src\main\assets

echo 4. Gerando bundle JavaScript com reset de cache...
call npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res --reset-cache

echo 5. Gerando APK com suporte a múltiplas arquiteturas...
cd android
call ./gradlew assembleDebug -PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64

echo 6. Verificando se o APK foi gerado...
set APK_PATH=app\build\outputs\apk\debug\app-debug.apk
if exist %APK_PATH% (
    echo ✅ APK gerado com sucesso!
    
    echo 7. Instalando no celular conectado...
    adb install -r %APK_PATH%
    
    echo.
    echo ========================================
    echo ✅ APK gerada e instalada com sucesso!
    echo ========================================
    
    echo.
    echo 8. Copiando APK para pasta compartilhada...
    copy %APK_PATH% C:\Users\jribe\Desktop\DetailGo_App.apk /y
    echo ✅ APK copiado para: C:\Users\jribe\Desktop\DetailGo_App.apk
    echo.
    echo Para enviar ao amigo, use o arquivo copiado para a área de trabalho.
    echo.
    echo 📱 Tamanho do APK:
    dir C:\Users\jribe\Desktop\DetailGo_App.apk
) else (
    echo ❌ ERRO: APK não foi gerado!
    echo Verifique se há erros no build acima.
)

echo.
pause