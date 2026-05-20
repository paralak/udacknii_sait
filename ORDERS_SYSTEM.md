# Система автоматического формирования заказов

## Контекст и бизнес-логика

### Что это

Система автоматического формирования закупочных заказов для кулинарных отделов сети магазинов.
Товары — **производственные ингредиенты** (некоммерческие закупки): они не продаются напрямую,
а участвуют в производстве конечной продукции (кофейные напитки, десерты, выпечка).
Цепочка спроса: продажи конечного товара → расход ингредиентов по ТТК → потребность в закупке.

### Ключевые ограничения

- **Нет данных по объёму склада** — заказчик не предоставляет выделенные объёмы. Обратная связь
  поступает в виде субъективных жалоб управляющих на «перетарку».
- **Нет актуальных данных продаж** — только исторические данные за прошлые месяцы
  (`prodaji_napitki_mes`, `prodaji_dec_mes_2`). Текущий месяц неизвестен.
- **Алгоритм намеренно избыточен** — заказы генерируются с запасом, раз в месяц проводится
  инвентаризация (остатки), которая сбрасывает симуляцию к реальному состоянию склада.
- **Реальные заказы расходятся с генерированными** — управляющие правят заказы вручную.
  Эта дельта является ценными данными для калибровки системы.

### Адреса (кофе-бары)

| Код  | Название         | Адрес                        | ИП               | Роль               |
|------|-----------------|------------------------------|------------------|--------------------|
| A1   | Бугры           | П. Бугры, Нижняя, 1          | ИП Багуров       |                    |
| A2   | Свердлово       | Пгт Свердлова, Овцинская, 70Б| ИП Егорова       |                    |
| A3   | Ропша           | Ропшанское ш., д. 1          | ИП Константинов  |                    |
| A4   | Мурино          | Мурино, Екатерининская, 17   | ИП Иванов        |                    |
| A5   | Ветеранов       | Пр. Ветеранов, д. 173        | ИП Багуров       |                    |
| A6   | Тихорецкий      | Тихорецкий пр., 15           | ИП Иванов        |                    |
| A7   | Ленсовета       | Ул. Ленсовета, д. 88         | ИП Иванов        |                    |
| A8   | Абрамова        | Ул. Фёдора Абрамова, 8       | ИП Горохова      |                    |
| A9   | Гагарина        | Пр. Юрия Гагарина, д. 18     | ИП Константинов  |                    |
| A10  | Горелово        | Ул. Современников, д. 3      | ИП Багуров       | **Производство/РЦ** |

**A10 Горелово** — особый адрес: здесь расположено производство и распределительный центр.
Поставка на Горелово происходит в фиксированный день вне зависимости от суммы заказа
(`min_order_sum = 0`). Другие адреса могут получать товар попутно через Горелово.

### Поставщики

| Код              | Название               | Категория          |
|-----------------|------------------------|--------------------|
| post_gdt        | GDT                    | Расходники         |
| post_kms        | КМС                    | Расходники         |
| post_u_vatch    | ИП Харисова Д.Р.       | Расходники         |
| post_prom       | ПРОМИНДУСТРИЯ          | Расходники         |
| post_alef       | АЛЕФ-ТРЕЙД             | Расходники         |
| post_A10        | Горелово (локальный)   | Расходники         |
| post_tks        | ТКС                    | Расходники         |
| post_dec_fan    | Десерт Фэнтэзи         | Десерты            |
| post_pirgoroy   | Пир Горой              | Десерты/выпечка    |
| post_boget      | Багетная Мастерская    | Выпечка            |
| post_usadba     | Хлебная Усадьба        | Выпечка            |
| post_ves_tort   | Весовые тортики        | Десерты            |

---

## Существующие таблицы БД (site_db)

Все таблицы находятся в `site_db`. NestJS-бэкенд уже подключён к этой БД через TypeORM.

### Инвентаризация (остатки)

