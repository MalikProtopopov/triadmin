# === Test ===
test-up:
	docker compose -f docker-compose.test.yml --env-file .env.test up -d --build

test-down:
	docker compose -f docker-compose.test.yml --env-file .env.test down

test-logs:
	docker compose -f docker-compose.test.yml --env-file .env.test logs -f admin

test-restart:
	docker compose -f docker-compose.test.yml --env-file .env.test up -d --build --force-recreate admin

# === Prod ===
prod-up:
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build

prod-down:
	docker compose -f docker-compose.prod.yml --env-file .env.prod down

prod-logs:
	docker compose -f docker-compose.prod.yml --env-file .env.prod logs -f admin

prod-restart:
	docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build --force-recreate admin

# === Cleanup ===
clean:
	docker image prune -f
