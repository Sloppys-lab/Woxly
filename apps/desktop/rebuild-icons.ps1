# Скрипт для пересоздания иконок и очистки кеша

Write-Host "🔄 Пересоздание иконок из SVG..." -ForegroundColor Cyan
Set-Location $PSScriptRoot
node build/convert-svg-to-icons.js

Write-Host "`n🧹 Очистка кеша electron-builder..." -ForegroundColor Yellow
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue

Write-Host "✅ Кеш очищен" -ForegroundColor Green
Write-Host "`n📦 Теперь запустите: npm run package" -ForegroundColor Cyan




