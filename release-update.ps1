#!/usr/bin/env pwsh
# Скрипт для выпуска обновления WOXLY Desktop

param(
    [Parameter(Mandatory=$false)]
    [string]$NewVersion = "",
    
    [Parameter(Mandatory=$false)]
    [switch]$SkipBuild = $false,
    
    [Parameter(Mandatory=$false)]
    [switch]$UploadToServer = $false
)

Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   📦 WOXLY Update Release Tool       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Функции для вывода
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

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Cyan
}

# Читаем текущую версию
$packageJsonPath = "C:\woxly\apps\desktop\package.json"
$packageJson = Get-Content $packageJsonPath | ConvertFrom-Json
$currentVersion = $packageJson.version

Write-Info "Текущая версия: $currentVersion"

# Если новая версия не указана, спрашиваем
if ([string]::IsNullOrEmpty($NewVersion)) {
    Write-Host ""
    Write-Host "Введите новую версию (например, 1.0.1):" -ForegroundColor Yellow
    $NewVersion = Read-Host
}

# Проверяем формат версии
if ($NewVersion -notmatch '^\d+\.\d+\.\d+$') {
    Write-Error "Неверный формат версии! Используйте формат X.Y.Z (например, 1.0.1)"
    exit 1
}

# Сравниваем версии
if ($NewVersion -eq $currentVersion) {
    Write-Error "Новая версия совпадает с текущей!"
    exit 1
}

Write-Success "Новая версия: $NewVersion"

# Обновляем версию в package.json
Write-Step "Обновление версии в package.json..."
$packageJson.version = $NewVersion
$packageJson | ConvertTo-Json -Depth 100 | Set-Content $packageJsonPath
Write-Success "Версия обновлена!"

# Сборка
if (-not $SkipBuild) {
    Write-Host ""
    Write-Step "Начинаем сборку..."
    
    # Frontend
    Write-Step "Сборка frontend..." "Yellow"
    Set-Location "C:\woxly\apps\frontend"
    npm run build:desktop
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ошибка при сборке frontend!"
        exit 1
    }
    Write-Success "Frontend собран!"
    
    # Electron
    Write-Step "Сборка Electron..." "Yellow"
    Set-Location "C:\woxly\apps\desktop"
    npm run build:electron
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ошибка при сборке Electron!"
        exit 1
    }
    Write-Success "Electron собран!"
    
    # Package
    Write-Step "Создание установщика..." "Yellow"
    npm run package
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Ошибка при создании установщика!"
        exit 1
    }
    Write-Success "Установщик создан!"
} else {
    Write-Info "Сборка пропущена (--SkipBuild)"
}

# Проверяем наличие файлов
$releasePath = "C:\woxly\apps\desktop\release"
$setupFile = Get-ChildItem "$releasePath\Woxly-Setup-*.exe" | Select-Object -First 1
$ymlFile = "$releasePath\latest.yml"
$blockmapFile = Get-ChildItem "$releasePath\*.exe.blockmap" | Select-Object -First 1

if (-not (Test-Path $setupFile)) {
    Write-Error "Файл установщика не найден!"
    exit 1
}

if (-not (Test-Path $ymlFile)) {
    Write-Error "Файл latest.yml не найден!"
    exit 1
}

Write-Host ""
Write-Success "Файлы готовы:"
Write-Host "  📄 $($setupFile.Name)" -ForegroundColor White
Write-Host "  📄 latest.yml" -ForegroundColor White
if ($blockmapFile) {
    Write-Host "  📄 $($blockmapFile.Name)" -ForegroundColor White
}

# Показываем информацию о файлах
Write-Host ""
Write-Info "Размеры файлов:"
Write-Host "  Setup: $([math]::Round($setupFile.Length / 1MB, 2)) MB" -ForegroundColor White
if ($blockmapFile) {
    Write-Host "  Blockmap: $([math]::Round($blockmapFile.Length / 1KB, 2)) KB" -ForegroundColor White
}

# Загрузка на сервер
if ($UploadToServer) {
    Write-Host ""
    Write-Step "Загрузка на сервер..."
    
    Write-Host "Введите адрес сервера (например, root@woxly.ru):" -ForegroundColor Yellow
    $serverAddress = Read-Host
    
    $serverPath = "/var/www/woxly.ru/downloads/desktop"
    
    Write-Step "Загрузка latest.yml..."
    scp $ymlFile "${serverAddress}:${serverPath}/"
    
    Write-Step "Загрузка установщика..."
    scp $setupFile.FullName "${serverAddress}:${serverPath}/"
    
    if ($blockmapFile) {
        Write-Step "Загрузка blockmap..."
        scp $blockmapFile.FullName "${serverAddress}:${serverPath}/"
    }
    
    Write-Success "Файлы загружены на сервер!"
} else {
    Write-Host ""
    Write-Info "Для загрузки на сервер используйте флаг -UploadToServer"
    Write-Host ""
    Write-Host "Команды для загрузки вручную:" -ForegroundColor Cyan
    Write-Host "  scp `"$ymlFile`" root@woxly.ru:/var/www/woxly.ru/downloads/desktop/" -ForegroundColor White
    Write-Host "  scp `"$($setupFile.FullName)`" root@woxly.ru:/var/www/woxly.ru/downloads/desktop/" -ForegroundColor White
    if ($blockmapFile) {
        Write-Host "  scp `"$($blockmapFile.FullName)`" root@woxly.ru:/var/www/woxly.ru/downloads/desktop/" -ForegroundColor White
    }
}

# Создаём changelog entry
Write-Host ""
Write-Step "Создание записи в CHANGELOG..."

$changelogPath = "C:\woxly\CHANGELOG.md"
$date = Get-Date -Format "yyyy-MM-dd"

$changelogEntry = @"

## [$NewVersion] - $date
### Добавлено
- 

### Исправлено
- 

### Изменено
- 

"@

if (Test-Path $changelogPath) {
    $existingChangelog = Get-Content $changelogPath -Raw
    $newChangelog = $existingChangelog -replace "(# Changelog)", "`$1$changelogEntry"
    $newChangelog | Set-Content $changelogPath
} else {
    $newChangelog = "# Changelog$changelogEntry"
    $newChangelog | Set-Content $changelogPath
}

Write-Success "Запись в CHANGELOG создана! Не забудьте заполнить её."

# Финал
Write-Host ""
Write-Host "╔════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║      ✨ РЕЛИЗ ГОТОВ! ✨              ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Success "Версия $NewVersion готова к выпуску!"
Write-Host ""
Write-Info "Следующие шаги:"
Write-Host "  1. Заполните CHANGELOG.md" -ForegroundColor White
Write-Host "  2. Загрузите файлы на сервер (если ещё не загружены)" -ForegroundColor White
Write-Host "  3. Протестируйте автообновление" -ForegroundColor White
Write-Host "  4. Анонсируйте обновление пользователям" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Пользователи получат обновление автоматически в течение 4 часов!" -ForegroundColor Magenta
Write-Host ""

# Открываем папку с релизом
$openFolder = Read-Host "Открыть папку с релизом? (y/n)"
if ($openFolder -eq "y" -or $openFolder -eq "Y") {
    Start-Process $releasePath
}






