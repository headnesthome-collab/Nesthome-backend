import { google } from 'googleapis';

let sheetsClient: any = null;
let spreadsheetId: string | null = null;

// Initialize Google Sheets client using Service Account
async function getGoogleSheetsClient() {
  if (sheetsClient) {
    return sheetsClient;
  }

  try {
    // Option 1: Use Service Account JSON file path
    const serviceAccountPath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH;
    
    // Option 2: Use Service Account credentials from environment variables
    const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    
    // Option 3: Use Service Account JSON as string
    const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

    let auth: any;

    if (serviceAccountPath) {
      // Load from file
      const serviceAccount = await import(serviceAccountPath);
      auth = new google.auth.GoogleAuth({
        credentials: serviceAccount,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else if (serviceAccountEmail && privateKey) {
      // Use environment variables
      auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: serviceAccountEmail,
          private_key: privateKey,
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else if (serviceAccountJson) {
      // Parse JSON string from environment
      const credentials = JSON.parse(serviceAccountJson);
      auth = new google.auth.GoogleAuth({
        credentials: credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
    } else {
      throw new Error(
        'Google Sheets credentials not configured. ' +
        'Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY, ' +
        'or GOOGLE_SERVICE_ACCOUNT_JSON, or GOOGLE_SERVICE_ACCOUNT_PATH in your .env file.'
      );
    }

    sheetsClient = google.sheets({ version: 'v4', auth });
    console.log('✅ Google Sheets client initialized');
    return sheetsClient;
  } catch (error) {
    console.error('Error initializing Google Sheets client:', error);
    throw error;
  }
}

async function getOrCreateSpreadsheet() {
  if (spreadsheetId) {
    return spreadsheetId;
  }

  // Check if spreadsheet ID is provided in environment
  const envSpreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (envSpreadsheetId) {
    spreadsheetId = envSpreadsheetId;
    console.log('✅ Using configured spreadsheet ID:', spreadsheetId);
    return spreadsheetId;
  }

  // Otherwise, create a new spreadsheet
  try {
    const sheets = await getGoogleSheetsClient();
    
    const response = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: 'Nesthome Leads'
        },
        sheets: [{
          properties: {
            title: 'Leads',
            gridProperties: {
              rowCount: 1000,
              columnCount: 8
            }
          }
        }]
      }
    });

    spreadsheetId = response.data.spreadsheetId || null;
    
    if (spreadsheetId) {
      // Set up headers
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Leads!A1:G1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['Date', 'Name', 'Mobile', 'City', 'Timeline', 'Status', 'Lead ID']]
        }
      });
      console.log('✅ Created new Nesthome Leads spreadsheet:', spreadsheetId);
      console.log('📝 Add this to your .env file: GOOGLE_SPREADSHEET_ID=' + spreadsheetId);
    }
    
    return spreadsheetId;
  } catch (error) {
    console.error('Error creating spreadsheet:', error);
    throw error;
  }
}

export interface LeadData {
  id: string;
  name: string;
  mobile: string;
  city: string;
  timeline: string;
  submittedAt: string;
  status: string;
}

export async function syncLeadToGoogleSheets(lead: LeadData): Promise<boolean> {
  try {
    const sheets = await getGoogleSheetsClient();
    const sheetId = await getOrCreateSpreadsheet();
    
    if (!sheetId) {
      throw new Error('Could not get spreadsheet ID');
    }

    const formattedDate = new Date(lead.submittedAt).toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'short'
    });

    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId,
      range: 'Leads!A:G',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          formattedDate,
          lead.name,
          lead.mobile,
          lead.city,
          lead.timeline,
          lead.status,
          lead.id
        ]]
      }
    });

    console.log('✅ Lead synced to Google Sheets:', lead.name);
    return true;
  } catch (error) {
    console.error('Error syncing to Google Sheets:', error);
    return false;
  }
}

export async function getSpreadsheetUrl(): Promise<string | null> {
  try {
    const sheetId = await getOrCreateSpreadsheet();
    if (sheetId) {
      return `https://docs.google.com/spreadsheets/d/${sheetId}`;
    }
    return null;
  } catch (error) {
    console.error('Error getting spreadsheet URL:', error);
    return null;
  }
}
