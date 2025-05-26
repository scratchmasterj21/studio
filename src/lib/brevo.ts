/**
 * WARNING: SECURITY RISK!
 * Sending emails directly from the client-side using an API key is highly insecure for production applications.
 * Your Brevo API key will be exposed to anyone inspecting your site's code.
 * This implementation is provided to meet the specific constraints of the prompt.
 * For a production environment, this logic MUST be moved to a secure backend (e.g., a Next.js API route,
 * Firebase Cloud Function, or another server-side proxy) that can safely store and use the API key.
 */

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

// Ensure these are set in your .env.local file
const BREVO_API_KEY = process.env.NEXT_PUBLIC_BREVO_API_KEY;
const BREVO_SENDER_EMAIL = process.env.NEXT_PUBLIC_BREVO_SENDER_EMAIL;
const BREVO_SENDER_NAME = process.env.NEXT_PUBLIC_BREVO_SENDER_NAME || 'FireDesk Notifications';

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  htmlContent: string;
  textContent?: string; // Optional plain text version
}

export async function sendEmailViaBrevo({
  to,
  subject,
  htmlContent,
  textContent,
}: SendEmailParams): Promise<{ success: boolean; message?: string; error?: any }> {
  if (!BREVO_API_KEY) {
    console.error('Brevo API key is not configured.');
    // In a real app, you might not want to send an email if the key is missing,
    // but for this exercise, we'll simulate a failure.
    return { success: false, message: 'Brevo API key not configured. Email not sent.' };
  }
  if (!BREVO_SENDER_EMAIL) {
    console.error('Brevo sender email is not configured.');
    return { success: false, message: 'Brevo sender email not configured. Email not sent.' };
  }
  
  console.warn(
    'SECURITY WARNING: Sending email via client-side Brevo API. API Key is exposed. NOT FOR PRODUCTION.'
  );

  const payload = {
    sender: {
      name: BREVO_SENDER_NAME,
      email: BREVO_SENDER_EMAIL,
    },
    to: to,
    subject: subject,
    htmlContent: htmlContent,
    ...(textContent && { textContent: textContent }),
  };

  try {
    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Brevo API Error:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    // Brevo API returns 201 for success
    // console.log('Email sent successfully via Brevo:', await response.json());
    return { success: true, message: 'Email dispatch initiated successfully via Brevo.' };
  } catch (error) {
    console.error('Failed to send email via Brevo:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Example usage (would be called from ticket creation/update logic):
/*
import { useToast } from "@/hooks/use-toast";

const { toast } = useToast(); // if used in a component

export const notifyUserTicketCreated = async (userEmail: string, userName: string, ticketTitle: string, ticketId: string) => {
  if (!userEmail) return;

  const subject = `Your FireDesk Ticket "${ticketTitle}" has been created!`;
  const htmlContent = `
    <h1>Ticket Created: ${ticketTitle}</h1>
    <p>Hello ${userName || 'User'},</p>
    <p>Your support ticket titled "<strong>${ticketTitle}</strong>" has been successfully created.</p>
    <p>You can view your ticket details and updates here: <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/tickets/${ticketId}">View Ticket</a></p>
    <p>Thank you,<br/>The FireDesk Team</p>
  `;

  const result = await sendEmailViaBrevo({
    to: [{ email: userEmail, name: userName }],
    subject,
    htmlContent,
  });

  if (result.success) {
    // toast({ title: "Notification Email Sent", description: `User ${userEmail} notified about new ticket.` });
    console.log(`Notification email sent for ticket ${ticketId} to ${userEmail}`);
  } else {
    // toast({ title: "Notification Email Failed", description: `Could not notify ${userEmail}. Reason: ${result.error || result.message}`, variant: "destructive" });
    console.error(`Failed to send notification for ticket ${ticketId} to ${userEmail}: ${result.error || result.message}`);
  }
};
*/
