# === Test ===
test-up:
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test up -d --build admin

test-down:
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test down

test-logs:
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test logs -f admin

test-restart:
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test up -d --build --force-recreate admin

test-deploy:
	git pull
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test build admin
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test up -d admin

test-rebuild:
	git pull
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test build --no-cache admin
	docker compose -p troh-admin-test -f docker-compose.test.yml --env-file .env.test up -d admin

# === Prod ===
prod-up:
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod up -d --build admin

prod-down:
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod down

prod-logs:
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod logs -f admin

prod-restart:
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate admin

prod-deploy:
	git pull
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod build admin
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod up -d admin

prod-rebuild:
	git pull
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod build --no-cache admin
	docker compose -p troh-admin-prod -f docker-compose.prod.yml --env-file .env.prod up -d admin

# === Status ===
ps:
	docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

disk:
	docker system df

# === Cleanup ===
clean:
	docker image prune -f
	docker builder prune -f

clean-all:
	docker image prune -af
	docker builder prune -af
	docker volume prune -f
