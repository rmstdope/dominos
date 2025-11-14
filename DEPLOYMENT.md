# Deployment Guide - Render.com

This guide walks you through deploying the Dominos Pizza Ordering application to Render.com.

## Prerequisites

- GitHub account with access to the repository
- Render.com account (free tier is sufficient to start)

## Deployment Options

You have two options for deploying to Render:

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
   - Render will show 2 services:
     - `dominos-backend` (Web Service with Docker)
     - `dominos-frontend` (Static Site)
   
4. **Set Environment Variables**
   - The backend's `JWT_SECRET` will be auto-generated
   - The frontend's `VITE_API_URL` will automatically reference the backend
   
5. **Deploy**
   - Click "Apply" to create both services
   - Wait for deployment to complete (5-10 minutes)

6. **Initialize Database**
   - Once backend is deployed, open the backend service shell
   - Run: `npm run seed` to populate initial data

### Option 2: Manual Setup

If you prefer more control or the blueprint doesn't work:

#### Step 1: Deploy Backend

1. **Create Web Service**
   - Dashboard → "New" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     ```
     Name: dominos-backend
     Region: Oregon (US West) or closest to your users
     Branch: main
     Root Directory: backend
     Environment: Docker
     ```

2. **Environment Variables**
   ```
   NODE_ENV=production
   PORT=3000
   DATABASE_PATH=/app/data/database.sqlite
   JWT_SECRET=<click "Generate" for a secure random value>
   ```

3. **Add Persistent Disk**
   - Scroll to "Disk" section
   - Click "Add Disk"
   ```
   Name: dominos-db
   Mount Path: /app/data
   Size: 1 GB
   ```

4. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note the service URL (e.g., `https://dominos-backend.onrender.com`)

5. **Initialize Database**
   - In the service page, go to "Shell" tab
   - Run: `npm run seed`

#### Step 2: Deploy Frontend

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

- **Backend**: Spins down after 15 minutes of inactivity
- **Cold Start**: First request after spin-down takes 30-60 seconds
- **Database**: Limited to disk size (1GB on free tier)
- **Solution**: Upgrade to paid tier for always-on service

### Database Backups

Your SQLite database is stored on the persistent disk. To backup:

1. Download via Shell:
   ```bash
   cd /app/data
   ls -la
   ```

2. Or upgrade to Postgres for automated backups (render.yaml can be updated)

### CORS Configuration

The backend is configured to accept requests from any origin in development. For production, update `backend/src/server.ts`:

```typescript
app.use(cors({
  origin: 'https://your-frontend-domain.onrender.com',
  credentials: true
}));
```

### Environment Variables

- **Development**: Uses `.env.development` (localhost:3000)
- **Production**: Uses Render environment variables
- **Never commit** `.env` files with secrets to git

## Troubleshooting

### Backend won't start
- Check logs for errors
- Verify all environment variables are set
- Ensure disk is mounted at `/app/data`

### Frontend shows connection errors
- Verify `VITE_API_URL` points to correct backend URL
- Check backend is running and healthy
- Verify CORS settings

### Database errors
- Ensure persistent disk is attached
- Check disk has write permissions
- Run seed script to initialize

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
- Backend: 750 hours/month (sufficient for 1 service)
- Frontend: Unlimited bandwidth (100GB/month)
- Disk: 1GB persistent storage

### Upgrade Considerations
- **Starter ($7/month)**: Always-on, no cold starts
- **More Disk**: If you need >1GB for database
- **Postgres**: For better database performance and backups

## Security Recommendations

1. **Change Default Passwords**: Update all default admin passwords
2. **JWT Secret**: Use strong, random value (auto-generated is good)
3. **Environment Variables**: Never hardcode secrets
4. **CORS**: Restrict to your frontend domain in production
5. **HTTPS**: Render provides free SSL/TLS certificates

## Support

- **Render Docs**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Repository Issues**: Create issue in GitHub repo

## Next Steps

After successful deployment:
1. Set up custom domain (optional)
2. Configure email notifications (future feature)
3. Set up monitoring/alerting
4. Plan for database migrations
5. Consider Postgres upgrade for production use
