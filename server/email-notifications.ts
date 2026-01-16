import { Resend } from 'resend';

// Lazy initialization - only create Resend instance when API key is available
let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(process.env.RESEND_API_KEY);
  }
  return resendInstance;
}

// Get email configuration from environment variables
function getEmailConfig() {
  // From address - must be from your verified domain
  const fromEmail = process.env.RESEND_FROM_EMAIL || process.env.RESEND_FROM || 'noreply@yourdomain.com';
  const fromName = process.env.RESEND_FROM_NAME || 'Nesthome';
  
  // Recipient email(s) - where to send notifications
  const recipientEmail = process.env.RESEND_TO_EMAIL || process.env.RESEND_TO || 'prakhart819@gmail.com';
  const recipientEmails = recipientEmail.split(',').map(email => email.trim());
  
  return {
    from: `${fromName} <${fromEmail}>`,
    to: recipientEmails,
  };
}

export interface LeadNotification {
  name: string;
  mobile: string;
  city: string;
  timeline: string;
  submittedAt: string;
}

export interface ContactMessage {
  name: string;
  email: string;
  message: string;
}

function getTimelineLabel(timeline: string): string {
  const labels: Record<string, string> = {
    'within-1-month': 'Within 1 month 🔥',
    '1-3-months': '1-3 months',
    '3-6-months': '3-6 months',
    'exploring': 'Just exploring'
  };
  return labels[timeline] || timeline;
}

export async function sendLeadNotification(lead: LeadNotification): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn('⚠️ Email notifications disabled: RESEND_API_KEY not configured');
      return false;
    }

    const emailConfig = getEmailConfig();
    
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: emailConfig.to,
      subject: `🏠 New Lead: ${lead.name} from ${lead.city}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2d5a4a; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">🏠 New Lead Received!</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2d5a4a; margin-top: 0;">Customer Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 40%;">Name</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${lead.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Mobile</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <a href="tel:${lead.mobile}" style="color: #2d5a4a;">${lead.mobile}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">City</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${lead.city}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Timeline</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; color: #d4af37; font-weight: bold;">${getTimelineLabel(lead.timeline)}</td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold;">Submitted At</td>
                <td style="padding: 10px;">${new Date(lead.submittedAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #2d5a4a; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="margin: 0;">Call the customer now: <a href="tel:${lead.mobile}" style="color: #d4af37; font-weight: bold;">${lead.mobile}</a></p>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
            This is an automated notification from Nesthome Lead System
          </p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Email notification failed:', error);
      return false;
    }

    console.log('✅ Email notification sent:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Email notification error:', error);
    return false;
  }
}

export async function sendContactMessage(contact: ContactMessage): Promise<boolean> {
  try {
    const resend = getResend();
    if (!resend) {
      console.warn('⚠️ Email notifications disabled: RESEND_API_KEY not configured');
      return false;
    }

    const emailConfig = getEmailConfig();
    
    const { data, error } = await resend.emails.send({
      from: emailConfig.from,
      to: emailConfig.to,
      replyTo: contact.email,
      subject: `📬 New Message from ${contact.name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #2d5a4a; color: white; padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">📬 New Contact Message</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 20px; border: 1px solid #ddd;">
            <h2 style="color: #2d5a4a; margin-top: 0;">Message Details</h2>
            
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold; width: 30%;">From</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">${contact.name}</td>
              </tr>
              <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; font-weight: bold;">Email</td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                  <a href="mailto:${contact.email}" style="color: #2d5a4a;">${contact.email}</a>
                </td>
              </tr>
              <tr>
                <td style="padding: 10px; font-weight: bold; vertical-align: top;">Message</td>
                <td style="padding: 10px; white-space: pre-wrap;">${contact.message}</td>
              </tr>
            </table>
          </div>
          
          <div style="background: #2d5a4a; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center;">
            <p style="margin: 0;">Reply directly to: <a href="mailto:${contact.email}" style="color: #d4af37; font-weight: bold;">${contact.email}</a></p>
          </div>
          
          <p style="color: #666; font-size: 12px; text-align: center; margin-top: 20px;">
            This message was sent from the Nesthome website contact form
          </p>
        </div>
      `
    });

    if (error) {
      console.error('❌ Contact email failed:', error);
      return false;
    }

    console.log('✅ Contact email sent:', data?.id);
    return true;
  } catch (error) {
    console.error('❌ Contact email error:', error);
    return false;
  }
}
