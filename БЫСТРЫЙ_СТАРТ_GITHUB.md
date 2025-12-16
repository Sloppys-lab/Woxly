# ⚡ Быстрый Старт: GitHub Releases

## 🎯 За 5 Минут

### 1. Создайте GitHub Token

```
https://github.com/settings/tokens
→ Generate new token (classic)
→ Note: "Woxly Updates"
→ Scope: ✅ repo
→ Generate token
→ СКОПИРУЙТЕ TOKEN!
```

### 2. Установите Token

```powershell
$env:GH_TOKEN = "ghp_ваш_токен_здесь"
```

### 3. Обновите package.json

Замените в `apps/desktop/package.json`:

```json
"repository": {
  "type": "git",
  "url": "https://github.com/ваш-username/woxly.git"
},
"build": {
  "publish": {
    "provider": "github",
    "owner": "ваш-username",
    "repo": "woxly"
  }
}
```

### 4. Соберите и Опубликуйте

```powershell
cd C:\woxly\apps\desktop
npm run dist
```

### 5. Проверьте

```
https://github.com/ваш-username/woxly/releases
```

## ✅ Готово!

Теперь при каждом `npm run dist` будет создаваться GitHub Release с автообновлениями!

---

## 🔄 Выпуск Обновления

```powershell
# 1. Измените версию
# package.json: "version": "1.0.1"

# 2. Соберите
cd C:\woxly\apps\desktop
npm run dist

# 3. Готово! Release создан автоматически
```

---

## 📝 Важные Команды

```powershell
# Собрать БЕЗ публикации
npm run package

# Собрать И опубликовать на GitHub
npm run dist

# Установить token (каждый раз перед dist)
$env:GH_TOKEN = "ghp_ваш_токен"
```

---

## 🎉 Преимущества

- ✅ Бесплатно
- ✅ Автоматически
- ✅ Надежно
- ✅ Статистика скачиваний
- ✅ Не нужен свой сервер

Подробная инструкция: `GITHUB_RELEASES_SETUP.md`
