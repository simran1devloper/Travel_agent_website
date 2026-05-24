# JourneyMakers FastAPI Backend

## Run locally

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API seeds a local SQLite database at `backend/data/journeymakers.sqlite3`.

## Development Tokens

- Admin: `dev-admin-token`
- Customer: `dev-customer-token`

Override them with:

```bash
export JOURNEYMAKERS_ADMIN_TOKEN="your-admin-token"
export JOURNEYMAKERS_CUSTOMER_TOKEN="your-customer-token"
```

## Auth0 + RBAC

Set these backend variables:

```bash
export AUTH0_DOMAIN="your-tenant.us.auth0.com"
export AUTH0_AUDIENCE="https://api.journeymakers.local"
export AUTH0_ROLES_CLAIM="https://journeymakers.travel/roles"
```

Create an Auth0 API with the same identifier as `AUTH0_AUDIENCE`, then enable RBAC and "Add Permissions in the Access Token" in the Auth0 API settings.

Suggested API permissions:

- `read:dashboard`
- `manage:admin`
- `manage:packages`
- `manage:destinations`

The FastAPI backend validates bearer access tokens against the Auth0 JWKS URL and checks the `permissions` claim. Admin endpoints accept users with the `admin` role or the `manage:admin` permission. The legacy development headers still work when you send `x-admin-token` or `x-customer-token`.

Frontend Auth0 variables:

```bash
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-spa-client-id
VITE_AUTH0_AUDIENCE=https://api.journeymakers.local
VITE_AUTH0_SCOPE="openid profile email read:dashboard manage:admin manage:packages manage:destinations"
```

In your Auth0 SPA application, add these local URLs:

- Allowed Callback URLs: `http://localhost:5173`
- Allowed Logout URLs: `http://localhost:5173`
- Allowed Web Origins: `http://localhost:5173`

## Main Endpoints

- `POST /inquiries`
- `POST /contacts`
- `GET /packages`
- `POST/PATCH/DELETE /packages`
- `GET /destinations`
- `POST/PATCH/DELETE /destinations`
- `GET /admin/stats`
- `GET /admin/inquiries`
- `PATCH /admin/inquiries/{public_id}`
- `GET /admin/inquiries.csv`
- `POST /admin/import/{packages|destinations}`
- `GET /dashboard`
- `POST /wishlist`
- `DELETE /wishlist/{package_slug}`
- `POST /media`
