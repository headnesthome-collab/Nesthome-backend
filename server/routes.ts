import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import { storage } from "./storage";
import { syncLeadToGoogleSheets, getSpreadsheetUrl, getAllLeadsFromSheets, type LeadData } from "./google-sheets";
import { getAllLeadsFromFirebase } from "./firebase-admin";
import { sendLeadNotification, sendContactMessage } from "./email-notifications";
import {
  verifyPassword,
  createSession,
  validateSession,
  destroySession,
  updateAdminPassword,
  getStoredAdminPasswordHash,
  loginSchema,
  changePasswordSchema,
} from "./auth";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  message: z.string().min(1, "Message is required")
});

const leadSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Valid mobile required"),
  city: z.string().min(1, "City is required"),
  timeline: z.string().min(1, "Timeline required"),
  submittedAt: z.string().optional(),
  status: z.string().optional()
});

// Middleware to check admin authentication
function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.headers["x-session-id"] as string;
  
  if (!sessionId || !validateSession(sessionId)) {
    return res.status(401).json({ 
      success: false, 
      error: "Unauthorized. Please login." 
    });
  }
  
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Admin authentication endpoints
  app.post("/api/admin/login", async (req, res) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid request", 
          details: parsed.error.errors 
        });
      }

      const { password } = parsed.data;
      const adminPasswordHash = getStoredAdminPasswordHash();
      
      if (!verifyPassword(password, adminPasswordHash)) {
        return res.status(401).json({ 
          success: false, 
          error: "Invalid password" 
        });
      }

      const sessionId = createSession("admin");
      
      res.json({ 
        success: true, 
        sessionId,
        message: "Login successful" 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error" 
      });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    const sessionId = req.headers["x-session-id"] as string;
    if (sessionId) {
      destroySession(sessionId);
    }
    res.json({ success: true, message: "Logged out successfully" });
  });

  app.post("/api/admin/change-password", requireAuth, async (req, res) => {
    try {
      const parsed = changePasswordSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid request", 
          details: parsed.error.errors 
        });
      }

      const { currentPassword, newPassword } = parsed.data;
      const adminPasswordHash = getStoredAdminPasswordHash();
      
      if (!verifyPassword(currentPassword, adminPasswordHash)) {
        return res.status(401).json({ 
          success: false, 
          error: "Current password is incorrect" 
        });
      }

      updateAdminPassword(newPassword);
      
      res.json({ 
        success: true, 
        message: "Password updated successfully" 
      });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ 
        success: false, 
        error: "Internal server error" 
      });
    }
  });

  app.get("/api/admin/verify", requireAuth, (req, res) => {
    res.json({ success: true, authenticated: true });
  });

  // API to get all leads from Firebase and Google Sheets
  app.get("/api/leads", requireAuth, async (req, res) => {
    try {
      console.log("📥 Fetching all leads from Firebase and Google Sheets...");
      
      // Fetch from both sources in parallel
      const [firebaseLeads, sheetsLeads] = await Promise.all([
        getAllLeadsFromFirebase(),
        getAllLeadsFromSheets(),
      ]);

      // Combine leads, prioritizing Firebase (more recent/authoritative)
      // Use a Map to deduplicate by ID
      const leadsMap = new Map<string, LeadData>();

      // Add Firebase leads first
      firebaseLeads.forEach((lead) => {
        leadsMap.set(lead.id, lead);
      });

      // Add Google Sheets leads (only if not already in Firebase)
      sheetsLeads.forEach((lead) => {
        if (!leadsMap.has(lead.id)) {
          leadsMap.set(lead.id, lead);
        }
      });

      // Convert map to array and sort by date (newest first)
      const allLeads = Array.from(leadsMap.values()).sort((a, b) => {
        const dateA = new Date(a.submittedAt).getTime();
        const dateB = new Date(b.submittedAt).getTime();
        return dateB - dateA;
      });

      console.log(`✅ Returning ${allLeads.length} total leads (${firebaseLeads.length} from Firebase, ${sheetsLeads.length} from Sheets)`);
      
      res.json({
        success: true,
        leads: allLeads,
        counts: {
          total: allLeads.length,
          fromFirebase: firebaseLeads.length,
          fromSheets: sheetsLeads.length,
        },
      });
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch leads",
        leads: [],
      });
    }
  });

  // API to save lead and sync to Google Sheets
  app.post("/api/leads", async (req, res) => {
    try {
      console.log("📥 Received lead data:", JSON.stringify(req.body));
      
      // Validate incoming data
      const parsed = leadSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("❌ Validation failed:", parsed.error);
        return res.status(400).json({ success: false, error: "Invalid lead data", details: parsed.error.errors });
      }
      
      const leadData: LeadData = {
        id: parsed.data.id || crypto.randomUUID(),
        name: parsed.data.name,
        mobile: parsed.data.mobile,
        city: parsed.data.city,
        timeline: parsed.data.timeline,
        submittedAt: parsed.data.submittedAt || new Date().toISOString(),
        status: parsed.data.status || "New"
      };

      // Sync to Google Sheets
      const sheetsSynced = await syncLeadToGoogleSheets(leadData);
      
      // Send email notification
      const emailSent = await sendLeadNotification(leadData);
      
      console.log("✅ Lead received:", leadData.name, "| Google Sheets:", sheetsSynced ? "✅" : "❌", "| Email:", emailSent ? "✅" : "❌");
      
      res.json({ 
        success: true, 
        leadId: leadData.id,
        googleSheetsSynced: sheetsSynced,
        emailNotificationSent: emailSent
      });
    } catch (error) {
      console.error("Error saving lead:", error);
      res.status(500).json({ success: false, error: "Failed to save lead" });
    }
  });

  // API to send contact form message
  app.post("/api/contact", async (req, res) => {
    try {
      console.log("📥 Received contact message:", JSON.stringify(req.body));
      
      const parsed = contactSchema.safeParse(req.body);
      if (!parsed.success) {
        console.error("❌ Contact validation failed:", parsed.error);
        return res.status(400).json({ success: false, error: "Invalid contact data", details: parsed.error.errors });
      }
      
      const emailSent = await sendContactMessage(parsed.data);
      
      console.log("✅ Contact message processed | Email:", emailSent ? "✅" : "❌");
      
      if (!emailSent) {
        console.error("❌ Email delivery failed for contact from:", parsed.data.email);
        return res.status(500).json({ 
          success: false, 
          emailSent: false,
          error: "Failed to send email. Please try WhatsApp instead."
        });
      }
      
      res.json({ 
        success: true, 
        emailSent: true
      });
    } catch (error) {
      console.error("Error processing contact:", error);
      res.status(500).json({ success: false, error: "Failed to send message" });
    }
  });

  // API to get Google Sheets URL
  app.get("/api/spreadsheet-url", async (req, res) => {
    try {
      const url = await getSpreadsheetUrl();
      res.json({ url });
    } catch (error) {
      console.error("Error getting spreadsheet URL:", error);
      res.status(500).json({ url: null, error: "Failed to get spreadsheet URL" });
    }
  });

  // API to sync all leads to Google Sheets (bulk sync)
  app.post("/api/sync-all-leads", async (req, res) => {
    try {
      const leads = req.body.leads;
      
      if (!leads || !Array.isArray(leads)) {
        return res.status(400).json({ success: false, error: "No leads provided" });
      }

      console.log(`📤 Syncing ${leads.length} leads to Google Sheets...`);
      
      let synced = 0;
      let failed = 0;

      for (const lead of leads) {
        try {
          // Map lead data to the expected format
          const leadData: LeadData = {
            id: lead.id || crypto.randomUUID(),
            name: lead.name || "Unknown",
            mobile: lead.mobile || "",
            city: lead.city || "Unknown",
            timeline: lead.timeline || lead.startMonth || "Not specified",
            submittedAt: lead.submittedAt || new Date().toISOString(),
            status: lead.status || "New",
          };

          // Validate required fields
          if (!leadData.name || !leadData.mobile || !leadData.city) {
            console.warn(`⚠️ Skipping lead with missing required fields:`, leadData);
            failed++;
            continue;
          }

          const success = await syncLeadToGoogleSheets(leadData);
        if (success) {
          synced++;
        } else {
            failed++;
          }
        } catch (leadError) {
          console.error("Error syncing individual lead:", leadError);
          failed++;
        }
      }

      console.log(`✅ Bulk sync complete: ${synced} synced, ${failed} failed`);
      
      res.json({ 
        success: true, 
        synced, 
        failed,
        total: leads.length
      });
    } catch (error) {
      console.error("Error in bulk sync:", error);
      res.status(500).json({ 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to sync leads" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
