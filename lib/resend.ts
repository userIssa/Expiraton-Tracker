import { Resend } from 'resend';

// Initialize resend client. If key is missing or mock, run in fallback log mode
const apiKey = process.env.RESEND_API_KEY || 're_mockKey123';
const isMock = apiKey.startsWith('re_mock') || !process.env.RESEND_API_KEY;

const SENDER_EMAIL = process.env.RESEND_FROM_EMAIL || 'ExpireGuard Pro <onboarding@resend.dev>';
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

export const resend = !isMock ? new Resend(apiKey) : null;

interface EmailBatchData {
  batchNumber: string;
  productName: string;
  SKU: string;
  quantity: number;
  unit: string;
  expiryDate: Date;
  location: string;
  currentUrgencyColor: string;
}

export async function sendDigestEmail(
  recipients: string[],
  subject: string,
  expiringBatches: EmailBatchData[]
) {
  if (recipients.length === 0) {
    console.log('No recipients configured for digest email.');
    return { success: false, reason: 'No recipients' };
  }

  // Construct email body
  const rows = expiringBatches.map((b) => {
    const dateStr = new Date(b.expiryDate).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
    
    let colorHex = '#146c2e'; // green
    if (b.currentUrgencyColor === 'maroon') colorHex = '#6e0000';
    else if (b.currentUrgencyColor === 'red') colorHex = '#ba1a1a';
    else if (b.currentUrgencyColor === 'orange') colorHex = '#9e7500';
    else if (b.currentUrgencyColor === 'yellow') colorHex = '#735c00';

    return `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">
          <strong>${b.productName}</strong><br/>
          <small style="color: #666666;">SKU: ${b.SKU} | Batch: #${b.batchNumber}</small>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #eeeeee;">${b.quantity} ${b.unit}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; font-family: monospace;">${b.location}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eeeeee; color: ${colorHex}; font-weight: bold;">
          ${dateStr} (${b.currentUrgencyColor.toUpperCase()})
        </td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px;">
      <h2 style="color: #6e0000; border-bottom: 2px solid #6e0000; padding-bottom: 10px; margin-top: 0;">
        ExpireGuard Pro Digest
      </h2>
      <p style="font-size: 14px; color: #333333;">
        The following inventory stock batches are nearing expiration or have already expired. Please take action immediately (clear or escalate).
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; margin-top: 20px;">
        <thead>
          <tr style="background-color: #f3f3f3;">
            <th style="padding: 10px; border-bottom: 2px solid #dddddd;">Product</th>
            <th style="padding: 10px; border-bottom: 2px solid #dddddd;">Qty</th>
            <th style="padding: 10px; border-bottom: 2px solid #dddddd;">Location</th>
            <th style="padding: 10px; border-bottom: 2px solid #dddddd;">Expiry Status</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length > 0 ? rows : `<tr><td colspan="4" style="padding: 20px; text-align: center; color: #666666;">No items requiring attention. Good job!</td></tr>`}
        </tbody>
      </table>
      <div style="margin-top: 30px; font-size: 11px; color: #777777; border-top: 1px solid #dddddd; padding-top: 10px; text-align: center;">
        ExpireGuard Pro &copy; 2026. This is an automated notification.
      </div>
    </div>
  `;

  if (isMock) {
    console.log(`\n=================== [MOCK EMAIL SENT via Resend] ===================`);
    console.log(`To: ${recipients.join(', ')}`);
    console.log(`Subject: ${subject}`);
    console.log(`Items count: ${expiringBatches.length}`);
    console.log(`HTML Output summary: ${expiringBatches.map(b => b.productName).join(', ')}`);
    console.log(`====================================================================\n`);
    return { success: true, mock: true };
  }

  try {
    const response = await resend!.emails.send({
      from: SENDER_EMAIL,
      to: recipients,
      subject: subject,
      html: html,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      return { success: false, error: response.error.message || JSON.stringify(response.error) };
    }

    console.log('Email sent successfully. Resend ID:', response.data?.id);
    return { success: true, id: response.data?.id };
  } catch (error: any) {
    console.error('Failed to send email via Resend:', error);
    return { success: false, error: error.message };
  }
}

export async function sendEscalationEmail(
  recipientEmail: string,
  recipientName: string,
  batchInfo: {
    batchNumber: string;
    productName: string;
    SKU: string;
    quantity: number;
    unit: string;
    expiryDate: Date;
    location: string;
  },
  reason: string,
  escalatedBy: string
) {
  const dateStr = new Date(batchInfo.expiryDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  const subject = `ALERT: Escalated Batch Assignment - Batch #${batchInfo.batchNumber}`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #dddddd; border-radius: 8px;">
      <h2 style="color: #ba1a1a; border-bottom: 2px solid #ba1a1a; padding-bottom: 10px; margin-top: 0;">
        Escalation Notice
      </h2>
      <p style="font-size: 14px; color: #333333;">
        Hello <strong>${recipientName}</strong>,
      </p>
      <p style="font-size: 14px; color: #333333;">
        You have been assigned a new escalated inventory batch by <strong>${escalatedBy}</strong>. Please review this immediately and take necessary actions on the portal.
      </p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; border-left: 4px solid #ba1a1a; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333333; font-size: 15px;">Batch Information</h3>
        <table style="width: 100%; font-size: 13px; border-collapse: collapse; text-align: left;">
          <tr>
            <td style="padding: 4px 0; font-weight: bold; width: 120px;">Product:</td>
            <td style="padding: 4px 0;">${batchInfo.productName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">SKU:</td>
            <td style="padding: 4px 0;">${batchInfo.SKU}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Batch Number:</td>
            <td style="padding: 4px 0;">#${batchInfo.batchNumber}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Quantity:</td>
            <td style="padding: 4px 0;">${batchInfo.quantity} ${batchInfo.unit}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Location:</td>
            <td style="padding: 4px 0;">${batchInfo.location}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-weight: bold;">Expiry Date:</td>
            <td style="padding: 4px 0; color: #ba1a1a; font-weight: bold;">${dateStr}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #fff8f8; padding: 15px; border-radius: 6px; border: 1px dashed #ba1a1a; margin: 20px 0;">
        <h4 style="margin-top: 0; color: #ba1a1a; font-size: 14px;">Reason for Escalation:</h4>
        <p style="font-size: 13px; color: #555555; font-style: italic; margin-bottom: 0;">
          "${reason}"
        </p>
      </div>

      <p style="font-size: 14px; text-align: center; margin-top: 30px;">
        <a href="${APP_URL}/escalations" style="background-color: #ba1a1a; color: white; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">
          Go to Escalation Queue
        </a>
      </p>

      <div style="margin-top: 30px; font-size: 11px; color: #777777; border-top: 1px solid #dddddd; padding-top: 10px; text-align: center;">
        ExpireGuard Pro &copy; 2026. This is an automated notification.
      </div>
    </div>
  `;

  if (isMock) {
    console.log(`\n=================== [MOCK EMAIL SENT via Resend] ===================`);
    console.log(`To: ${recipientEmail} (${recipientName})`);
    console.log(`Subject: ${subject}`);
    console.log(`Escalated by: ${escalatedBy}`);
    console.log(`Reason: ${reason}`);
    console.log(`====================================================================\n`);
    return { success: true, mock: true };
  }

  try {
    const response = await resend!.emails.send({
      from: SENDER_EMAIL,
      to: [recipientEmail],
      subject: subject,
      html: html,
    });

    if (response.error) {
      console.error('Resend API error:', response.error);
      return { success: false, error: response.error.message || JSON.stringify(response.error) };
    }

    return { success: true, id: response.data?.id };
  } catch (error: any) {
    console.error('Failed to send escalation email:', error);
    return { success: false, error: error.message };
  }
}
