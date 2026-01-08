import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  type: "welcome" | "password_reset" | "notification";
  data?: {
    name?: string;
    resetLink?: string;
    message?: string;
    subject?: string;
  };
}

const getEmailContent = (type: string, data: EmailRequest["data"] = {}) => {
  switch (type) {
    case "welcome":
      return {
        subject: "Welcome to Aurora!",
        htmlBody: `
          <h1>Welcome${data.name ? `, ${data.name}` : ""}!</h1>
          <p>Thank you for signing up for Aurora. We're excited to have you on board.</p>
          <p>You can now access all features of our platform.</p>
          <p>Best regards,<br>The Aurora Team</p>
        `,
        textBody: `Welcome${data.name ? `, ${data.name}` : ""}! Thank you for signing up for Aurora.`,
      };
    case "password_reset":
      return {
        subject: "Reset Your Password",
        htmlBody: `
          <h1>Password Reset Request</h1>
          <p>We received a request to reset your password.</p>
          ${data.resetLink ? `<p><a href="${data.resetLink}">Click here to reset your password</a></p>` : ""}
          <p>If you didn't request this, you can safely ignore this email.</p>
          <p>Best regards,<br>The Aurora Team</p>
        `,
        textBody: `Password Reset Request. ${data.resetLink ? `Reset link: ${data.resetLink}` : ""}`,
      };
    case "notification":
      return {
        subject: data.subject || "Notification from Aurora",
        htmlBody: `
          <h1>${data.subject || "Notification"}</h1>
          <p>${data.message || "You have a new notification."}</p>
          <p>Best regards,<br>The Aurora Team</p>
        `,
        textBody: data.message || "You have a new notification from Aurora.",
      };
    default:
      throw new Error(`Unknown email type: ${type}`);
  }
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const POSTMARK_API_KEY = Deno.env.get("POSTMARK_API_KEY");
    if (!POSTMARK_API_KEY) {
      throw new Error("POSTMARK_API_KEY not configured");
    }

    const { to, type, data }: EmailRequest = await req.json();

    if (!to || !type) {
      throw new Error("Missing required fields: to, type");
    }

    const emailContent = getEmailContent(type, data);

    const response = await fetch("https://api.postmarkapp.com/email", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": POSTMARK_API_KEY,
      },
      body: JSON.stringify({
        From: "noreply@yourdomain.com", // Update with your verified sender
        To: to,
        Subject: emailContent.subject,
        HtmlBody: emailContent.htmlBody,
        TextBody: emailContent.textBody,
        MessageStream: "outbound",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("Postmark error:", result);
      throw new Error(result.Message || "Failed to send email");
    }

    console.log("Email sent successfully:", result.MessageID);

    return new Response(JSON.stringify({ success: true, messageId: result.MessageID }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
