
# Рекомендации по деплою для нейронки

## Make-команды (локально и на сервере)

В корне проекта есть `Makefile`. После `git pull` можно использовать:

| Команда | Описание |
|---------|----------|
| `make test-up` | Собрать и запустить админку (test) |
| `make test-down` | Остановить админку (test) |
| `make test-logs` | Логи контейнера (test) |
| `make test-restart` | Пересобрать и перезапустить (test), `--force-recreate` |
| `make test-deploy` | **Быстрый деплой:** `git pull` + build (с кешем) + up |
| `make test-rebuild` | **Полная пересборка:** `git pull` + build `--no-cache` + up |
| `make prod-up` | Собрать и запустить админку (prod) |
| `make prod-down` | Остановить админку (prod) |
| `make prod-logs` | Логи контейнера (prod) |
| `make prod-restart` | Пересобрать и перезапустить (prod) |
| `make prod-deploy` | Быстрый деплой (prod) |
| `make prod-rebuild` | Полная пересборка (prod) |
| `make ps` | Статус контейнеров |
| `make disk` | Использование места Docker |
| `make clean` | Очистить неиспользуемые образы и build cache |
| `make clean-all` | Полная очистка (образы, build cache, volumes) |

**Примечание:** `make clean` и `make clean-all` затрагивают весь Docker на хосте, не только админку. Запускать при необходимости освободить место.

**Порядок деплоя на сервере:**
```bash
ssh root@147.45.146.38
cd /root/troh_admin
make test-down       # остановить текущий проект (опционально)
make clean           # при необходимости освободить место
make test-deploy     # обычный деплой (git pull + build + up)
make ps              # проверить статус
```

Для полной пересборки без кеша:
```bash
cd /root/troh_admin
make test-rebuild    # или make prod-rebuild для prod
```

---

## Кратко, что сообщать

**При обновлении админки:**
> «Задеплой обновления админки. Проект: `/root/troh_admin`. Запуск: `docker-compose.test.yml`, env: `.env.test`, сервис: `admin`. Не трогай клиентский фронт в `/opt/triclient`.»

**При обновлении клиентского фронта:**
> «Задеплой обновления клиентского фронта. Проект: `/opt/triclient`. Запуск: `docker-compose.test.yml`, env: `frontend/.env.test`, сервис: `frontend`. Не трогай админку в `/root/troh_admin`.»

---

## Детальный контекст для нейронки

### 1. Сервер

- **SSH:** `root@147.45.146.38`
- **RAM:** ~2 GB. Одновременно лучше не собирать больше одного проекта.
- **Docker Hub:** Нужен `docker login` (иначе возможен rate limit).

---

### 2. Админка (triadmin)

| Параметр | Значение |
|----------|----------|
| Путь на сервере | `/root/troh_admin` |
| Обновление кода | `git pull` (репозиторий уже настроен) |
| Compose-файл | `docker-compose.test.yml` |
| Env-файл | `.env.test` |
| Имя сервиса | `admin` |
| Имя контейнера | `troh-admin-test` |
| Порт | 3100 |

**Порядок деплоя:**
```bash
cd /root/troh_admin
make test-down        # остановить (при необходимости)
make clean            # при необходимости — очистить Docker
make test-deploy      # git pull + build + up
make ps               # проверить статус
```

Полная пересборка без кеша (если make test-deploy не помогает):
```bash
make test-rebuild     # git pull + build --no-cache + up
```

**Для prod:** `make prod-deploy` или `make prod-rebuild`.

---

### 3. Клиентский фронт (triclient)

| Параметр | Значение |
|----------|----------|
| Путь на сервере | `/opt/triclient` |
| Обновление кода | `git pull` или rsync — зависит от структуры |
| Compose-файл | `docker-compose.test.yml` |
| Env-файл | `frontend/.env.test` |
| Имя сервиса | `frontend` |
| Имя контейнера | `triclient-frontend-1` |
| Порт | 3000 |

**Команды деплоя клиентского фронта (без остановки админки):**
```bash
cd /opt/triclient
git pull   # или синхронизация через rsync
docker stop triclient-frontend-1 2>/dev/null; docker rm triclient-frontend-1 2>/dev/null
docker compose -f docker-compose.test.yml --env-file frontend/.env.test build --no-cache frontend
docker compose -f docker-compose.test.yml --env-file frontend/.env.test up -d frontend
```

---

### 4. Жёсткие правила для нейронки

1. **Не запускать одновременно:** билд админки и билд клиента — по одному.
2. **Не трогать чужой проект:** при деплое админки — не трогать `/opt/triclient`, при деплое клиента — не трогать `/root/troh_admin`.
2a. **Очистка общая:** `make clean` и `make clean-all` затрагивают весь Docker на хосте, а не только админку. Можно запускать из любой директории.
3. **Не выполнять `docker system prune -af`** при обычном деплое — это убивает всё. Использовать только по явной просьбе.
4. **Для билда — `--no-cache`:** чтобы собирать с нуля и не тащить старый кеш.
5. **Перед билдом:** убедиться, что код уже обновлён (`git pull` или rsync).

---

### 5. Шаблон промпта для деплоя

Сохрани и используй как шаблон:

```
Деплой [админки | клиентского фронта] на сервер 147.45.146.38.

1. SSH: root@147.45.146.38
2. Админка: cd /root/troh_admin && make test-deploy (или make prod-deploy)
3. Клиент: cd /opt/triclient && git pull && [manual docker compose — нет make в triclient]
4. НЕ трогать другой проект.
```

---

### 6. Если нужна полная пересборка всего

Только если нужно всё сбросить и поднять заново:

```bash
docker stop $(docker ps -aq) 2>/dev/null
docker rm $(docker ps -aq) 2>/dev/null
docker system prune -af --volumes

# Сначала админка (меньше)
cd /root/troh_admin && docker compose -f docker-compose.test.yml --env-file .env.test build --no-cache admin && docker compose -f docker-compose.test.yml --env-file .env.test up -d admin

# Потом клиент
cd /opt/triclient && docker compose -f docker-compose.test.yml --env-file frontend/.env.test build --no-cache frontend && docker compose -f docker-compose.test.yml --env-file frontend/.env.test up -d frontend
```

Можешь положить это в `docs/DEPLOY_RULES.md` или `.cursor/rules` и использовать при каждом деплое.