**`ostatki_reg`** — реестр форм инвентаризации
```
id          INT PK
name        VARCHAR   — название формы (напр. "A1 Бугры")
parent      INT NULL  — иерархия форм
access      INT       — флаг доступа (соответствует hid в hierarchy)
address     INT       — числовой ID адреса (соответствует addresses.id)
```

**`ostatki_fields`** — список SKU для каждой формы
```
id              INT PK
sku_id          INT       — ссылка на sku_parameters.sku_id
type            VARCHAR   — тип поля
ostatki_reg_id  INT       — ссылка на ostatki_reg.id
```

**`stock2`** — история внесённых остатков (данные инвентаризации)
```
id       INT PK
address  INT       — числовой ID адреса
sku_id   VARCHAR   — ID товара (строка, хотя логически число)
value    INT       — количество
date     DATETIME  — дата внесения
```
> Инвентаризация через `stock2` — это центральное событие. При проведении она сбрасывает
> симуляцию к реальному состоянию и служит точкой отсчёта для следующего прогноза.

### Справочники SKU

**`sku_parameters`** — справочник товаров/ингредиентов
```
sku_id              INT PK
name                VARCHAR   — полное название
name_short          VARCHAR   — краткое название
artikul             VARCHAR   — артикул
packaging           VARCHAR   — наша фасовка (единица учёта)
packaging_supplier  VARCHAR   — фасовка поставщика (единица заказа)
category_id          INT       — категория (расходник/десерт/выпечка)
is_ingredient        INT       — 1 если производственный ингредиент
supplier_id          INT       — поставщик по умолчанию
order_multiple       INT       — кратность заказа в единицах поставщика
packaging_multiple   FLOAT     — коэффициент перевода наша→поставщик
is_volume_critical   INT       — 1 если товар критичен по объёму (молоко и др.)
                               — буфер порога = фиксированные 1-2 дня, не delivery_interval
```

### Заказы

**`orders_table`** — поданные заказы поставщикам
```
id            INT PK
order_id      VARCHAR   — идентификатор сессии заказа (напр. "2025-05-01_coffee")
address       VARCHAR   — код адреса (A1..A10)
supplier      VARCHAR   — код поставщика (post_gdt, ...)
product_id    INT       — sku_parameters.sku_id
count         INT       — количество в единицах поставщика
date          DATE      — дата поставки (когда товар придёт)
status        ENUM      — draft | submitted | delivered
submitted_at  DATETIME  — когда заказ был отправлен поставщику
```
> Заказ — это документ поставщику, не просто результат расчёта.
> При повторном расчёте строки со статусом submitted/delivered учитываются
> как гарантированные поставки и не дублируются.
> После submitted до delivered — заказ можно скорректировать только вручную.

**`order_access`** — права доступа к заказам по флагам
```
id        INT PK
flag      VARCHAR   — флаг пользователя (напр. TM_3001)
order_id  VARCHAR   — ссылка на orders_table.order_id
name      VARCHAR   — название заказа для отображения
```

### Данные продаж (исторические, только чтение)

**`prodaji_napitki_mes`** — продажи напитков по месяцам
```
— адрес, артикул напитка, количество, месяц/год
```

**`prodaji_dec_mes_2`** — продажи десертов по месяцам
```
— адрес, артикул десерта, количество, месяц/год
```

**`sales`** — общая таблица продаж

### Настройки автозаказов (новые, уже созданы)

**`auto_orders_address`** — маппинг кодов адресов A1–A10 к hid иерархии
```
id            INT PK
address_code  VARCHAR UNIQUE   — A1..A10
name          VARCHAR          — название адреса
hid           INT NULL UNIQUE  — hid из hierarchy (NULL для A7 и A10)
```

