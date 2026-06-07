# GitHub Upload Checklist

## Before Upload

- Create a new GitHub repository.
- Copy `.env.example` to `.env` locally and fill real values.
- Do not commit `.env`, tokens, database files, logs, virtual environments, or build output.
- Make sure `.gitignore` is present at the project root.
- Run frontend checks before pushing:

```powershell
cd frontend
npm.cmd run lint
npm.cmd run build
```

## Upload These

| Path | Upload? | Short commit comment |
| --- | --- | --- |
| `README.md` | Yes | `Add project docs` |
| `GITHUB_UPLOAD_TODO.md` | Yes | `Add upload checklist` |
| `.gitignore` | Yes | `Ignore generated files` |
| `.env.example` | Yes | `Document env config` |
| `docker-compose.yml` | Yes | `Configure service stack` |
| `project_architecture.md` | Yes | `Document system design` |
| `backend/` | Yes | `Add FastAPI backend` |
| `backend/.dockerignore` | Yes | `Ignore backend build noise` |
| `frontend/` | Yes | `Add React dashboard` |
| `frontend/.env.example` | Yes | `Document frontend env` |
| `mosquitto/config/` | Yes | `Add MQTT config` |
| `mosquitto/docker-compose.yml` | Optional | `Add broker compose` |
| `scratch/` | Yes | `Add demo data tools` |
| `spring_backend/` | Yes | `Add Spring backend` |

## Do Not Upload These

| Path | Reason |
| --- | --- |
| `.env` | Contains real secrets |
| `backend/.venv/` | Local Python dependencies |
| `backend/__pycache__/` | Generated Python cache |
| `backend/smart_container.db` | Local database file |
| `frontend/node_modules/` | Installed dependencies |
| `frontend/dist/` | Generated build output |
| `spring_backend/target/` | Generated Java build output |
| `mosquitto/data/` | Runtime broker database |
| `mosquitto/log/` | Runtime logs |
| `*.log` | Runtime logs |

## Suggested Commit Order

1. `Add project docs`
2. `Ignore generated files`
3. `Configure env templates`
4. `Add backend services`
5. `Add React dashboard`
6. `Add Spring backend`
7. `Add MQTT config`
8. `Add demo tools`

## Git Commands

From the project root:

```powershell
git init
git add .gitignore .env.example README.md GITHUB_UPLOAD_TODO.md project_architecture.md docker-compose.yml
git commit -m "Add project docs"
```

Then add the main folders:

```powershell
git add backend frontend spring_backend mosquitto/config mosquitto/docker-compose.yml scratch
git commit -m "Add app services"
```

Connect GitHub:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## Final Safety Check

Before pushing, check staged files:

```powershell
git status --short
git diff --cached --name-only
```

Check that ignored files are not staged:

```powershell
git status --ignored --short
```

