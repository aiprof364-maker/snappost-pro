import { Resend } from "resend";

/**
 * Lazy-initialize Resend client only when needed.
 * This prevents startup errors if RESEND_API_KEY is missing.
 */
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error(
        "RESEND_API_KEY environment variable is not set. Email notifications will not work."
      );
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

export async function sendPurchaseConfirmation(
  email: string,
  userName: string,
  plan: "starter" | "pro",
  amount: number
) {
  const planDetails = {
    starter: { name: "Starter", posts: 30, price: 19 },
    pro: { name: "Pro", posts: 300, price: 29 },
  };

  const details = planDetails[plan];
  const resend = getResendClient();

  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: `Welcome to SnapPost Pro ${details.name}! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to SnapPost Pro, ${userName}!</h2>
        <p>Your subscription to the <strong>${details.name} plan</strong> is now active.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>Your Plan Details:</h3>
          <ul>
            <li><strong>${details.posts} branded posts per month</strong></li>
            <li>AI-generated captions</li>
            <li>Logo branding overlay</li>
            ${plan === "pro" ? "<li>Up to 5 Facebook pages</li>" : ""}
            ${plan === "pro" ? "<li>Priority processing</li>" : ""}
          </ul>
        </div>

        <p><strong>Next billing date:</strong> ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>

        <p>Start creating branded posts now:</p>
        <a href="https://snappostpro.com/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.
        </p>
      </div>
    `,
  });
}

export async function sendTrialExpirationWarning(
  email: string,
  userName: string,
  expirationDate: Date
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: "Your free trial ends in 1 day ⏰",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Your trial ends tomorrow, ${userName}</h2>
        <p>Your 7-day free trial of SnapPost Pro expires on <strong>${expirationDate.toLocaleDateString()}</strong>.</p>
        
        <p>After your trial ends, your subscription will automatically renew at the plan rate you selected.</p>

        <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
          <strong>Your subscription will continue unless you cancel.</strong>
        </div>

        <p>To manage your subscription:</p>
        <a href="https://snappostpro.com/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">View Subscription</a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.
        </p>
      </div>
    `,
  });
}

export async function sendRenewalReminder(
  email: string,
  userName: string,
  plan: "starter" | "pro",
  renewalDate: Date
) {
  const planDetails = {
    starter: { name: "Starter", price: 19 },
    pro: { name: "Pro", price: 29 },
  };

  const details = planDetails[plan];
  const resend = getResendClient();

  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: `Your SnapPost Pro ${details.name} plan renews tomorrow`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Subscription renewal reminder</h2>
        <p>Your SnapPost Pro <strong>${details.name}</strong> subscription renews tomorrow, <strong>${renewalDate.toLocaleDateString()}</strong>.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Amount to be charged:</strong> $${details.price}/month</p>
        </div>

        <p>Your subscription will automatically renew unless you cancel it.</p>

        <a href="https://snappostpro.com/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Manage Subscription</a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.
        </p>
      </div>
    `,
  });
}

/**
 * Export for testing purposes.
 */
export { getResendClient };