**`sku_item_settings`** — настройки товаров по адресу (мигрировано из python_bot)
```
id                 INT PK
address_code       VARCHAR   — код адреса A1..A10
sku_id             INT       — ссылка на sku_parameters.sku_id
supplier_role      VARCHAR   — поставщик для этого товара на этом адресе
nz                 FLOAT     — норматив запаса (НЗ)
max_stock          FLOAT     — максимальный запас (NULL = не задан)
consumption_factor FLOAT     — множитель расхода 0.8/0.9/1.0/1.1/1.2 (default: 1.0)
order_multiple     FLOAT     — кратность заказа
packaging_multiple FLOAT     — кратность упаковки
UNIQUE (address_code, sku_id)
```
> Мигрировано: 180 строк из python_bot.sku_nz + sku_supplier_item.
> nz заполнен, max_stock = NULL (заполнят управляющие).

**`supplier_settings`** — настройки поставщиков по адресу (мигрировано из python_bot)
```
id              INT PK
address_code    VARCHAR   — код адреса A1..A10
supplier_role   VARCHAR   — роль поставщика (post_gdt, post_kms, ...)
supplier_name   VARCHAR   — отображаемое название
delivery_days   VARCHAR   — дни доставки через запятую (0=Пн..6=Вс), напр. "0,2,4"
lead_time_days  INT       — за сколько дней до доставки подать заявку (NULL = не задан)
min_order_sum   FLOAT     — мин. сумма заказа (NULL = без ограничений)
via_rc          TINYINT   — 1 если заказ идёт через РЦ A10 (автозаполнено для post_A10)
UNIQUE (address_code, supplier_role)
```
> Мигрировано: 72 строки из python_bot.sku_suppliers_days + sku_suppliers.
> delivery_days заполнен, lead_time_days и min_order_sum = NULL (заполнят управляющие).

### Прочие таблицы (уже в проекте, используются)

- `hierarchy` — орг. структура
- `addresses` — адреса магазинов (id соответствует address в stock2/ostatki_reg)
- `flags` — флаги доступа пользователей
- `token` — сессионные токены

---

## Таблицы из python_bot (требуют переноса/адаптации)

Эти таблицы существуют в БД `python_bot` на том же сервере. При переносе системы
их нужно либо перенести в `site_db`, либо подключить второй DataSource в TypeORM.

**`sku_nz`** — норматив запаса (НЗ) по адресу и товару
```
address  VARCHAR   — код адреса (A1..A10)
item     INT       — sku_id
value    FLOAT     — НЗ в единицах нашей фасовки
```
> Критически важная таблица. НЗ — это минимальный остаток, ниже которого надо заказывать.
> Должна редактироваться через UI, сейчас правится вручную в БД.

**`sku_supplier_item`** — привязка товара к поставщику по адресу
```
address      VARCHAR
item         INT
supplier_id  VARCHAR   — код поставщика
```

**`sku_suppliers_days`** — дни доставки поставщика на адрес
```
supplier_id      VARCHAR
address          VARCHAR
day              INT     — 0=пн, 1=вт, ..., 6=вс
min_order_sum    FLOAT   — минимальная сумма заказа (0 = без ограничений, напр. A10 Горелово)
lead_time_days   INT     — за сколько дней до доставки нужно подать заказ
```
> lead_time_days: если поставщик требует заказ за 2 дня, а сегодня вторник и
> ближайшая доставка в среду — эта дата пропускается, берётся следующая доступная.
> Алгоритм проверяет: delivery_date - today >= lead_time_days.
> `min_order_sum = 0` означает гарантированную доставку в указанный день независимо от суммы.
> Горелово (A10) имеет `min_order_sum = 0` по всем поставщикам — производство и РЦ,
> поставка фиксированная. Остальные адреса имеют порог, ниже которого заказ переносится
> на следующую дату доставки или консолидируется с соседними адресами.

**`sku_rashod`** — суточный расход ингредиента по адресу
```
address  VARCHAR
item     INT
value    FLOAT   — рассчитывается из продаж × ТТК
```
> Обновляется периодически на основе исторических продаж. В периоды нехватки данных
> используется как fallback-значение.

**`sim_coffe`** / **`sim_dec`** — симуляция остатков по дням
```
date     DATE
type     VARCHAR   — st1..st5
address  VARCHAR
item     INT
value    FLOAT
```

