# Directus CMS Infrastructure

Directus headless CMS configuration for the Eppur Si Muove project.

## Stack

- **Directus**: Headless CMS v10.10.0
- **PostgreSQL**: Database (v16)
- **Redis**: Cache layer (v7)

## Quick Start

1. **Configure environment**:
   ```bash
   cp env.example .env
   # Edit .env and update the security keys and passwords
   ```

2. **Generate security keys**:
   ```bash
   # Generate random keys for DIRECTUS_KEY and DIRECTUS_SECRET
   openssl rand -base64 32
   openssl rand -base64 32
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Access Directus**:
   - Admin UI: http://localhost:8055
   - Login with credentials from `.env` file

5. **Stop services**:
   ```bash
   docker-compose down
   ```

## Services

### Directus (Port 8055)
- Main CMS interface
- GraphQL API endpoint: `/graphql`
- REST API endpoint: `/items/{collection}`

### PostgreSQL (Internal)
- Database storage
- Accessible within Docker network as `postgres:5432`

### Redis (Internal)
- Cache and session storage
- Accessible within Docker network as `redis:6379`

## Data Persistence

Data is persisted in Docker volumes:
- `postgres_data`: Database files
- `redis_data`: Redis data
- `./uploads`: Directus uploaded files
- `./extensions`: Directus custom extensions

## Development

### Connect from API service

The FastAPI service can connect to Directus:

```python
import requests

DIRECTUS_URL = "http://directus:8055"
DIRECTUS_TOKEN = "your-token"

response = requests.get(
    f"{DIRECTUS_URL}/items/your_collection",
    headers={"Authorization": f"Bearer {DIRECTUS_TOKEN}"}
)
```

### Create collections

1. Log into Directus admin UI
2. Navigate to Settings > Data Model
3. Create collections for your exoplanet data

## Security Notes

⚠️ **Important**: Before deploying to production:

1. Change all default passwords
2. Generate new random keys for `DIRECTUS_KEY` and `DIRECTUS_SECRET`
3. Update `DIRECTUS_CORS_ORIGIN` with your production domains
4. Use environment-specific `.env` files
5. Enable HTTPS/SSL
6. Configure proper firewall rules

## Useful Commands

```bash
# View logs
docker-compose logs -f directus

# Restart services
docker-compose restart

# Remove all data (DANGEROUS!)
docker-compose down -v

# Backup database
docker-compose exec postgres pg_dump -U directus directus > backup.sql

# Restore database
docker-compose exec -T postgres psql -U directus directus < backup.sql
```

## Integration with Next.js

From your Next.js app (`apps/web/`), you can use the Directus SDK:

```bash
npm install @directus/sdk
```

```javascript
import { createDirectus, rest } from '@directus/sdk';

const client = createDirectus('http://localhost:8055').with(rest());

// Fetch data
const items = await client.request(
  readItems('your_collection', {
    fields: ['*'],
  })
);
```
