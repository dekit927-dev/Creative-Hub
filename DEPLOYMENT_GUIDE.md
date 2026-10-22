# Deploying Creative Hub (Neon & Render)
Deployment guide following the **Lab 10: Deploying Campus Eats** structure.

---

## Architecture Summary

| Service | What it does for Creative Hub | Where it is set up |
| :--- | :--- | :--- |
| **GitHub** | Stores the code; Render reads and builds from it | Repository `Creative-Hub`, branch `main` |
| **Neon** | Cloud PostgreSQL (users, creations, likes, comments, shares, challenges, messages, admin) | [neon.tech](https://neon.tech), database `neondb` |
| **Render** | Builds the Docker image and runs the Web Service | [render.com](https://render.com), Web Service (Docker runtime, Free plan) |

> **Note regarding MongoDB:** Unlike Campus Eats (which used Mongo Atlas for a feedback collection), **Creative Hub stores all data in PostgreSQL** (including comments, direct messages, challenge submissions, collaboration requests, and moderation reports). Therefore, **MongoDB Atlas is not required for Creative Hub**.

---

## Part A: Application URL (`APP_URL`)

The application supports `process.env.APP_URL` for external links and sharing:
* **Locally**: `.env` uses `http://localhost:3000` (or dynamic browser origin `window.location.origin`).
* **On Render**: Set `APP_URL` to your assigned live Render URL (e.g. `https://creative-hub-xxxx.onrender.com`) after your first deployment.

---

## Part B: Neon (Cloud PostgreSQL Setup)

1. Sign up or log in at **[neon.tech](https://neon.tech)**.
2. Click **Create Project** (Name: `creative-hub`). Neon automatically creates a database called `neondb` with role `neondb_owner`.
3. Under **Dashboard > Connection Details**, copy the connection string:
   ```text
   postgresql://neondb_owner:PASSWORD@ep-xyz-pooler.c-6.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
4. Extract the connection parameters into the environment variables that `config/db.js` expects:

| Connection String Part | Example Value | Env Variable |
| :--- | :--- | :--- |
| Username (before the first colon) | `neondb_owner` | `DB_USER` |
| Password (between colon and `@`) | `<your-neon-password>` | `DB_PASS` |
| Host (after `@` up to `/`) | `ep-xyz-pooler.c-6.us-east-2.aws.neon.tech` | `DB_HOST` |
| Database name (after the final `/`) | `neondb` | `DB_NAME` |
| Port | `5432` | `DB_PORT` |
| Enable SSL | `true` | `DB_SSL` |

> **SSL Setting**: `config/db.js` automatically enables `{ ssl: { rejectUnauthorized: false } }` when `DB_SSL=true`, which Neon requires.
>
> **Fallback**: If the connection pooler host (`-pooler`) times out, simply remove `-pooler` from `DB_HOST` to use Neon's direct connection.

5. **Initialize Schema**:
   * Open the **SQL Editor** tab in the Neon dashboard.
   * Copy the complete contents of [`models/schema.sql`](./models/schema.sql).
   * Paste into the SQL Editor and click **Run**.
   * *(Note: `app.js` also automatically runs table creation and initial seed data on startup if the tables are empty).*

---

## Part C: Dockerfile & .dockerignore

Both files are located in the project root:

### `Dockerfile`
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

### `.dockerignore`
```text
node_modules
.env
.env.test
.git
coverage
```
> Keeps `.env` secrets and local `node_modules` out of the Docker image.

---

## Part D: Push to GitHub

1. If you haven't created a GitHub repository yet, go to [github.com/new](https://github.com/new) and create a repository named **`Creative-Hub`**.
2. Link your local project and push:
   ```bash
   git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/Creative-Hub.git
   git push -u origin main
   ```
3. Verify on GitHub that `Dockerfile` and `.dockerignore` are present and that `.env` is **not** pushed.

---

## Part E: Deploy to Render

1. Log in to **[render.com](https://render.com)** using your GitHub account.
2. Click **New +** > **Web Service**.
3. Select **Build and deploy from a Git repository**, and choose your `Creative-Hub` repository.
4. Configure the Web Service:
   * **Name**: `creative-hub` (or `creativehub-sherubtse`)
   * **Region**: Select Singapore or Frankfurt (closest to Bhutan)
   * **Branch**: `main`
   * **Runtime**: **Docker** (Render detects the Dockerfile automatically)
   * **Instance Type**: **Free**
5. Under **Environment Variables**, add:

| Key | Value | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Application port |
| `NODE_ENV` | `production` | Production environment |
| `DB_HOST` | `ep-xyz-pooler.c-6.us-east-2.aws.neon.tech` | Your Neon Host |
| `DB_PORT` | `5432` | PostgreSQL Port |
| `DB_NAME` | `neondb` | Neon database name |
| `DB_USER` | `neondb_owner` | Neon database user |
| `DB_PASS` | `<your-neon-password>` | Neon database password |
| `DB_SSL` | `true` | **Crucial** for Neon cloud connection |
| `SESSION_SECRET` | `creativehub_super_secret_production_key_2026` | Random secret text |

6. Click **Create Web Service**.
7. Go to the **Logs** tab and watch the deployment:
   * The Docker build executes `npm install --omit=dev`.
   * The server starts with `CreativeHub running at http://localhost:3000`.
   * Status will switch to **Live**.
8. Copy your live URL (e.g. `https://creative-hub-xxxx.onrender.com`).
9. Go to the **Environment** tab on Render, add:
   * `APP_URL` = `https://creative-hub-xxxx.onrender.com`
   * Click **Save Changes** (Render will redeploy with the live URL).

---

## Part F: Post-Deployment Verification

| Check | Expected Result |
| :--- | :--- |
| **Live URL load** | Opens landing page with Sherubtse clock tower hero banner and dark navbar |
| **User Sign Up** | Creates a new student creator account in Neon `users` table |
| **Admin Login** | Log in with username `admin` and password `password123` |
| **Admin Dashboard** | Overview statistics, creator rankings, and moderation reports render |
| **Create Creative Work** | Upload image + title + category; appears immediately in Creative Feed |
| **Theme Switcher** | Open Settings; switch between Light Mode, Dark Mode, and System Auto |
| **Scroll Reveal** | Scroll down the homepage; cards smoothly float upwards into view |

---

## Part G: Troubleshooting Common Issues

* **`Database connection error: no pg_hba.conf entry for host ... no encryption`**:
  * **Fix**: Ensure `DB_SSL=true` is set in Render Environment Variables.
* **Connection timeout with `-pooler`**:
  * **Fix**: In Render, change `DB_HOST` to remove `-pooler` (e.g. `ep-xyz.c-6.us-east-2.aws.neon.tech`).
* **First load takes ~50 seconds**:
  * **Normal**: Render Free tier spins down web services after 15 minutes of inactivity; Neon compute also pauses when idle. The first request wakes both services up.