Типы состояний (полная схема):
| Тип | Источник | Хранить в БД | Назначение |
|-----|----------|-------------|-----------|
| st1 | Плановая инвентаризация (форма) | ✅ Да | Ежемесячный сброс к реальности |
| st2 | Ручной ввод вне расписания | ✅ Да | Точечная коррекция (пересчёт, приёмка) |
| st3 | 1С (задержка 1 день) | ✅ Да | Реальное потребление за прошедший день |
| st4 | Расчёт на лету | ⚡ По запросу | Прогноз остатков без новых заказов |
| st5 | Расчёт на лету | ⚡ По запросу | st4 + поданные заказы из orders_table |

> st4/st5 генерируются на лету для UI-графика и предпросмотра.
> Хранить их не нужно — детерминированно вычисляются из st1/st2/st3 + orders_table.
> orders_table (submitted/delivered) уже содержит поданные заказы —
> st5 = st4 + JOIN с orders_table, отдельная таблица не нужна.

> `sku_rashod` — fallback для дней где нет st3. При наличии st3 за N дней:
> sku_rashod обновляется скользящим средним реального потребления из 1С.

> При переносе: объединить sim_coffe + sim_dec в одну таблицу `inventory_simulation`

**`zakup_mes`** — реальные закупки по месяцам
```
address    VARCHAR
timestamp  DATE
artikul    VARCHAR
count      INT
price      FLOAT
```
> Содержит то, что реально купили (в отличие от orders_table — что сгенерировала система).
> Дельта zakup_mes vs orders_table = сигнал для калибровки НЗ.

**`autozakup`** — исторические поставки (используются в симуляции для st4)

---

## Текущий этап и цель

Система находится на этапе **внедрения дисциплины** — не оптимизации.

- Данные закупок (`zakup_mes`) ненадёжны: управляющие дописывают заказы вручную,
  поставщики привозят больше чем в заказе. Данные хаотичны.
- Калибровка через дельту реальных vs сгенерированных заказов **отложена** до тех пор,
  пока работа с персоналом и поставщиками не будет выстроена через систему.
- Цель первой версии: **номинальная корректная работа** — заказы генерируются
  предсказуемо, персонал работает с ними, поставщики получают их в нужном виде.
- Когда данные станут чистыми — калибровка включается без изменения архитектуры.

---

## Принятые проектные решения

### Order-up-to не используется

Метод «заказывать до целевого уровня» (order-up-to) отклонён. Причина: минимальные суммы
заказа (`min_order_sum`) и кратность упаковки поставщика (`order_multiple`) уже вынуждают
заказывать с запасом — естественный буфер существует без явного целевого уровня.
Введение order-up-to создало бы двойную избыточность.

### Молоко — особая категория

Молоко критично по **объёму** (занимает много места) и **частоте** поставок.
В отличие от других ингредиентов, его нельзя накапливать впрок. Требования:
- Высокая частота поставок (ежедневно или через день)
- Низкий НЗ (запас на 1–2 дня, не больше)
- Малая кратность заказа
- `delivery_interval` для молока рассчитывается из расписания без умножения на буфер

В `sku_parameters` для молока: `is_volume_critical = 1` (поле нужно добавить).
В расчётном цикле: если `is_volume_critical`, буфер в пороге не умножается на интервал,
а берётся фиксированным (1–2 дня), переопределяя общую формулу.

---

## Алгоритм формирования заказа

### Фаза 1 — Подготовка данных (одноразовая загрузка)

Перед расчётом загружаются все справочники в память:

```typescript
// Один JOIN-запрос вместо N запросов в цикле
const refData = await queryBuilder
  .from(SkuSupplierItem, 'si')
  .leftJoin(SkuSuppliersDay, 'sd', 'sd.supplier_id = si.supplier_id AND sd.address = si.address')
  .leftJoin(SkuParameters, 'sp', 'sp.sku_id = si.item')
  .leftJoin(SkuNz, 'sn', 'sn.address = si.address AND sn.item = si.item')
  .leftJoin(SkuRashod, 'sr', 'sr.address = si.address AND sr.item = si.item')
  .getMany();

// Строится Map<address, Map<itemId, RefRecord>>
```

