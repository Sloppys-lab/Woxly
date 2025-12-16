# 🚀 Автообновления через GitHub Releases

## Преимущества GitHub Releases

✅ **Бесплатно** - не нужен свой сервер  
✅ **Надежно** - GitHub инфраструктура  
✅ **Автоматически** - electron-builder все делает сам  
✅ **Просто** - один раз настроил и забыл  

---

## 📋 Пошаговая Настройка

### Шаг 1: Создайте GitHub Репозиторий

1. Откройте https://github.com
2. Нажмите "New repository"
3. Заполните:
   - **Repository name:** `woxly` (или любое другое)
   - **Description:** `Woxly Desktop Application`
   - **Public** или **Private** (любой)
4. Нажмите "Create repository"

---

### Шаг 2: Создайте GitHub Token

1. Откройте https://github.com/settings/tokens
2. Нажмите "Generate new token" → "Generate new token (classic)"
3. Заполните:
   - **Note:** `Woxly Auto-Update`
   - **Expiration:** `No expiration` (или на ваш выбор)
   - **Select scopes:** ✅ `repo` (все подпункты)
4. Нажмите "Generate token"
5. **СКОПИРУЙТЕ TOKEN!** (он больше не покажется)

Пример токена: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

### Шаг 3: Обновите package.json

```json
{
  "name": "@woxly/desktop",
  "version": "1.0.0",
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
}
```

**Замените:**
- `ваш-username` → ваш GitHub username
- `woxly` → название вашего репозитория

---

### Шаг 4: Загрузите Код на GitHub

#### Вариант А: Через Git (Рекомендуется)

```powershell
# 1. Инициализируйте Git (если еще не сделано)
cd C:\woxly
git init

# 2. Добавьте remote
git remote add origin https://github.com/ваш-username/woxly.git

# 3. Добавьте файлы
git add .
git commit -m "Initial commit"

# 4. Загрузите на GitHub
git push -u origin main
```

#### Вариант Б: Через GitHub Desktop

1. Скачайте GitHub Desktop: https://desktop.github.com/
2. Откройте GitHub Desktop
3. File → Add Local Repository → выберите `C:\woxly`
4. Publish repository

---

### Шаг 5: Установите Token

#### Windows PowerShell:

```powershell
# Установите переменную окружения
$env:GH_TOKEN = "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"

# Проверьте
echo $env:GH_TOKEN
```

#### Или добавьте в систему:

1. Нажмите Win + R
2. Введите: `sysdm.cpl`
3. Вкладка "Advanced" → "Environment Variables"
4. "User variables" → "New"
   - **Variable name:** `GH_TOKEN`
   - **Variable value:** `ghp_xxxx...`
5. OK → OK

---

### Шаг 6: Соберите и Опубликуйте

```powershell
cd C:\woxly\apps\desktop

# Убедитесь что token установлен
echo $env:GH_TOKEN

# Соберите и опубликуйте на GitHub
npm run package

# Или с автоматической публикацией:
npm run dist
```

**Что происходит:**
1. Собирается приложение
2. Создается `WOXLY-Setup-1.0.0.exe`
3. Создается `latest.yml`
4. Автоматически создается GitHub Release
5. Файлы загружаются в Release

---

### Шаг 7: Проверьте GitHub Release

1. Откройте https://github.com/ваш-username/woxly/releases
2. Должен появиться Release `v1.0.0`
3. В нем должны быть файлы:
   - `WOXLY-Setup-1.0.0.exe`
   - `latest.yml`

---

## 🔄 Выпуск Обновления

### Шаг 1: Обновите Версию

```json
// apps/desktop/package.json
{
  "version": "1.0.1"  // Было 1.0.0
}
```

### Шаг 2: Закоммитьте Изменения

```powershell
cd C:\woxly
git add .
git commit -m "Update to version 1.0.1"
git push
```

### Шаг 3: Соберите и Опубликуйте

