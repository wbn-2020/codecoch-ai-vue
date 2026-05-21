# Production API Configuration

The frontend reads the backend base URL from `VITE_API_BASE_URL`.

## Development

`.env.development` currently points directly to the local gateway:

```env
VITE_API_BASE_URL=http://localhost:8080
```

`vite.config.ts` also provides a `/api` dev proxy. If `VITE_API_BASE_URL=/api` is used locally, the proxy target is resolved from `VITE_DEV_PROXY_TARGET`, `VITE_API_PROXY_TARGET`, `VITE_GATEWAY_URL`, or `http://localhost:8080`.

## Production

`.env.production` defaults to:

```env
VITE_API_BASE_URL=/api
```

This expects the production web server or ingress to reverse proxy `/api` to the backend gateway. For deployments that call a backend domain directly, build with an explicit value:

```powershell
$env:VITE_API_BASE_URL="https://api.example.com"; npm run build
```

Keep `VITE_API_BASE_URL` aligned with the gateway path that serves the CodeCoachAI backend APIs.