Затем одним запросом загружается вся симуляция за период:
```typescript
const simulation = await simRepo.find({
  where: { address: In(addresses), item: In(items), date: Between(start, end), type: 'st4' }
});
// Строится Map<address, Map<itemId, Map<dateStr, value>>>
```

### Фаза 2 — Расчётный цикл (в памяти, без I/O)

Точка отсчёта для каждого item×address — последнее событие из {st1, st2}, что свежее.

```
для каждого item из списка товаров поставщика:
  для каждого address:
    baseline = latest(st1, st2) для этого item×address
    zakaz = 0   ← накопленный виртуальный запас заказов этого прогона

    // Уже поданные заказы — гарантированные поставки, не дублировать
    committed = orders_table.filter(address, item, status IN ['submitted','delivered'])
                            .groupBy(date)  // Map<date, qty>

    для каждого дня от baseline.date до end:
      consumption = st3[address][item][date] ?? sku_rashod[address][item]

      now_value = baseline.value
                - Σ consumption за дни от baseline до date
                + Σ committed[d] для d <= date   // уже поданные заказы
                + zakaz                           // новые заказы этого прогона

      delivery_interval = 7 / deliveries_per_week[supplier][address]
      threshold = НЗ + consumption × delivery_interval

      если now_value < threshold:
        дефицит = threshold - now_value
        z_count = ceil(дефицит / order_multiple) × order_multiple

        // Cutoff: пропускаем даты где уже поздно подавать заказ
        z_date = ближайший_день_доставки_с_учётом_lead_time(
          date,
          delivery_days[supplier][address],
          lead_time_days[supplier][address],
          today
        )

        если z_date найдена:
          result[address][z_date][item] += z_count
          zakaz += z_count / packaging_multiple
        иначе:
          log("Пропущено: слишком поздно для подачи заказа", item, address, date)
```

**st3 как приоритет над sku_rashod:** для дней где пришли данные из 1С используется
реальное потребление. Для будущих дней и дней без данных — sku_rashod.

**Почему `zakaz` нельзя параллелить:** каждый день зависит от предыдущего через `zakaz`.
Итерация по дням строго последовательная.

**Коэффициент `packaging_multiple`:** переводит из единиц нашей фасовки в единицы поставщика.
Например, если мы учитываем кофе в граммах (НЗ=2000г), а поставщик продаёт пачками по 1000г,
то `packaging_multiple=0.001`, `order_multiple=1`.

### Фаза 3 — Запись результата (batch)

```typescript
const rows = [];
for (const [address, dates] of Object.entries(result)) {
  for (const [date, items] of Object.entries(dates)) {
    for (const [itemId, count] of Object.entries(items)) {
      rows.push({ order_id, address, supplier, product_id: itemId, count, date });
    }
  }
}
await ordersRepo
  .createQueryBuilder()
  .insert()
  .into(OrdersTable)
  .values(rows)
  .execute();
// Одна транзакция вместо N individual commits
```

### Расчёт суточного расхода

Суточный расход (`sku_rashod`) рассчитывается отдельной периодической задачей
(не в момент формирования заказа) из исторических продаж через матрицу ТТК:

```
расход_ингредиента_в_день = Σ (продажи_напитка × коэффициент_ТТК) / дней_в_периоде
```

Взвешенное среднее по месяцам: `вес = 1 / log2(месяцев_назад + 3)` — старые данные
имеют меньший вес. Если данных нет — используется значение из `sku_rashod` как есть
(последнее известное).

---

## Реализовано (текущая версия)

### Модуль `src/client_api/auto-orders/` ✅

