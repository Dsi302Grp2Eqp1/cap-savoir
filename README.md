# cap-savoir
Online Learning Platform

## Live URLs
- Frontend (GitHub Pages): https://dsi302grp2eqp1.github.io/cap-savoir/
- Backend API (Azure App Service): https://app-capsavoir-dev-f6gefyazfjdzfzch.italynorth-01.azurewebsites.net
  (health check: `/health`)

## Structure
| Folder | Stack |
|---|---|
| `codeBack/backend` | Node 24, Express, Mongoose, Azure Cosmos DB (MongoDB API) |
| `codeFront/frontend` | Angular 22 |

## CI/CD
Merging into `main` deploys automatically:
- changes in `codeBack/backend` → `.github/workflows/backend.yml` → Azure App Service
- changes in `codeFront/frontend` → `.github/workflows/frontend.yml` → GitHub Pages

## Run locally
```bash
# backend
cd codeBack/backend
cp .env.example .env   # then fill in MONGODB_URI
npm install
npm run dev            # http://localhost:3000/health

# frontend
cd codeFront/frontend
npm install
npm start              # http://localhost:4200
```

## Rules for contributors
- Backend: read the port from `process.env.PORT`; runtime packages go in `dependencies`, not `devDependencies`; keep `/health` working.
- Backend: declare `unique: true` and sort-field indexes in Mongoose schemas from the start (Cosmos requires it).
- Frontend: call the API only through `ApiService` / `environment.apiUrl`. Never hardcode `localhost`.
- Never commit `.env`. Always commit `package-lock.json`.
