# 🎨 WOXLY - Полный гид по дизайну

## 📋 Содержание

1. [Цветовая палитра](#-цветовая-палитра)
2. [Где какие цвета используются](#-где-какие-цвета-используются)
3. [Как работает проект](#-как-работает-проект)
4. [Как создать такой же дизайн](#-как-создать-такой-же-дизайн)
5. [Tailwind CSS классы](#-tailwind-css-классы)
6. [Компоненты UI](#-компоненты-ui)
7. [Анимации](#-анимации)

---

## 🎨 Цветовая палитра

### Тёмная тема (основная)

Проект использует **тёмную тему** с двумя основными цветами:

```css
/* Главный фон - очень тёмный серый */
--background: #0a0a0a;

/* Акцентный цвет - розовато-красный */
--primary: #ffbdd3;
--accent: #ffbdd3;
--ring: #ffbdd3;  /* Для обводки при фокусе */
```

### Полная палитра (из `/styles/globals.css`)

<table>
<tr>
<th>Переменная</th>
<th>Цвет</th>
<th>HEX</th>
<th>Где используется</th>
</tr>

<!-- Основные -->
<tr>
<td><code>--background</code></td>
<td bgcolor="#0a0a0a">████</td>
<td><code>#0a0a0a</code></td>
<td>Главный фон приложения</td>
</tr>

<tr>
<td><code>--foreground</code></td>
<td bgcolor="#F1F5F9">████</td>
<td><code>#F1F5F9</code></td>
<td>Основной текст</td>
</tr>

<!-- Карточки -->
<tr>
<td><code>--card</code></td>
<td bgcolor="#1a1a1a">████</td>
<td><code>#1a1a1a</code></td>
<td>Фон карточек, модалок</td>
</tr>

<tr>
<td><code>--card-foreground</code></td>
<td bgcolor="#F1F5F9">████</td>
<td><code>#F1F5F9</code></td>
<td>Текст на карточках</td>
</tr>

<!-- Акценты -->
<tr>
<td><code>--primary</code></td>
<td bgcolor="#ffbdd3">████</td>
<td><code>#ffbdd3</code></td>
<td>Кнопки, ссылки, активные элементы</td>
</tr>

<tr>
<td><code>--accent</code></td>
<td bgcolor="#ffbdd3">████</td>
<td><code>#ffbdd3</code></td>
<td>Иконки, индикаторы, hover</td>
</tr>

<!-- Приглушённые -->
<tr>
<td><code>--muted</code></td>
<td bgcolor="#1a1a1a">████</td>
<td><code>#1a1a1a</code></td>
<td>Неактивные элементы фон</td>
</tr>

<tr>
<td><code>--muted-foreground</code></td>
<td bgcolor="#666666">████</td>
<td><code>#666666</code></td>
<td>Серый текст, подписи</td>
</tr>

<!-- Деструктивные -->
<tr>
<td><code>--destructive</code></td>
<td bgcolor="#EF4444">████</td>
<td><code>#EF4444</code></td>
<td>Кнопки удаления, ошибки</td>
</tr>

<!-- Границы -->
<tr>
<td><code>--border</code></td>
<td bgcolor="#1a1a1a">████</td>
<td><code>#1a1a1a</code></td>
<td>Границы элементов</td>
</tr>

<!-- Поля ввода -->
<tr>
<td><code>--input</code></td>
<td bgcolor="#1a1a1a">████</td>
<td><code>#1a1a1a</code></td>
<td>Фон инпутов</td>
</tr>

</table>

---

## 📍 Где какие цвета используются

### 1. **Основной фон (#0a0a0a)**

```tsx
// Весь экран приложения
<div className="bg-background">  {/* #0a0a0a */}
  ...
</div>
```

**Где видно:**
- Вся страница
- Левая боковая панель
- Правая панель участников
- Пустые области

---

### 2. **Карточки и модальные окна (#1a1a1a)**

```tsx
// Модальные окна
<div className="bg-card">  {/* #1a1a1a */}
  ...
</div>

// Карточки друзей
<div className="bg-card rounded-lg border border-border">
  ...
</div>
```

**Где видно:**
- Модальные окна (регистрация, профиль)
- Карточки друзей
- Dropdown меню
- Поля ввода
- Панель управления звуком внизу

---

### 3. **Акцентный цвет - Розовый (#ffbdd3)**

```tsx
// Кнопки
<Button className="bg-primary text-primary-foreground">
  Войти  {/* Фон #ffbdd3, текст #FFFFFF */}
</Button>

// Иконки при hover
<MicIcon className="hover:text-primary" />

// Активные состояния
<div className="text-primary">  {/* #ffbdd3 */}
  Активный элемент
</div>
```

**Где видно:**
- Кнопка "Войти" / "Зарегистрироваться"
- Активная вкладка (Друзья/Комнаты)
- Иконки при наведении
- Индикатор "говорит сейчас"
- Обводка при фокусе (ring)
- Ссылки
- Чекбоксы (выбрано)
- Иконка микрофона когда включен

---

### 4. **Текст**

```tsx
// Основной текст - светло-серый
<p className="text-foreground">  {/* #F1F5F9 */}
  Основной текст
</p>

// Приглушённый текст - серый
<span className="text-muted-foreground">  {/* #666666 */}
  Подпись, timestamp
</span>

// Белый текст
<span className="text-white">
  Заголовок
</span>
```

**Где видно:**
- `#F1F5F9` - Имена пользователей, заголовки
- `#666666` - Статусы (онлайн/офлайн), время сообщений
- `#FFFFFF` - Кнопки, важный текст

---

### 5. **Красный цвет для ошибок (#EF4444)**

```tsx
// Кнопка удаления
<Button variant="destructive">  {/* #EF4444 */}
  Удалить друга
</Button>

// Сообщения об ошибках
<p className="text-destructive">
  Неправильный пароль
</p>
```

**Где видно:**
- Кнопка "Удалить друга"
- Кнопка "Выйти"
- Сообщения об ошибках (toast)
- Красная иконка выключенного микрофона

---

### 6. **Границы (#1a1a1a)**

```tsx
<div className="border border-border">  {/* #1a1a1a */}
  ...
</div>
```

**Где видно:**
- Границы карточек друзей
- Разделители между секциями
- Рамки вокруг инпутов
- Линии между элементами меню

---

## 🏗️ Как работает проект

### Архитектура

```
┌─────────────────────────────────────────────────────────┐
│                     App.tsx (главный)                   │
│  ┌──────────────────────────────────────────────────┐   │
│  │ State Management (useState)                      │   │
│  │ - isAuthenticated                                │   │
│  │ - currentUser                                    │   │
│  │ - friends, rooms, messages                       │   │
│  │ - activeCallRoomId                               │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
                          │
         ┌────────────────┼────────────────┐
         ▼                ▼                ▼
    ┌─────────┐    ┌──────────┐    ┌──────────┐
    │ Sidebar │    │  Main    │    │ Right    │
    │ (слева) │    │ (центр)  │    │ (справа) │
    └─────────┘    └──────────┘    └──────────┘
         │              │                │
    ┌─────────┐    ┌─────────┐    ┌──────────────┐
    │ Friends │    │ Voice   │    │ Participants │
    │ Rooms   │    │ Panel   │    │ List         │
    │ Search  │    │ Chat    │    │              │
    └─────────┘    └─────────┘    └──────────────┘
```

### Основные компоненты

#### 1. **App.tsx** - главный компонент

```tsx
export default function App() {
  // 1. State для аутентификации
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // 2. State для UI
  const [activeTab, setActiveTab] = useState('rooms');
  const [isMuted, setIsMuted] = useState(false);
  
  // 3. Данные
  const [friends, setFriends] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  
  // 4. Рендер UI
  return (
    <div className="bg-background">
      {/* Если не авторизован - показать AuthModal */}
      {!isAuthenticated && <AuthModal />}
      
      {/* Если авторизован - показать главный интерфейс */}
      {isAuthenticated && (
        <>
          <Sidebar />
          <MainContent />
          <RightPanel />
        </>
      )}
    </div>
  );
}
```

#### 2. **Боковая панель (Sidebar)** - слева

```tsx
// Вкладки: Друзья или Комнаты
<div className="flex gap-2 mb-4">
  <Button 
    variant={activeTab === 'friends' ? 'default' : 'ghost'}
    onClick={() => setActiveTab('friends')}
  >
    Друзья
  </Button>
  <Button 
    variant={activeTab === 'rooms' ? 'default' : 'ghost'}
    onClick={() => setActiveTab('rooms')}
  >
    Комнаты
  </Button>
</div>

// Поиск
<Input placeholder="Поиск..." />

// Список друзей или комнат
{activeTab === 'friends' ? (
  <FriendsList />
) : (
  <RoomsList />
)}
```

#### 3. **Центральная область**

```tsx
// Голосовая панель
<div className="bg-card rounded-lg p-6">
  <h2>Голосовой чат</h2>
  
  {/* Декоративный фон с анимацией */}
  <div className="animate-float bg-primary/10" />
  
  {/* Кнопка присоединиться */}
  <Button>Присоединиться</Button>
</div>

// Чат
<div className="flex flex-col">
  {/* Сообщения */}
  <div className="flex-1 overflow-y-auto">
    {messages.map(msg => (
      <div key={msg.id}>
        <span>{msg.sender}</span>
        <p>{msg.text}</p>
      </div>
    ))}
  </div>
  
  {/* Поле ввода */}
  <Input 
    value={message}
    onChange={(e) => setMessage(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === 'Enter') sendMessage();
    }}
  />
</div>
```

#### 4. **Правая панель - Участники**

```tsx
<div className="w-64 bg-background">
  <h3>Участники голосового чата</h3>
  
  {participants.map(user => (
    <div key={user.id} className="flex items-center gap-3 p-3">
      {/* Аватар */}
      <img src={user.avatar} className="w-10 h-10 rounded-full" />
      
      {/* Имя */}
      <span>{user.name}</span>
      
      {/* Индикатор говорит */}
      {user.isSpeaking && (
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </div>
  ))}
</div>
```

---

### Как работает localStorage

```tsx
// Сохранение данных
useEffect(() => {
  localStorage.setItem('friends', JSON.stringify(friends));
  localStorage.setItem('rooms', JSON.stringify(rooms));
  localStorage.setItem('roomMessages', JSON.stringify(roomMessages));
}, [friends, rooms, roomMessages]);

// Загрузка данных при старте
const [friends, setFriends] = useState(() => {
  const saved = localStorage.getItem('friends');
  return saved ? JSON.parse(saved) : [];
});
```

**Что хранится:**
- Список друзей
- Список комнат
- Сообщения (по комнатам)
- Настройки пользователя
- Состояние аутентификации

---

## 🛠️ Как создать такой же дизайн

### Шаг 1: Настройте цвета в globals.css

**Файл:** `/styles/globals.css`

```css
.dark {
  /* Главный фон - тёмный */
  --background: #0a0a0a;
  
  /* Карточки - немного светлее */
  --card: #1a1a1a;
  
  /* Акцентный цвет - ваш выбор! */
  --primary: #ffbdd3;  /* Розовый */
  --accent: #ffbdd3;
  --ring: #ffbdd3;
  
  /* Текст */
  --foreground: #F1F5F9;  /* Светло-серый */
  --muted-foreground: #666666;  /* Серый */
  
  /* Границы */
  --border: #1a1a1a;
  
  /* Ошибки */
  --destructive: #EF4444;  /* Красный */
}
```

**Примеры других цветовых схем:**

```css
/* Синяя тема */
.dark {
  --background: #0a0a0a;
  --primary: #3b82f6;  /* Синий */
  --accent: #60a5fa;
}

/* Зелёная тема */
.dark {
  --background: #0a0a0a;
  --primary: #10b981;  /* Зелёный */
  --accent: #34d399;
}

/* Фиолетовая тема */
.dark {
  --background: #0a0a0a;
  --primary: #8b5cf6;  /* Фиолетовый */
  --accent: #a78bfa;
}

/* Оранжевая тема */
.dark {
  --background: #0a0a0a;
  --primary: #f97316;  /* Оранжевый */
  --accent: #fb923c;
}
```

---

### Шаг 2: Используйте Tailwind классы

#### Фон

```tsx
{/* Главный фон приложения */}
<div className="bg-background">

{/* Карточка */}
<div className="bg-card">

{/* Полупрозрачный акцент */}
<div className="bg-primary/10">  {/* 10% opacity */}
<div className="bg-primary/20">  {/* 20% opacity */}
```

#### Текст

```tsx
{/* Основной текст */}
<p className="text-foreground">

{/* Серый текст */}
<span className="text-muted-foreground">

{/* Акцентный текст */}
<a className="text-primary">

{/* Белый текст */}
<h1 className="text-white">
```

#### Границы

```tsx
{/* Граница */}
<div className="border border-border">

{/* Скругление углов */}
<div className="rounded-lg">  {/* 0.625rem = 10px */}
<div className="rounded-full">  {/* Круглый */}
```

#### Кнопки

```tsx
{/* Основная кнопка - розовый фон */}
<Button variant="default">
  Войти
</Button>

{/* Прозрачная кнопка */}
<Button variant="ghost">
  Отмена
</Button>

{/* Красная кнопка */}
<Button variant="destructive">
  Удалить
</Button>
```

---

### Шаг 3: Создайте компонент карточки

```tsx
// Файл: components/MyCard.tsx
export function MyCard({ title, children }) {
  return (
    <div className="
      bg-card                    /* Фон #1a1a1a */
      border border-border       /* Граница #1a1a1a */
      rounded-lg                 /* Скругление 10px */
      p-4                        /* Отступы внутри */
      hover:border-primary/50    /* При hover - розовая граница */
      transition-colors          /* Плавный переход */
    ">
      <h3 className="text-foreground mb-2">
        {title}
      </h3>
      <div className="text-muted-foreground">
        {children}
      </div>
    </div>
  );
}
```

**Использование:**

```tsx
<MyCard title="Профиль">
  <p>Имя пользователя</p>
</MyCard>
```

---

### Шаг 4: Добавьте анимации

```tsx
{/* Пульсация (для индикатора говорит) */}
<div className="
  w-2 h-2 
  rounded-full 
  bg-primary 
  animate-pulse
" />

{/* Плавное появление */}
<div className="
  opacity-0 
  animate-in 
  fade-in 
  duration-300
">
  Контент
</div>

{/* Hover эффект */}
<button className="
  text-muted-foreground
  hover:text-primary      /* При наведении - розовый */
  transition-colors       /* Плавный переход */
  duration-200
">
  Кнопка
</button>
```

---

### Шаг 5: Создайте градиенты

```tsx
{/* Градиентный фон */}
<div className="
  bg-gradient-to-r 
  from-primary/20 
  to-primary/5
">
  Градиент
</div>

{/* Градиентный текст */}
<h1 className="
  bg-gradient-to-r 
  from-primary 
  to-pink-400 
  bg-clip-text 
  text-transparent
">
  Заголовок
</h1>

{/* Радиальный градиент */}
<div style={{
  background: 'radial-gradient(circle, rgba(255,189,211,0.1) 0%, transparent 70%)'
}}>
  Контент
</div>
```

---

### Шаг 6: Используйте тени

```tsx
{/* Маленькая тень */}
<div className="shadow-sm">

{/* Средняя тень */}
<div className="shadow-md">

{/* Большая тень */}
<div className="shadow-lg">

{/* Тень с цветом */}
<div className="shadow-lg shadow-primary/20">

{/* Светящийся эффект */}
<div style={{
  boxShadow: '0 0 20px rgba(255, 189, 211, 0.3)'
}}>
```

---

## 📐 Tailwind CSS классы

### Размеры

```tsx
{/* Ширина */}
className="w-full"        // 100%
className="w-64"          // 16rem (256px)
className="w-1/2"         // 50%

{/* Высота */}
className="h-full"        // 100%
className="h-screen"      // 100vh
className="h-auto"        // Авто

{/* Max ширина */}
className="max-w-md"      // 28rem
className="max-w-screen-xl"  // 1280px
```

### Отступы

```tsx
{/* Padding */}
className="p-4"           // Со всех сторон 1rem
className="px-6"          // Слева/справа 1.5rem
className="py-3"          // Сверху/снизу 0.75rem

{/* Margin */}
className="m-4"           // Со всех сторон
className="mb-6"          // Снизу
className="mt-auto"       // Сверху auto
```

### Flexbox

```tsx
{/* Flex контейнер */}
className="flex"
className="flex flex-col"        // Вертикально
className="flex items-center"    // Выравнивание по центру
className="flex justify-between" // Между элементами
className="flex gap-4"           // Отступ между элементами
```

### Grid

```tsx
{/* Grid контейнер */}
className="grid grid-cols-3"     // 3 колонки
className="grid gap-4"           // Отступ между
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3"  // Адаптивный
```

### Позиционирование

```tsx
className="relative"
className="absolute top-0 right-0"
className="fixed bottom-0 left-0"
className="sticky top-0"
```

### Overflow

```tsx
className="overflow-hidden"      // Скрыть переполнение
className="overflow-y-auto"      // Прокрутка по Y
className="overflow-scroll"      // Всегда скролл
```

---

## 🎭 Компоненты UI

### Button (кнопка)

```tsx
import { Button } from './components/ui/button';

{/* Варианты */}
<Button variant="default">Войти</Button>        // Розовая
<Button variant="ghost">Отмена</Button>         // Прозрачная
<Button variant="destructive">Удалить</Button>  // Красная
<Button variant="outline">Контур</Button>       // С рамкой

{/* Размеры */}
<Button size="sm">Маленькая</Button>
<Button size="default">Обычная</Button>
<Button size="lg">Большая</Button>

{/* С иконкой */}
<Button>
  <SearchIcon className="w-4 h-4 mr-2" />
  Поиск
</Button>
```

### Input (поле ввода)

```tsx
import { Input } from './components/ui/input';

<Input 
  type="text"
  placeholder="Введите текст..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
  className="bg-input"
/>

{/* Email */}
<Input type="email" placeholder="email@example.com" />

{/* Пароль */}
<Input type="password" placeholder="Пароль" />
```

### Dialog (модальное окно)

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './components/ui/dialog';

<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogContent className="bg-card">
    <DialogHeader>
      <DialogTitle>Заголовок</DialogTitle>
    </DialogHeader>
    
    <div>
      Контент модального окна
    </div>
  </DialogContent>
</Dialog>
```

### Avatar (аватар)

```tsx
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';

<Avatar>
  <AvatarImage src="https://example.com/avatar.jpg" />
  <AvatarFallback>AB</AvatarFallback>  {/* Если нет картинки */}
</Avatar>
```

### DropdownMenu (выпадающее меню)

```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './components/ui/dropdown-menu';

<DropdownMenu>
  <DropdownMenuTrigger>
    <Button variant="ghost">Меню</Button>
  </DropdownMenuTrigger>
  
  <DropdownMenuContent className="bg-card">
    <DropdownMenuItem onClick={() => alert('Профиль')}>
      Профиль
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => alert('Настройки')}>
      Настройки
    </DropdownMenuItem>
    <DropdownMenuItem className="text-destructive">
      Выйти
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

---

## ✨ Анимации

### Встроенные Tailwind анимации

```tsx
{/* Пульсация */}
<div className="animate-pulse">

{/* Вращение */}
<div className="animate-spin">

{/* Подпрыгивание */}
<div className="animate-bounce">

{/* Ping эффект */}
<div className="animate-ping">
```

### Кастомные анимации из globals.css

```tsx
{/* Плавающая анимация (для фона) */}
<div className="animate-float" />

{/* Плавающая с задержкой */}
<div className="animate-float-delayed" />

{/* Плавная пульсация */}
<div className="animate-smooth-pulse" />

{/* Плавный ping */}
<div className="animate-smooth-ping" />
```

### Transition при hover

```tsx
{/* Цвет */}
<div className="
  text-muted-foreground 
  hover:text-primary 
  transition-colors 
  duration-200
">

{/* Размер */}
<div className="
  scale-100 
  hover:scale-105 
  transition-transform 
  duration-300
">

{/* Opacity */}
<div className="
  opacity-70 
  hover:opacity-100 
  transition-opacity 
  duration-200
">

{/* Всё вместе */}
<div className="
  transition-all 
  duration-300 
  hover:scale-105 
  hover:text-primary
">
```

---

## 🎯 Практические примеры

### Пример 1: Карточка друга

```tsx
<div className="
  bg-card 
  border border-border 
  rounded-lg 
  p-4 
  flex items-center gap-3
  hover:border-primary/50
  transition-colors
  cursor-pointer
">
  {/* Аватар */}
  <img 
    src={friend.avatar} 
    className="w-12 h-12 rounded-full"
  />
  
  {/* Инфо */}
  <div className="flex-1">
    <h4 className="text-foreground">
      {friend.name}
    </h4>
    <p className="text-muted-foreground text-sm">
      {friend.status}
    </p>
  </div>
  
  {/* Индикатор онлайн */}
  {friend.status === 'online' && (
    <div className="
      w-3 h-3 
      rounded-full 
      bg-green-500
    " />
  )}
</div>
```

### Пример 2: Сообщение в чате

```tsx
<div className="flex gap-3 p-3">
  {/* Аватар */}
  <img 
    src={message.avatar} 
    className="w-8 h-8 rounded-full"
  />
  
  {/* Контент */}
  <div className="flex-1">
    {/* Заголовок */}
    <div className="flex items-center gap-2 mb-1">
      <span className="text-foreground text-sm font-medium">
        {message.sender}
      </span>
      <span className="text-muted-foreground text-xs">
        {formatTime(message.timestamp)}
      </span>
    </div>
    
    {/* Текст */}
    <p className="text-foreground">
      {message.text}
    </p>
  </div>
</div>
```

### Пример 3: Кнопка с иконкой и индикатором

```tsx
<button className="
  relative
  bg-card 
  border border-border
  rounded-full
  p-3
  hover:bg-primary/10
  hover:border-primary/50
  transition-colors
  group
">
  {/* Иконка */}
  <MicIcon className="
    w-5 h-5 
    text-muted-foreground
    group-hover:text-primary
    transition-colors
  " />
  
  {/* Индикатор активности */}
  {isMuted && (
    <div className="
      absolute -top-1 -right-1
      w-3 h-3
      rounded-full
      bg-destructive
      border-2 border-background
    " />
  )}
</button>
```

### Пример 4: Голосовая панель с анимацией

```tsx
<div className="
  relative
  bg-card 
  rounded-lg 
  p-8
  overflow-hidden
">
  {/* Анимированный фон */}
  <div className="
    absolute inset-0
    bg-gradient-to-br 
    from-primary/10 
    via-transparent 
    to-primary/5
    animate-float
  " />
  
  <div className="
    absolute top-10 right-10
    w-64 h-64
    bg-primary/5
    rounded-full
    blur-3xl
    animate-float-delayed
  " />
  
  {/* Контент */}
  <div className="relative z-10">
    <h2 className="text-2xl text-foreground mb-4">
      Голосовой чат
    </h2>
    
    <Button variant="default">
      Присоединиться
    </Button>
  </div>
</div>
```

---

## 🔧 Как изменить основной акцентный цвет

### Вариант 1: Изменить в globals.css

**Файл:** `/styles/globals.css`

```css
.dark {
  /* Было: */
  --primary: #ffbdd3;  /* Розовый */
  
  /* Стало (например, синий): */
  --primary: #3b82f6;
  --accent: #3b82f6;
  --ring: #3b82f6;
}
```

**Готово!** Весь проект теперь синий! 🎨

### Вариант 2: Создать несколько тем

```css
/* Розовая тема (по умолчанию) */
.dark {
  --primary: #ffbdd3;
}

/* Синяя тема */
.dark.theme-blue {
  --primary: #3b82f6;
}

/* Зелёная тема */
.dark.theme-green {
  --primary: #10b981;
}
```

**Использование:**

```tsx
// В App.tsx
const [theme, setTheme] = useState('default');

<div className={`dark ${theme === 'blue' ? 'theme-blue' : ''}`}>
  {/* Ваше приложение */}
</div>
```

---

## 📚 Полезные ресурсы

### Цвета
- [Coolors.co](https://coolors.co/) - Генератор палитр
- [ColorHunt](https://colorhunt.co/) - Готовые палитры
- [UIGradients](https://uigradients.com/) - Красивые градиенты

### Tailwind CSS
- [Tailwind Docs](https://tailwindcss.com/docs) - Официальная документация
- [Tailwind Cheat Sheet](https://nerdcave.com/tailwind-cheat-sheet) - Шпаргалка

### Компоненты
- [ShadCN UI](https://ui.shadcn.com/) - Библиотека компонентов
- [Radix UI](https://www.radix-ui.com/) - Примитивы UI

### Иконки
- [Lucide Icons](https://lucide.dev/) - Набор иконок
- [Hero Icons](https://heroicons.com/) - Альтернатива

---

## 🎓 Итого

### Основные цвета WOXLY:
- **Фон:** `#0a0a0a` (очень тёмный)
- **Карточки:** `#1a1a1a` (тёмно-серый)
- **Акцент:** `#ffbdd3` (розовый)
- **Текст:** `#F1F5F9` (светло-серый)
- **Серый текст:** `#666666`
- **Ошибки:** `#EF4444` (красный)

### Как работает:
1. App.tsx управляет всем state
2. localStorage хранит данные
3. Tailwind CSS для стилей
4. ShadCN/Radix UI компоненты
5. Анимации через CSS

### Чтобы создать свой дизайн:
1. Измените цвета в `/styles/globals.css`
2. Используйте Tailwind классы (`bg-primary`, `text-foreground`)
3. Копируйте и модифицируйте компоненты
4. Добавляйте анимации (`animate-pulse`, `transition-colors`)
5. Тестируйте!

---

**Удачи в создании! 🚀**

Если нужна помощь - спрашивайте! 💬
