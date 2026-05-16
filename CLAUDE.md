# udacknii_sait — NestJS Backend API

## Стек
- NestJS 10, TypeScript
- TypeORM + MySQL (`site_db` на `10.182.226.152:3306`)
- multer (memory storage) — загрузка файлов
- Аутентификация через куки `auth_token`

## Переменные окружения
```
PORT          # Порт сервера (по умолчанию 3000)
UPLOADS_DIR   # Путь к папке загрузок (по умолчанию /mnt/shared/uploads)
```
База данных задана хардкодом в `app.module.ts`.

## Структура `src/`

```
main.ts                         # Точка входа, запуск на PORT
app.module.ts                   # Корневой модуль, TypeORM конфиг, все модули

db/                             # Сущности и модуль базы данных
  db.module.ts                  # Регистрирует все entity для TypeORM
  token.entity.ts               # Сессионные токены (token, user_id, expired)
  login.entity.ts               # Логины (login, hashedpassword, hid)
  flags.entity.ts               # Флаги пользователей (hid, flag)
  hierarchy.entity.ts           # Иерархия организации (id, name, parent_id, type)
  addresses.entity.ts           # Адреса
  user_profile.entity.ts        # Профиль (hid, birthday, phone)
  suggestion.entity.ts          # Предложения пользователей
  personal/
    personal_ls.entity.ts       # Аккаунты персонала
    personal_ls_info.entity.ts  # Доп. инфо персонала
    personal_pos.entity.ts      # Должности
  chat/
    chat_list.entity.ts         # Список чатов
    chat_bukket.entity.ts       # Сообщения чата
    hid_for_chat.entity.ts      # Участники чата
  ostatki/
    ostatki_fields.entity.ts    # Поля инвентаризации
    ostatki_reg.entity.ts       # Регистры инвентаризации
  ... и ~20 других entity (orders, stock, sales, zarplata и т.д.)

client_api/                     # Все API-роуты (prefix: /client_api)
  client_api.controller.ts      # /get_hierarchy_tree, /get_address_tree,
                                #   /check_token, /profile, /change_password
  client_api.service.ts         # validateToken(), getFlags() — используется везде

  chat/                         # /client_api/chat/*
    chat.controller.ts          # get_chat_list, get_messages, send_message,
                                #   get_hid_for_chat, get_users_list, create_chat
  files/                        # /client_api/files/*
    files.controller.ts         # POST upload (вложения), POST upload-avatar
    files.service.ts            # Сохраняет файлы в UPLOADS_DIR
                                #   Вложения: uuid.ext
                                #   Аватары: avatar_{hid}.jpg
  suggestions/                  # /client_api/suggestions/*
    suggestions.controller.ts   # POST submit (все), GET list (ADMIN/TECH_SUPPORT)
  personal/                     # /client_api/personal/*
  orders/                       # /client_api/orders/*
  otchet/                       # /client_api/otchet/*
  ostatki/                      # /client_api/ostatki/*
  zarplati/                     # /client_api/zarplati/*
  service/                      # /client_api/service/*
  mail/                         # /client_api/mail/*
```

## База данных `site_db` — ключевые таблицы

| Таблица | Назначение |
|---------|-----------|
| `login` | login, hashedpassword, hid |
| `token` | Сессии: token, user_id, expired |
| `flags` | Роли: hid + flag (ADMIN, SERVICE, CHAT, LS_{hid} и др.) |
| `hierarchy` | Дерево орг. структуры. `parent_id=-1` → скрыт из дерева |
| `addresses` | Адреса магазинов. `parent_id` → ссылка на hierarchy |
| `user_profile` | Доп. данные профиля (birthday, phone) |
| `suggestions` | Предложения/сообщения от пользователей |
| `chat_list` | Чаты (hid_from, hid_to) |
| `chat_bukket` | Сообщения чата. Вложения хранятся в тексте как XML |

## Паттерн авторизации
Каждый контроллер:
1. Извлекает токен из куки `auth_token` или заголовков
2. Вызывает `clientApiService.validateToken(token)` → получает `hid`
3. При необходимости: `clientApiService.getFlags(hid)` → проверяет флаги

## Флаги пользователей
```
ADMIN           — полный доступ
TECH_SUPPORT    — техподдержка (просмотр suggestions)
SERVICE         — доступ к сервисным обращениям  
SERVICE_ADMIN   — (устарел, заменён на SERVICE для LS)
CHAT            — доступ к чату
LS_{hid}        — линейный персонал, hid = id отдела в hierarchy
LS_AUTOZAKAZI   — автозаказы/остатки
RESULTS         — отчёты
```

## Файлы и аватары
- **Загрузка**: `POST /client_api/files/upload` (вложения), `POST /client_api/files/upload-avatar` (аватары)
- **Хранилище**: `/mnt/shared/uploads` (общий сетевой диск с fileserver)
- **Именование**: вложения — `{uuid}.{ext}`, аватары — `avatar_{hid}.jpg`
- **Отдача**: через fileserver контейнер по `/files/{filename}`
- Максимальный размер: 10 МБ

## Линейный персонал (LS)
- `hid` в диапазоне 8001+ (тестовый: 8001, реальные: 8002-8024+)
- В `hierarchy` с `parent_id=-1` (не отображаются в дереве)
- Логин: телефон в формате `+7XXXXXXXXXX`
- Пароль: SHA256(последние4цифры + '+96678763')
- Флаги: `LS_{hid_отдела}`, `SERVICE`, `LS_AUTOZAKAZI`, `CHAT`

## Кулинарные отделы (добавлены)
| hid | Название | Магазин |
|-----|----------|---------|
| 3174 | Кулинария Пулково | Бойко |
| 3175 | Кулинария Ропша | Бойко |
| 3176 | Кулинария 2Ветеранов | Бойко |
| 3177 | Кулинария Гатчина | Бойко |
| 3178 | Кулинария Бугры | Борякина |
| 3179 | Кулинария Петергоф | Борякина |
| 3180 | Кулинария Красное | Борякина |
