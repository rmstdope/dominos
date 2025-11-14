# Deployment Guide - Render.com

This guide walks you through deploying the Dominos Pizza Ordering application to Render.com using the **free tier**.

## Prerequisites

- GitHub account with access to the repository
- Render.com account (free tier is sufficient)

## Important: Free Tier Configuration

The application uses **PostgreSQL** (not SQLite) on Render's free tier because:
- ✅ Free PostgreSQL database available (90 days, then expires)
- ❌ Persistent disks NOT available on free tier
- ✅ Backend auto-detects PostgreSQL via `DATABASE_URL` environment variable
- ✅ Local development still uses SQLite

## Deployment Options

### Option 1: Blueprint (Recommended - Automated)

Using the `render.yaml` blueprint file in the repository root:

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Click "New" → "Blueprint"

2. **Connect Repository**
   - Connect your GitHub account if not already connected
   - Select the `dominos` repository
   - Render will automatically detect the `render.yaml` file

3. **Configure Services**
   - Render will show 3 services:
     - `dominos-db` (PostgreSQL Database - Free for 90 days)
     - `dominos-backend` (Web Service with Docker - Free)
     - `dominos-frontend` (Static Site - Free)

4. **Review Configuration**
   - The backend's `JWT_SECRET` will be auto-generated
   - The `DATABASE_URL` will automatically link to PostgreSQL
   - The frontend's `VITE_API_URL` will automatically reference the backend

5. **Deploy**
   - Click "Apply" to create all services
   - Wait for deployment to complete (5-10 minutes)
   - PostgreSQL will be created first, then backend, then frontend

6. **Initialize Database**
   - Once backend is deployed, open the backend service shell
   - Run: `npm run seed` to populate initial data

### Option 2: Manual Setup

If you prefer more control or the blueprint doesn't work:

#### Step 1: Create PostgreSQL Database

1. **Create PostgreSQL Service**
   - Dashboard → "New" → "PostgreSQL"
   - Configure:
     ```
     Name: dominos-db
     Database: dominos
     User: dominos
     Region: Oregon (US West) or closest to your users
     Plan: Free
     ```

2. **Note the Connection Details**
   - After creation, you'll see "Internal Database URL"
   - Copy this URL - you'll need it for the backend

#### Step 2: Deploy Backend

1. **Create Web Service**
   - Dashboard → "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     ```
     Name: dominos-backend
     Region: Same as database
     Branch: main
     Root Directory: backend
     Environment: Docker
     Plan: Free
     ```

2. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=<paste the PostgreSQL Internal Database URL>
   JWT_SECRET=<click "Generate" for a secure random value>
   ```

3. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note the service URL (e.g., `https://dominos-backend.onrender.com`)

4. **Initialize Database**
   - In the service page, go to "Shell" tab
   - Run: `npm run seed`

#### Step 3: Deploy Frontend

1. **Create Static Site**

   - Dashboard → "New" → "Static Site"
   - Connect same GitHub repository
   - Configure:
     ```
     Name: dominos-frontend
     Region: Same as backend
     Branch: main
     Root Directory: frontend
     Build Command: npm install && npm run build
     Publish Directory: dist
     ```

2. **Environment Variables**

   ```
   VITE_API_URL=<your-backend-url-from-step-1>
   ```

   Example: `https://dominos-backend.onrender.com`

3. **Add Rewrite Rule**

   - Scroll to "Redirects/Rewrites"
   - Click "Add Rule"

   ```
   Source: /*
   Destination: /index.html
   Action: Rewrite
   ```

   This enables client-side routing with React Router.

4. **Deploy**
   - Click "Create Static Site"
   - Wait for deployment (3-5 minutes)

## Post-Deployment

### 1. Create Admin User

Connect to your backend service shell and run:

```bash
# This will be added to seed script or run manually
node -e "require('./dist/database/seed').createAdminUser('admin@example.com', 'your-password', 'admin')"
```

Or update the seed script to include your admin user.

### 2. Test the Application

1. Visit your frontend URL (e.g., `https://dominos-frontend.onrender.com`)
2. Log in with your admin credentials
3. Verify you can:
   - Create events
   - Manage ingredients
   - View orders
   - Delete orders

### 3. Monitor Services

- **Backend Logs**: Service → "Logs" tab
- **Frontend Logs**: Service → "Logs" tab
- **Health**: Backend has `/health` endpoint
- **Metrics**: Available in service dashboard

## Important Notes

### Free Tier Limitations

