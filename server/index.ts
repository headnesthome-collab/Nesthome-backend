// Load environment variables from .env file
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
  const envPath = join(__dirname, "..", ".env");
  const envFile = readFileSync(envPath, "utf-8");
  const envLines = envFile.split("\n");
  
  for (const line of envLines) {
    const trimmedLine = line.trim();
    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith("#")) continue;
    
    const [key, ...valueParts] = trimmedLine.split("=");
    if (key && valueParts.length > 0) {
      const value = valueParts.join("=").trim();
      // Remove quotes if present
      const cleanValue = value.replace(/^["']|["']$/g, "");
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = cleanValue;
      }
    }
  }
  console.log("✅ Environment variables loaded from .env file");
} catch (error) {
  console.warn("⚠️  Could not load .env file (this is okay if using system environment variables)");
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { initializeAdminPassword } from "./auth";
import { log } from "./log";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

// CORS configuration for separate frontend/backend deployment
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5000', 'http://localhost:5173', 'https://www.nesthome.co.in', 'https://nesthome.co.in'];

// Log allowed origins for debugging
console.log('🌐 Allowed CORS origins:', allowedOrigins);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Normalize origin (remove trailing slash)
  const normalizedOrigin = origin ? origin.replace(/\/$/, '') : null;
  
  // Check if origin is allowed (exact match or normalized match)
  const isAllowed = normalizedOrigin && (
    allowedOrigins.includes(normalizedOrigin) || 
    allowedOrigins.includes(origin || '')
  );
  
  if (isAllowed) {
    res.setHeader('Access-Control-Allow-Origin', origin || '');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (origin) {
    // Log blocked origin for debugging
    console.warn(`⚠️  CORS blocked origin: ${origin}`);
  }
  
  // Always set these headers for preflight requests
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-session-id, X-Session-Id');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize admin password
  initializeAdminPassword();
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // API-only server - no static file serving needed
  // Frontend is deployed separately on Vercel
  // Return 404 for non-API routes
  app.use("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.status(404).json({ 
        error: "Not Found",
        message: "This is an API-only server. Frontend is deployed separately.",
        availableEndpoints: [
          "GET /api/health",
          "POST /api/admin/login",
          "POST /api/admin/logout",
          "POST /api/admin/change-password",
          "GET /api/admin/verify",
          "GET /api/leads",
          "POST /api/leads",
          "POST /api/sync-all-leads",
          "GET /api/spreadsheet-url",
          "POST /api/contact"
        ]
      });
    } else {
      res.status(404).json({ 
        error: "API endpoint not found",
        message: "Check the API documentation for available endpoints."
      });
    }
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      log(`⚠️  Port ${port} is already in use. Please:`);
      log(`   1. Kill the process using: kill -9 $(lsof -ti:${port})`);
      log(`   2. Or use a different port: PORT=5001 npm run dev`);
      process.exit(1);
    } else {
      throw err;
    }
  });
  
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
