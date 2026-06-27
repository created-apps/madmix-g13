# MadMix Insights Backend Deployment & Dev Guide

This directory houses the backend planning files, schema definition, and migration instructions for the **MadMix Insights** platform.

---

## 🚀 Running Local Development

### 1. Prerequisiutes
Ensure you have Python 3.10+ and the Supabase CLI installed.

### 2. Configure Environment Variables
Create a `.env` file inside this directory:
```env
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
ANTHROPIC_API_KEY="sk-ant-your-claude-api-key"
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Create and Migrate Database
Set up tables inside your Supabase SQL editor:
```bash
# Apply schema from schema.sql to your Supabase Postgres Database
psql -h db.your-project.supabase.co -U postgres -d postgres -f schema.sql
```

### 5. Execute Data Cleaning & Normalization Script
Load and clean your Excel/CSV metrics:
```bash
python scripts/clean_load.py
```

### 6. Spin Up FastAPI Server
```bash
uvicorn app.main:app --reload --port 8000
```
Open [http://localhost:8000/docs](http://localhost:8000/docs) to access Swagger/OpenAPI documentation.

---

## ☁️ Deploying onto Render (Production)

Follow these steps to host your Python FastAPI server on **Render**:

1.  **Create a Web Service:**
    *   Connect your GitHub/GitLab repository.
    *   Select `Python` as the runtime environment.
2.  **Define Build and Start Scripts:**
    *   **Build Command:** `pip install -r backend/requirements.txt`
    *   **Start Command:** `uvicorn backend.app.main:app --host 0.0.0.0 --port 10000`
3.  **Inject Secrets:**
    *   Add the environment variables in your Render project panel (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ANTHROPIC_API_KEY`).
4.  **Health Check Endpoint:**
    *   Configure Render to check `/api/health` to verify zero-downtime rolling upgrades.
