import { Resend } from 'resend';

// Initialize resend client. If key is missing or mock, run in fallback log mode
const apiKey = process.env.RESEND_API_KEY || 're_mockKey123';
const isMock = apiKey.startsWith('re_mock') || !process.env.RESEND_API_KEY;

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
      from: 'ExpireGuard Pro <onboarding@resend.dev>',
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
