# Скрипт для исправления иконки установщика
# Пересоздает иконки и очищает кеш

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Исправление иконки установщика Woxly" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Переходим в директорию проекта
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Шаг 1: Пересоздаем иконки
Write-Host "Шаг 1: Пересоздание иконок из SVG..." -ForegroundColor Yellow
npm run icons
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при создании иконок!" -ForegroundColor Red
    exit 1
}

# Шаг 2: Очищаем кеш
Write-Host "`nШаг 2: Очистка кеша electron-builder..." -ForegroundColor Yellow
$foldersToRemove = @("dist", "release", "node_modules\.cache")
foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item -Recurse -Force $folder -ErrorAction SilentlyContinue
        Write-Host "  ✓ Удалено: $folder" -ForegroundColor Green
    }
}

# Шаг 3: Проверяем наличие иконок
Write-Host "`nШаг 3: Проверка файлов иконок..." -ForegroundColor Yellow
$iconFiles = @("build\icon.svg", "build\icon.png", "build\icon.ico")
$allExist = $true
foreach ($file in $iconFiles) {
    if (Test-Path $file) {
        $fileInfo = Get-Item $file
        Write-Host "  ✓ $file ($([math]::Round($fileInfo.Length/1KB, 2)) KB, изменен: $($fileInfo.LastWriteTime.ToString('yyyy-MM-dd HH:mm')))" -ForegroundColor Green
    } else {
        Write-Host "  ❌ $file - НЕ НАЙДЕН!" -ForegroundColor Red
        $allExist = $false
    }
}

if (-not $allExist) {
    Write-Host "`n❌ Не все файлы иконок найдены!" -ForegroundColor Red
    exit 1
}

Write-Host "`n✅ Готово! Теперь запустите сборку:" -ForegroundColor Green
Write-Host "   npm run package" -ForegroundColor Cyan
Write-Host ""