- **Backend Web Service**: Spins down after 15 minutes of inactivity (750 hours/month)
- **Cold Start**: First request after spin-down takes 30-60 seconds
- **PostgreSQL Database**: Free for 90 days, then requires paid plan ($7/month)
- **Database Size**: 1GB storage on free PostgreSQL
- **Monthly Reset**: Free tier resets monthly, may experience downtime at month end

**Important**: After 90 days, you'll need to either:
1. Upgrade to paid PostgreSQL plan ($7/month)
2. Create a new free database (loses all data)
3. Export data and migrate to another hosting solution

### Database Backups

**PostgreSQL database is NOT automatically backed up on free tier.**

To backup manually:

1. **Using Render Shell**:
   ```bash
   # In backend service shell
   pg_dump $DATABASE_URL > backup.sql
   ```

2. **Download backup**:
   - Use Render's shell to view the file
   - Or use external tools like `pg_dump` with the connection string

3. **Automated backups**: Available on paid PostgreSQL plans ($7/month+)

### CORS Configuration

The backend is configured to accept requests from any origin in development. For production, update `backend/src/server.ts`:

```typescript
app.use(
  cors({
    origin: "https://your-frontend-domain.onrender.com",
    credentials: true,
  })
### Environment Variables

- **Development**: Uses `.env.development` with SQLite (localhost:3000)
- **Production**: Uses Render environment variables with PostgreSQL
- **Database**: Auto-detects PostgreSQL via `DATABASE_URL`, falls back to SQLite
- **Never commit** `.env` files with secrets to git

## Troubleshooting

### Backend won't start
- Check logs for errors
- Verify all environment variables are set (`DATABASE_URL`, `JWT_SECRET`)
- Ensure PostgreSQL database is running
- Check database connection string is correct

### Database connection errors
- Verify `DATABASE_URL` is set correctly
- Check PostgreSQL service is running
- Ensure backend and database are in same region (faster connection)
- Wait a minute after database creation before deploying backend

### Frontend shows connection errors
- Verify `VITE_API_URL` points to correct backend URL
- Check backend is running and healthy
- Verify CORS settings
- Test backend health endpoint directly: `https://your-backend.onrender.com/health`

### Login doesn't work

- Verify `JWT_SECRET` is set and consistent
- Check cookies are being set (credentials: 'include')
- Ensure backend and frontend domains match cookie settings

## Updating Deployment

### Method 1: Auto-deploy from Git

- Push to `main` branch
- Render automatically rebuilds and deploys

### Method 2: Manual Deploy

- Service → "Manual Deploy" → "Deploy latest commit"

### Method 3: Redeploy

- Service → "Manual Deploy" → "Clear build cache & deploy"

## Cost Optimization

### Free Tier Usage
- **Backend Web Service**: 750 hours/month (one service always-on OR multiple services with downtime)
- **Frontend Static Site**: Unlimited (100GB bandwidth/month)
- **PostgreSQL Database**: Free for 90 days, then $7/month

### After Free Trial (90 days)
You have several options:
1. **Upgrade to Starter PostgreSQL** ($7/month) - Keep all data
2. **Create new free database** - Start fresh, lose all data
3. **Migrate to SQLite with paid disk** ($1/GB/month) - Requires code changes
4. **Move to another platform** - Export data first

### Upgrade Considerations
- **Starter Web Service ($7/month)**: Always-on, no cold starts, better performance
- **Starter PostgreSQL ($7/month)**: After free trial, includes automated backups
- **Professional ($19/month)**: More resources, better for production

### Cost-Effective Options
1. **Use free tier for 90 days** - Perfect for testing and demos
2. **Upgrade backend only** ($7/month) - Keep database cold-start, upgrade web service
3. **Full production** ($14/month) - Always-on backend + PostgreSQL with backups

## Security Recommendations

1. **Change Default Passwords**: Update all default admin passwords immediately
2. **JWT Secret**: Use strong, random value (auto-generated is secure)
3. **Environment Variables**: Never hardcode secrets in code
4. **CORS**: Restrict to your frontend domain in production
5. **HTTPS**: Render provides free SSL/TLS certificates (automatic)
6. **Database**: PostgreSQL connection uses SSL by default
7. **Regular Backups**: Export database regularly (especially on free tier)

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **PostgreSQL Docs**: https://render.com/docs/databases
- **Repository Issues**: Create issue in GitHub repo

## Next Steps

After successful deployment:

1. Set up custom domain (optional)
2. Configure email notifications (future feature)
3. Set up monitoring/alerting
4. Plan for database migrations
5. Consider Postgres upgrade for production use
