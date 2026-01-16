import admin from 'firebase-admin';
import type { LeadData } from './google-sheets';

let firebaseApp: admin.app.App | null = null;

// Initialize Firebase Admin SDK
async function getFirebaseAdmin() {
  if (firebaseApp) {
    return firebaseApp;
  }

  try {
    // Option 1: Use service account JSON file path
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    
    // Option 2: Use service account JSON as string
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    // Option 3: Use individual credentials from environment
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    if (serviceAccountPath) {
      // Load from file (dynamic import for ES modules)
      const serviceAccount = await import(serviceAccountPath);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount.default || serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${(serviceAccount.default || serviceAccount).project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`,
      });
    } else if (serviceAccountJson) {
      // Parse JSON string from environment
      const serviceAccount = JSON.parse(serviceAccountJson);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}-default-rtdb.asia-southeast1.firebasedatabase.app`,
      });
    } else if (projectId && privateKey && clientEmail) {
      // Use individual credentials
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          privateKey,
          clientEmail,
        }),
        databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`,
      });
    } else {
      console.warn('⚠️ Firebase Admin SDK not configured. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_SERVICE_ACCOUNT_PATH in .env');
      return null;
    }

    console.log('✅ Firebase Admin SDK initialized');
    return firebaseApp;
  } catch (error) {
    console.error('Error initializing Firebase Admin SDK:', error);
    return null;
  }
}

// Fetch all leads from Firebase Realtime Database
export async function getAllLeadsFromFirebase(): Promise<LeadData[]> {
  try {
    const app = await getFirebaseAdmin();
    if (!app) {
      console.warn('⚠️ Firebase Admin not initialized');
      return [];
    }

    const db = admin.database(app);
    const leadsRef = db.ref('leads');
    
    const snapshot = await leadsRef.once('value');
    const data = snapshot.val();

    if (!data) {
      return [];
    }

    // Convert Firebase object to array
    const leads: LeadData[] = Object.entries(data).map(([key, value]: [string, any]) => {
      return {
        id: key,
        name: value.name || 'Unknown',
        mobile: value.mobile || '',
        city: value.city || 'Unknown',
        timeline: value.timeline || value.startMonth || 'Not specified',
        status: value.status || 'New',
        submittedAt: value.submittedAt || new Date().toISOString(),
      };
    });

    console.log(`✅ Fetched ${leads.length} leads from Firebase`);
    return leads;
  } catch (error) {
    console.error('Error fetching leads from Firebase:', error);
    return [];
  }
}
