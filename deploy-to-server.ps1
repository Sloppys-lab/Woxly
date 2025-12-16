# Скрипт для деплоя обновлений на сервер
# Использование: .\deploy-to-server.ps1

param(
    [string]$ServerIP = "your-server-ip",
    [string]$ServerUser = "root",
    [string]$ServerPath = "/root/woxly"
)

Write-Host "🚀 Деплой обновлений Woxly на сервер" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Проверка наличия файлов
Write-Host "📋 Проверка файлов..." -ForegroundColor Yellow

$filesToDeploy = @(
    "apps\backend\src\controllers\auth.ts",
    "apps\backend\src\routes\auth.ts",
    "apps\backend\src\utils\email.ts",
    "apps\frontend\src\App.tsx",
    "apps\frontend\src\pages\auth\LoginPage.tsx",
    "apps\frontend\src\pages\auth\ForgotPasswordPage.tsx"
)

$allFilesExist = $true
foreach ($file in $filesToDeploy) {
    $fullPath = Join-Path $PSScriptRoot $file
    if (Test-Path $fullPath) {
        Write-Host "  ✅ $file" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - НЕ НАЙДЕН!" -ForegroundColor Red
        $allFilesExist = $false
    }
}

if (-not $allFilesExist) {
    Write-Host ""
    Write-Host "❌ Некоторые файлы не найдены!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📦 Создание архива..." -ForegroundColor Yellow

# Создаем временную папку
$tempDir = Join-Path $env:TEMP "woxly-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

# Копируем файлы с сохранением структуры
foreach ($file in $filesToDeploy) {
    $sourcePath = Join-Path $PSScriptRoot $file
    $destPath = Join-Path $tempDir $file
    $destDir = Split-Path $destPath -Parent
    
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
    Copy-Item $sourcePath $destPath -Force
}

# Создаем архив
$archivePath = Join-Path $env:TEMP "woxly-update-$(Get-Date -Format 'yyyyMMdd-HHmmss').zip"
Compress-Archive -Path "$tempDir\*" -DestinationPath $archivePath -Force

Write-Host "  ✅ Архив создан: $archivePath" -ForegroundColor Green

Write-Host ""
Write-Host "📤 Загрузка на сервер..." -ForegroundColor Yellow
Write-Host "  Сервер: $ServerUser@$ServerIP" -ForegroundColor Gray
Write-Host "  Путь: $ServerPath" -ForegroundColor Gray
Write-Host ""

# Проверяем наличие scp
$scpExists = Get-Command scp -ErrorAction SilentlyContinue
if (-not $scpExists) {
    Write-Host "❌ scp не найден! Установите OpenSSH Client:" -ForegroundColor Red
    Write-Host "   Settings → Apps → Optional Features → Add OpenSSH Client" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Архив сохранен локально: $archivePath" -ForegroundColor Cyan
    Write-Host "Загрузите его вручную через FileZilla/WinSCP" -ForegroundColor Cyan
    exit 1
}

Write-Host "Введите команды на сервере для деплоя:" -ForegroundColor Cyan
Write-Host ""
Write-Host "# 1. Загрузите архив (выполните на вашем компьютере):" -ForegroundColor Yellow
Write-Host "scp `"$archivePath`" ${ServerUser}@${ServerIP}:/tmp/" -ForegroundColor White
Write-Host ""
Write-Host "# 2. Подключитесь к серверу:" -ForegroundColor Yellow
Write-Host "ssh ${ServerUser}@${ServerIP}" -ForegroundColor White
Write-Host ""
Write-Host "# 3. Выполните на сервере:" -ForegroundColor Yellow
Write-Host @"
# Распакуйте архив
cd /tmp
unzip -o woxly-update-*.zip -d woxly-update

# Скопируйте файлы
cp -r woxly-update/apps/backend/src/* $ServerPath/apps/backend/src/
cp -r woxly-update/apps/frontend/src/* $ServerPath/apps/frontend/src/

# Пересоберите backend
cd $ServerPath/apps/backend
npm run build

# Пересоберите frontend
cd $ServerPath/apps/frontend
npm run build

# Перезапустите приложения
pm2 restart all

# Проверьте статус
pm2 status
pm2 logs backend --lines 20

# Очистите временные файлы
rm -rf /tmp/woxly-update*

echo "✅ Деплой завершен!"
"@ -ForegroundColor White

Write-Host ""
Write-Host "✅ Архив готов к загрузке!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Следующие шаги:" -ForegroundColor Cyan
Write-Host "  1. Скопируйте команду scp выше и выполните её" -ForegroundColor White
Write-Host "  2. Подключитесь к серверу через SSH" -ForegroundColor White
Write-Host "  3. Выполните команды деплоя" -ForegroundColor White
Write-Host ""
Write-Host "💡 Или используйте FileZilla/WinSCP для загрузки:" -ForegroundColor Yellow
Write-Host "   Файл: $archivePath" -ForegroundColor White
Write-Host ""

# Очищаем временную папку
Remove-Item $tempDir -Recurse -Force

# Открываем папку с архивом
explorer.exe "/select,$archivePath"