```
auto-orders/
  auto-orders.module.ts       ✅ зарегистрирован в app.module.ts
  auto-orders.controller.ts   ✅ HTTP endpoints
  auto-orders.service.ts      ✅ бизнес-логика, фильтрация по флагам TM_{hid}
```

### TypeORM entities ✅

- `src/db/auto_orders_address.entity.ts` — AutoOrdersAddress
- `src/db/sku_item_settings.entity.ts` — SkuItemSettings
- `src/db/supplier_settings.entity.ts` — SupplierSettings

### API endpoints (реализованы)

```
GET  /client_api/auto-orders/addresses
  → список адресов (ADMIN — все, TM_{hid} — только свой)

GET  /client_api/auto-orders/items?address=A1
  → sku_item_settings + обогащение из sku_parameters

PUT  /client_api/auto-orders/items?address=A1&sku_id=5
  body: { nz, max_stock, consumption_factor, supplier_role, order_multiple, packaging_multiple }
  → обновить настройки товара

GET  /client_api/auto-orders/suppliers?address=A1
  → supplier_settings для адреса

PUT  /client_api/auto-orders/suppliers?address=A1&supplier_role=post_gdt
  body: { delivery_days, lead_time_days, min_order_sum, via_rc }
  → обновить настройки поставщика
```

### Фронтенд (adminapp) ✅

- `src/services/autoSettingsApi.ts` — API-клиент
- `src/components/AutoOrders/ItemsMatrix/` — товарная матрица (inline-редактирование, слайдер)
- `src/components/AutoOrders/SupplierSettings/` — карточки поставщиков
- `AutoOrderTypeSelector` — добавлена карточка «Поставщики», `itemsMatrix` открыт для TM_AUTOZAKAZI
- `AutoOrdersView` — маршрутизация на новые компоненты

---

## Что планируется реализовать

### Расчётный модуль (следующий этап)

```
auto-orders/
  calculation.service.ts  — алгоритм расчёта заказа
  simulation.service.ts   — управление симуляцией (st1/st4/st5)
  consumption.service.ts  — расчёт суточного расхода из продаж
  calibration.service.ts  — анализ дельты (отложено до выстраивания дисциплины)
```

### Новые сущности БД (следующий этап)

**`sku_rashod`** — суточный расход (обновляется фоновой задачей)
**`inventory_simulation`** — объединённая таблица симуляции (вместо python_bot.sim_coffe + sim_dec)
```
id       INT PK
date     DATE
type     ENUM('st1','st4','st5')
address  VARCHAR   — код адреса A1..A10
sku_id   INT
value    FLOAT
```

**`order_calculation_log`** — снапшот расчёта для аудита и калибровки
```
id            INT PK
order_id      VARCHAR
calculated_at DATETIME
params_json   JSON      — НЗ, расход, диапазон дат на момент расчёта
```

### API endpoints (следующий этап)

```
POST /client_api/auto-orders/calculate
  body: { supplierId, addressList, startDate, endDate }
  → { orderId, rowsGenerated }

GET  /client_api/auto-orders/simulation?address=A1&start=...&end=...
  → прогноз остатков по дням

POST /client_api/auto-orders/simulation/reset
  body: { address, skuId, value, date }

GET  /client_api/auto-orders/calibration?address=A1&months=3
  → дельта generated vs actual (отложено)
```

---

## Критические особенности реализации

### 1. Загружать всё до цикла
Справочники (`sku_nz`, `sku_rashod`, `sku_supplier_item`, `sku_suppliers_days`, `sku_parameters`)
загружаются **один раз** перед расчётом в типизированные Map-структуры. Симуляция тоже
загружается одним запросом за весь период. Никаких запросов к БД внутри расчётного цикла.

### 2. Инвентаризация — не просто ввод данных
Когда пользователь вносит остатки через `/remainders`, это запускает пересчёт st1 и
инвалидацию st4/st5 за прошедший период. Связь: `stock2.address` → `ostatki_reg.address`
→ код адреса A1..A10 для симуляции.

