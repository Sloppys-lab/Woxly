#!/usr/bin/env pwsh
# Скрипт для быстрой сборки WOXLY Desktop в EXE

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   🚀 WOXLY Desktop Builder v1.0      ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Функция для вывода статуса
function Write-Step {
    param($Message, $Color = "Yellow")
    Write-Host "⚡ $Message" -ForegroundColor $Color
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Шаг 1: Сборка Frontend
Write-Step "Шаг 1/3: Сборка Frontend..."
Set-Location "C:\woxly\apps\frontend"
npm run build:desktop

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка при сборке Frontend!"
    exit 1
}
Write-Success "Frontend собран!"

# Шаг 2: Сборка Electron
Write-Step "Шаг 2/3: Сборка Electron..."
Set-Location "C:\woxly\apps\desktop"
npm run build:electron

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка при сборке Electron!"
    exit 1
}
Write-Success "Electron собран!"

# Шаг 3: Создание EXE
Write-Step "Шаг 3/3: Создание EXE..."

# Спрашиваем пользователя какой тип сборки
Write-Host ""
Write-Host "Выберите тип сборки:" -ForegroundColor Cyan
Write-Host "  [1] Полная сборка с установщиком (медленнее, ~200 MB)" -ForegroundColor White
Write-Host "  [2] Портативная версия без установщика (быстрее, ~150 MB)" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Ваш выбор (1 или 2)"

if ($choice -eq "1") {
    Write-Step "Создание установщика..."
    npm run package
    $outputPath = "C:\woxly\apps\desktop\dist\WOXLY Setup 1.0.0.exe"
} else {
    Write-Step "Создание портативной версии..."
    npm run package:dir
    $outputPath = "C:\woxly\apps\desktop\dist\win-unpacked\WOXLY.exe"
}

if ($LASTEXITCODE -ne 0) {
    Write-Error "Ошибка при создании EXE!"
    exit 1
}

# Успех!
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║         ✨ СБОРКА ЗАВЕРШЕНА! ✨       ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Success "EXE файл находится в:"
Write-Host "  📁 $outputPath" -ForegroundColor Cyan
Write-Host ""

# Предлагаем открыть папку
$openFolder = Read-Host "Открыть папку с результатом? (y/n)"
if ($openFolder -eq "y" -or $openFolder -eq "Y") {
    if ($choice -eq "1") {
        Start-Process "C:\woxly\apps\desktop\dist"
    } else {
        Start-Process "C:\woxly\apps\desktop\dist\win-unpacked"
    }
}

Write-Host ""
Write-Host "🎉 Готово! Приятного использования WOXLY!" -ForegroundColor Magenta
Write-Host ""