```powershell
cd C:\woxly\apps\desktop

# Убедитесь что token установлен
$env:GH_TOKEN = "ghp_xxxx..."

# Соберите и опубликуйте
npm run dist
```

### Шаг 4: Пользователи Получат Обновление

```
Через 10 секунд - 4 часа:
  ↓
Приложение проверяет GitHub Releases
  ↓
Находит версию 1.0.1
  ↓
Скачивает автоматически
  ↓
Уведомление "Обновление готово"
  ↓
Установка при выходе
```

---

## 📝 Альтернативные Команды

### Собрать БЕЗ публикации:

```powershell
npm run package
```

### Собрать И опубликовать:

```powershell
npm run dist
```

### Собрать с draft release:

```powershell
npm run dist -- --publish always
```

---

## 🔍 Проверка Автообновлений

### 1. Проверьте GitHub Release

```
https://github.com/ваш-username/woxly/releases
```

Должны быть файлы:
- `WOXLY-Setup-X.X.X.exe`
- `latest.yml`

### 2. Проверьте latest.yml

```yaml
version: 1.0.0
files:
  - url: WOXLY-Setup-1.0.0.exe
    sha512: [автоматически]
    size: [автоматически]
path: WOXLY-Setup-1.0.0.exe
sha512: [автоматически]
releaseDate: '2024-12-14T10:00:00.000Z'
```

### 3. Тест в Приложении

Откройте DevTools (F12):

```javascript
// Проверить текущую версию
console.log(await window.electron.getAppVersion());

// Принудительно проверить обновления
await window.electron.checkForUpdates();
```

---

## 🐛 Решение Проблем

### Ошибка: "GitHub token not found"

```powershell
# Установите token
$env:GH_TOKEN = "ghp_xxxx..."

# Или добавьте в систему (см. Шаг 5)
```

### Ошибка: "Repository not found"

Проверьте `package.json`:
```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/ваш-username/woxly.git"
  },
  "build": {
    "publish": {
      "provider": "github",
      "owner": "ваш-username",  // Правильный username?
      "repo": "woxly"           // Правильное название?
    }
  }
}
```

### Ошибка: "Release already exists"

Удалите старый release на GitHub:
```
https://github.com/ваш-username/woxly/releases
→ Найдите release → Delete
```

Или измените версию в `package.json`

---

## 📊 Статистика Скачиваний

GitHub показывает статистику:

```
https://github.com/ваш-username/woxly/releases
→ Каждый release показывает количество скачиваний
```

---

## 🔒 Приватный Репозиторий

Если репозиторий приватный:

1. Token должен иметь scope `repo`
2. Пользователи все равно смогут скачивать обновления
3. GitHub автоматически создает публичные ссылки для releases

---

## ✅ Полный Пример package.json

```json
{
  "name": "@woxly/desktop",
  "version": "1.0.0",
  "description": "Woxly Desktop Application",
  "repository": {
    "type": "git",
    "url": "https://github.com/your-username/woxly.git"
  },
  "author": "Woxly Team",
  "build": {
    "appId": "com.woxly.desktop",
    "productName": "WOXLY",
    "publish": {
      "provider": "github",
      "owner": "your-username",
      "repo": "woxly"
    },
    "win": {
      "target": "nsis",
      "icon": "build/icon.ico"
    },
    "nsis": {
      "oneClick": false,
      "allowToChangeInstallationDirectory": true,
      "createDesktopShortcut": true,
      "runAfterFinish": true
    }
  }
}
```

---

## 🎉 Готово!

Теперь автообновления работают через GitHub!

**Процесс:**
1. ✅ Изменили версию в `package.json`
2. ✅ Закоммитили в Git
3. ✅ Запустили `npm run dist`
4. ✅ GitHub Release создан автоматически
5. ✅ Пользователи получат обновление

**Преимущества:**
- 🆓 Бесплатно
- 🚀 Быстро
- 🔒 Безопасно
- 📊 Статистика скачиваний
- ⚡ Автоматически

**Больше ничего настраивать не нужно!** 🎊