### 3. Дельта как инструмент калибровки (отложено)
`calibration.service.ts` — в архитектуре предусмотрен, но **не активируется** в первой версии.
Причина: `zakup_mes` содержит ненадёжные данные — управляющие дописывают заказы вручную,
поставщики привозят сверх заказа. Дельта не отражает реальность.
Также: артикул `00668` используется и для Lavazza и для Импэшн — JOIN по артикулу даёт дубли.
Калибровка включается после того как работа персонала и поставщиков
начнёт проходить через систему.

### 4. Константы → БД
`ADDRESS_MAP`, `POSTAVSHIK_NAME`, `ADDRESS_IP` в `orders.constants.ts` — это статические
словари, которые дублируют данные из `addresses` и `hierarchy`. При расширении системы
эти данные должны браться из БД, а не из констант. Пока не трогаем, но помнить об этом.

### 5. Fallback при отсутствии данных продаж
Если `prodaji_napitki_mes` не содержит данных за последние N месяцев для адреса:
- Использовать текущее значение `sku_rashod` как есть
- Логировать факт отсутствия данных
- Не падать с ошибкой, продолжать расчёт

### 6. Горелово как РЦ — особая логика

A10 Горелово имеет `min_order_sum = 0`: поставка гарантирована в фиксированный день,
заказ размещается всегда. Это также означает:

- **delivery_interval для A10** = фиксированный (не высчитывать из количества дней в неделю,
  а брать как константу из `sku_suppliers_days`)
- **Минимальная сумма для других адресов**: если суммарная сумма заказа на адрес ниже
  `min_order_sum`, заказ переносится на следующую дату или помечается как требующий
  ручного решения (не отбрасывается автоматически)
- **Консолидация через РЦ**: в перспективе — если поставщик едет в Горелово, мелкие
  заказы соседних адресов могут добавляться в тот же рейс (логистическая оптимизация,
  не реализуется в первой версии)

```typescript
// При расчёте: проверка min_order_sum перед финальной записью
const minSum = supplierSchedule[supplier][address].min_order_sum;
if (minSum > 0) {
  const orderTotal = rows
    .filter(r => r.address === address && r.date === date)
    .reduce((sum, r) => sum + r.count * prices[r.product_id], 0);
  if (orderTotal < minSum) {
    // перенести все строки заказа на следующую дату поставки
    shiftOrderToNextDelivery(rows, address, date, supplierSchedule);
  }
}
```

---

## Связь с существующим кодом

### Что уже есть в NestJS и работает

- `OrdersService` — чтение заказов (`orders_table`), отображение в UI
- `OstatokService` — ввод остатков, `getLastStock`, `getFormsList` (используется в `/remainders`)
- `stock2` entity — хранение остатков инвентаризации
- `ostatki_reg` / `ostatki_fields` entities — формы инвентаризации
- `sku_parameters` entity — справочник товаров
- `AutoOrdersService` — настройки товаров и поставщиков (CRUD), фильтрация по TM-флагам ✅

### Что нужно добавить

- Entities для `sku_rashod`, `inventory_simulation`, `order_calculation_log`
- `calculation.service.ts` — расчётная логика (алгоритм из python_bot)
- `simulation.service.ts` — управление st1/st4/st5
- Связь: после сохранения в `stock2` → тригернуть пересчёт st1 в симуляции

---

## Источник данных

Алгоритм перенесён из Telegram-бота (`udachniy__python_bot_1`):
- `___blocks/u_bot_coffee_orders.py` — основная логика расчёта (CoffeeOrdersTool)
- `___blocks/u_bot_simcoffe.py` — симуляция остатков
- `___blocks/u_bot_local_tables.py` — DataManager (загрузка справочников)
- `___blocks/u_bot_datas.py` — статические словари (consumption_matrix, НЗ)
- `___blocks/u_bot_getorder.py` — запись заказа в БД

БД бота: `python_bot` на `10.182.226.152:3306` (тот же сервер, другая БД).

