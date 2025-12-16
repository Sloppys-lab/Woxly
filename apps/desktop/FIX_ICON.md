# 🔧 Исправление иконки установщика

Если иконка установщика не обновилась, выполните следующие шаги:

## Шаг 1: Пересоздайте иконки из SVG

```powershell
cd C:\woxly\apps\desktop
npm run icons
```

Это пересоздаст `icon.png` и `icon.ico` из `build/icon.svg`.

## Шаг 2: Очистите кеш electron-builder

```powershell
cd C:\woxly\apps\desktop
Remove-Item -Recurse -Force dist -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force release -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.cache -ErrorAction SilentlyContinue
```

## Шаг 3: Пересоберите проект

```powershell
cd C:\woxly\apps\desktop
npm run package
```

## Альтернативный способ (все в одной команде)

```powershell
cd C:\woxly\apps\desktop
npm run icons
Remove-Item -Recurse -Force dist,release,node_modules\.cache -ErrorAction SilentlyContinue
npm run package
```

## Проверка

После сборки проверьте:
1. Откройте `release\Woxly-Setup-1.0.0.exe` в проводнике Windows
2. Иконка должна быть с новой иконкой (звуковые волны)
3. При установке ярлык на рабочем столе также должен иметь новую иконку

## Если проблема сохраняется

1. Убедитесь, что файл `build/icon.ico` действительно обновился (проверьте дату изменения)
2. Попробуйте удалить старый установщик и пересобрать
3. Проверьте, что в `package.json` указан правильный путь: `"icon": "build/icon.ico"`




