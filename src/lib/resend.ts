import { Resend } from 'resend';

let resendClient: Resend | null = null;

function getClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is required');
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  const client = getClient();
  const { error } = await client.emails.send({
    from: 'GoldenCare <notifications@goldencare.app>',
    to,
    subject,
    html,
  });

  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export async function sendCaregiverDigest(
  to: string,
  seniorName: string,
  summary: string,
  alerts: string[]
) {
  const alertsHtml = alerts.length
    ? `<h3>Alerts</h3><ul>${alerts.map((a) => `<li>${a}</li>`).join('')}</ul>`
    : '';

  await sendEmail({
    to,
    subject: `GoldenCare Daily Update for ${seniorName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Daily Update for ${seniorName}</h2>
        <p>${summary}</p>
        ${alertsHtml}
        <hr />
        <p style="color: #666; font-size: 14px;">From GoldenCare</p>
      </div>
    `,
  });
}

export async function sendUrgentAlert(
  to: string,
  seniorName: string,
  alertDescription: string
) {
  await sendEmail({
    to,
    subject: `[Urgent] GoldenCare Alert for ${seniorName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Urgent Alert for ${seniorName}</h2>
        <p>${alertDescription}</p>
        <p>Please check the GoldenCare dashboard for more details.</p>
        <hr />
        <p style="color: #666; font-size: 14px;">From GoldenCare</p>
      </div>
    `,
  });
}

export async function sendOnboardingNotification(
  to: string,
  seniorName: string,
  companionName: string,
  conversationSummary: string
) {
  await sendEmail({
    to,
    subject: `${seniorName} just met ${companionName}!`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>${seniorName} just met ${companionName}!</h2>
        <p>Great news — ${seniorName} completed their first conversation with ${companionName}.</p>
        <p>Here's a summary of what they talked about:</p>
        <blockquote style="border-left: 3px solid #16a34a; padding-left: 12px; color: #333;">
          ${conversationSummary}
        </blockquote>
        <hr />
        <p style="color: #666; font-size: 14px;">From GoldenCare</p>
      </div>
    `,
  });
}