---

## Находки из анализа реальных данных

### Буфер ×2 вызывает реальные дефициты

Для еженедельных поставщиков (ПРОМИНДУСТРИЯ — среда, Горелово — вторник)
буфер ×2 не покрывает интервал. Данные sim_coffe подтверждают:

| Товар | НЗ дней | Поставщик | st5 min |
|-------|---------|-----------|---------|
| Стакан 400мл | 5.1 | 1×/нед | **-45 рул** ❌ |
| Стакан 250мл | 7.2 | 1×/нед | **-12.6 рул** ❌ |
| Размешиватель | 4.4 | 1×/нед | -1.2 ❌ |
| Сахар | 8.5 | 1×/нед | -3.2 ❌ |
| Молоко | 2.0 | 3×/нед | +35 ✓ |

Молоко работает корректно (частые поставки), расходники — нет.
**Исправление: динамический буфер = `НЗ + расход × delivery_interval_days`**

### НЗ для десертов отсутствует

`sku_nz` пуст для items 1001+. Для ежедневных поставщиков (Пир Горой, Багетная,
Усадьба, Весовые тортики — supplier_id 7-10) это нормально: возят каждый день.
Для **Десерт Фэнтэзи (supplier_id=6, 1 раз в неделю)** — риск дефицита.
При реализации: для десертных позиций с еженедельным поставщиком задать НЗ.

### Реальная частота post_A10 расходится с расписанием

В `sku_suppliers_days`: Горелово везёт всем только по вторникам (day=1).
Реальная частота (по orders_table):
- A1: ~1 раз/нед ✓
- A2, A3: **~3 раза/нед** — расписание не соответствует реальности

Для расчёта `delivery_interval` нельзя слепо брать `7 / deliveries_per_week`
из `sku_suppliers_days` — нужна верификация или ручная корректировка.

### Горелово — двухпроходный расчёт

Сейчас в `orders_table`: строки с `address=''` — это вручную введённые заказы
самого Горелово у внешних поставщиков (GDT, KMS). Заполнялись через Excel
как сумма всех заказов по post_A10.

В NestJS автоматизируется двумя проходами:
```
Pass 1: рассчитать заказы с supplier=post_A10 для A1-A9 → A10_demand[date][sku]
Pass 2: A10 смотрит на A10_demand как на своё потребление
        → рассчитывает что закупить у GDT/KMS/etc = агрегат Pass 1 + потребление производства A10
```
A10 имеет свою отдельную симуляцию запасов.

### Дублирующийся артикул в sku_parameters

Кофе Lavazza (sku_id=0) и Кофе Импэшн (sku_id=30) имеют одинаковый `artikul='00668'`.
JOIN с zakup_mes по артикулу суммирует оба. При миграции: использовать sku_id как ключ,
не артикул.

---

## Инструменты разработки

### sql-proxy (мультибазовый режим)

`sql-proxy` настроен без фиксированной БД по умолчанию. Запросы используют полные имена таблиц.
Прокси-пользователь имеет SELECT на `python_bot.*` и полный доступ к `site_db`.

Эндпоинты для работы с миграцией:
```
GET  /databases                       — список доступных БД
GET  /tables?db=python_bot            — таблицы в python_bot
GET  /tables/:name?db=python_bot      — структура таблицы из python_bot
POST /query   { sql: "SELECT * FROM python_bot.sku_nz LIMIT 5" }
```

**При миграции таблиц** из `python_bot` в `site_db` — сначала смотреть реальные данные:
```sql
-- Проверить структуру и объём перед созданием entity
SELECT * FROM python_bot.sku_nz LIMIT 10;
SELECT COUNT(*) FROM python_bot.sim_coffe;
DESCRIBE python_bot.sku_supplier_item;
```

Затем создать TypeORM entity и перенести данные через INSERT SELECT:
```sql
INSERT INTO site_db.sku_nz SELECT * FROM python_bot.sku_nz;
```
