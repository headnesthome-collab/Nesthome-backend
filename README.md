# Nesthome Backend API

Production-ready backend API server for Nesthome website and admin

## 🚀 Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **Build Tool:** esbuild
- **Validation:** Zod
- **Email:** Resend
- **Database:** Firebase Realtime Database
- **Sheets:** Google Sheets API
- **Authentication:** Passport.js (local strategy)

## 📋 Prerequisites

- Node.js 20+ 
- npm 10+

## 🛠️ Development

### Install Dependencies

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Server will start on `http://localhost:5000`

### Build for Production

```bash
npm run build
```

This creates `dist/index.js` with compiled code.

### Start Production Server

```bash
npm start
```

## 📝 Environment Variables

Create a `.env` file in the root directory:

```bash
# Server Configuration
NODE_ENV=development
PORT=5000

# Admin Authentication (REQUIRED)
ADMIN_PASSWORD=your_secure_password_here

# CORS Configuration (REQUIRED for production)
ALLOWED_ORIGINS=http://localhost:5173,https://your-frontend.vercel.app

# Email Configuration (Optional - Resend)
RESEND_API_KEY=re_your_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
RESEND_FROM_NAME=Nesthome
RESEND_TO_EMAIL=your-email@gmail.com

# Google Sheets Integration (Optional)
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour key\n-----END PRIVATE KEY-----\n"
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id
```

## 📡 API Endpoints

### Health Check
- `GET /api/health` - Server health check

### Admin Authentication
- `POST /api/admin/login` - Admin login
- `POST /api/admin/logout` - Admin logout
- `POST /api/admin/change-password` - Change admin password (requires auth)
- `GET /api/admin/verify` - Verify session (requires auth)

### Leads Management
- `POST /api/leads` - Create new lead
- `POST /api/sync-all-leads` - Sync all leads to Google Sheets
- `GET /api/spreadsheet-url` - Get Google Sheets URL

### Contact
- `POST /api/contact` - Send contact form message

## 🏗️ Project Structure

```
nesthome-backend/
├── server/
│   ├── index.ts          # Main server entry point
│   ├── routes.ts         # API route definitions
│   ├── auth.ts           # Authentication logic
│   ├── storage.ts         # Data storage interface
│   ├── email-notifications.ts  # Email sending
│   ├── google-sheets.ts  # Google Sheets integration
│   └── log.ts            # Logging utility
├── shared/
│   └── schema.ts         # Shared TypeScript schemas
├── dist/                 # Build output (generated)
├── package.json
├── tsconfig.json
├── render.yaml           # Render deployment config
└── nixpacks.toml         # Nixpacks build config
```

## 🚢 Deployment

### Render (Recommended)

1. Push code to GitHub
2. Connect repository to Render
3. Set environment variables in Render dashboard
4. Deploy!

The `render.yaml` file is pre-configured.

### Build Process

1. `npm ci` - Install dependencies
2. `npm run build` - Compile TypeScript to JavaScript
3. `npm start` - Run production server

## 🔒 Security

- Password hashing using PBKDF2
- Session-based authentication
- CORS protection
- Security headers (X-Frame-Options, etc.)
- Input validation with Zod

## 📦 Dependencies

### Production Dependencies
- `express` - Web framework
- `express-session` - Session management
- `zod` - Schema validation
- `resend` - Email service
- `googleapis` - Google Sheets API
- `firebase-admin` - Firebase Admin SDK
- `passport` - Authentication
- `passport-local` - Local auth strategy
- `memorystore` - Session storage
- `esbuild` - Build tool

### Development Dependencies
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution
- `@types/*` - TypeScript type definitions

## 🐛 Troubleshooting

### Build Fails
- Check Node.js version (should be 20+)
- Run `npm ci` to clean install
- Check for TypeScript errors: `npm run check`

### Module Not Found
- Ensure `node_modules` exists: `npm install`
- Check that dependencies are in `package.json`
- Verify build output: `ls -la dist/`

### Runtime Errors
- Check environment variables are set
- Verify PORT is correct (Render uses 10000)
- Check logs for specific error messages

## 📚 Documentation

- See `DEPLOYMENT.md` for detailed deployment guide
- See `RENDER_DEPLOYMENT_FIX.md` for Render-specific fixes

## ✅ Production Checklist

- [ ] All environment variables set
- [ ] `ADMIN_PASSWORD` configured
- [ ] `ALLOWED_ORIGINS` includes frontend URL
- [ ] Build succeeds locally
- [ ] Health check endpoint works
- [ ] CORS configured correctly
- [ ] Email service configured (if using)
- [ ] Google Sheets configured (if using)

---

**Note:** This is an API-only server. The frontend is deployed separately on Vercel.
