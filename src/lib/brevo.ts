

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
    console.error('Brevo API key is not configured in .env.local (NEXT_PUBLIC_BREVO_API_KEY).');
    return { success: false, message: 'Brevo API key not configured. Email not sent.' };
  }
  if (!BREVO_SENDER_EMAIL) {
    console.error('Brevo sender email is not configured in .env.local (NEXT_PUBLIC_BREVO_SENDER_EMAIL).');
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
      let errorBodyText = await response.text();
      let errorData: any = {};
      let finalErrorMessage = `Brevo API HTTP error! Status: ${response.status}.`;

      if (errorBodyText) {
        finalErrorMessage += ` Raw Response Body: ${errorBodyText}`;
        try {
          errorData = JSON.parse(errorBodyText);
          // Brevo errors usually have a 'message' and sometimes a 'code' field
          if (errorData.message) {
            finalErrorMessage = `Brevo API Error: "${errorData.message}" (Code: ${errorData.code || 'N/A'}). Status: ${response.status}.`;
          }
        } catch (e) {
          // If parsing fails, the raw text is already included in finalErrorMessage
          console.warn('Brevo API error response was not valid JSON, or was empty. Raw text:', errorBodyText, 'Parse error:', e);
        }
      }
      
      console.error('Brevo API Error Full Details:', { status: response.status, bodyAttempt: errorBodyText, parsedJsonAttempt: errorData });
      throw new Error(finalErrorMessage);
    }

    // Brevo API returns 201 for successful dispatch initiation
    // console.log('Email sent successfully via Brevo:', await response.json()); 
    // Note: response.json() might fail if Brevo sends 201 with empty body, 
    // or a non-JSON body for success, which is unusual but possible.
    // For a 201, it's usually safe to assume success if response.ok is true.
    return { success: true, message: 'Email dispatch initiated successfully via Brevo.' };
  } catch (error) {
    console.error('Error sending email via Brevo:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred while sending email.';
    // Ensure we return a consistent structure for the calling function
    return { 
      success: false, 
      message: `Failed to send email: ${errorMessage}`,
      error: error 
    };
  }
}
