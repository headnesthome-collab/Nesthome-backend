# Nesthome Backend API

Backend API server for Nesthome website.

## 🚀 Quick Start

### Development

```bash
npm install
npm run dev
```

Server will start on `http://localhost:5000`

### Production Build

```bash
npm run build
npm start
```

## 📋 Environment Variables

Create a `.env` file:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# Admin Authentication
ADMIN_PASSWORD=your_secure_password

# CORS - Add your frontend URL(s)
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app

# Email Configuration (Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Nesthome
RESEND_TO_EMAIL=your-email@gmail.com

# Google Sheets (if using)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Admin
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `POST /api/admin/change-password` - Change admin password (requires auth)
- `GET /api/admin/verify` - Verify session (requires auth)

### Leads
- `POST /api/leads` - Create new lead
- `POST /api/sync-all-leads` - Sync all leads to Google Sheets
- `GET /api/spreadsheet-url` - Get Google Sheets URL

### Contact
- `POST /api/contact` - Send contact form message

## 🚢 Deployment

See deployment guides:
- Render: `render.yaml` is configured
- Railway: Update `nixpacks.toml` if needed

## 📝 Notes

- This is an API-only server
- Frontend is deployed separately
- CORS is configured for your frontend domain
# Nesthome-backend
