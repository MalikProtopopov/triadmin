
# Рекомендации по деплою для нейронки

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

**Команды деплоя админки (без остановки клиента):**
```bash
cd /root/troh_admin
git pull
docker stop troh-admin-test 2>/dev/null; docker rm troh-admin-test 2>/dev/null
docker compose -f docker-compose.test.yml --env-file .env.test build --no-cache admin
docker compose -f docker-compose.test.yml --env-file .env.test up -d admin
```

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
3. **Не выполнять `docker system prune -af`** при обычном деплое — это убивает всё. Использовать только по явной просьбе.
4. **Для билда — `--no-cache`:** чтобы собирать с нуля и не тащить старый кеш.
5. **Перед билдом:** убедиться, что код уже обновлён (`git pull` или rsync).

---

### 5. Шаблон промпта для деплоя

Сохрани и используй как шаблон:

```
Деплой [админки | клиентского фронта] на сервер 147.45.146.38.

1. SSH: root@147.45.146.38
2. [Админка: cd /root/troh_admin, git pull] или [Клиент: cd /opt/triclient, git pull]
3. Остановить и удалить только целевой контейнер (troh-admin-test или triclient-frontend-1)
4. Собрать образ без кеша: docker compose -f docker-compose.test.yml --env-file [.env.test | frontend/.env.test] build --no-cache [admin | frontend]
5. Запустить: docker compose ... up -d [admin | frontend]
6. НЕ трогать другой проект.
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