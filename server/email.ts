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

export async function sendOnboardingDay1(email: string, userName: string) {
  const resend = getResendClient();
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: "Welcome to SnapPost Pro! 🚀 Here's how to get started",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to SnapPost Pro, ${userName}!</h2>
        <p>We're excited to have you on board. Here's everything you need to know to get started:</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>🎯 Getting Started in 3 Steps:</h3>
          <ol>
            <li><strong>Upload a photo</strong> - Take a job site photo and upload it to SnapPost Pro</li>
            <li><strong>AI generates caption</strong> - Our AI creates a professional caption tailored to your trade</li>
            <li><strong>Brand & post</strong> - We add your logo, and you post to Facebook in seconds</li>
          </ol>
        </div>

        <p><strong>💡 Pro Tip:</strong> The best results come from clear, well-lit photos of your work. Before/after shots perform especially well.</p>

        <p>Ready to create your first branded post?</p>
        <a href="https://snappostpro.com/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Start Creating</a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.
        </p>
      </div>
    `,
  });
}

export async function sendOnboardingDay3(email: string, userName: string) {
  const resend = getResendClient();
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: "💪 Keep the momentum going - Your first posts matter",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>How are your first posts going, ${userName}?</h2>
        <p>We wanted to check in and share some tips to help you get the most out of SnapPost Pro.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📸 Tips for Better Results:</h3>
          <ul>
            <li><strong>Post consistently</strong> - 2-3 posts per week builds momentum with your audience</li>
            <li><strong>Use captions as-is or customize</strong> - Our AI captions are great, but feel free to add your personal touch</li>
            <li><strong>Track engagement</strong> - Check Facebook Insights to see which posts resonate most</li>
            <li><strong>Showcase your best work</strong> - Before/after transformations get the most engagement</li>
          </ul>
        </div>

        <p><strong>🎁 Bonus:</strong> Your logo branding is automatically applied to every post. This builds brand recognition with every share!</p>

        <p>Keep creating:</p>
        <a href="https://snappostpro.com/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.
        </p>
      </div>
    `,
  });
}

export async function sendOnboardingDay5(email: string, userName: string, plan: "free" | "starter" | "pro") {
  const planDetails = {
    free: { name: "Free", posts: 3, upgrade: true },
    starter: { name: "Starter", posts: 30, upgrade: false },
    pro: { name: "Pro", posts: 300, upgrade: false },
  };

  const details = planDetails[plan];
  const resend = getResendClient();

  let upgradeSection = "";
  if (details.upgrade) {
    upgradeSection = `
      <div style="background: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #ffc107;">
        <h3 style="margin-top: 0;">Ready to post more?</h3>
        <p>You're on the Free plan with <strong>3 posts per month</strong>. Upgrade to Starter (30 posts) or Pro (300 posts) to scale your marketing.</p>
        <a href="https://snappostpro.com/pricing" style="background: #ffc107; color: #333; padding: 10px 20px; border-radius: 6px; text-decoration: none; display: inline-block;">View Plans</a>
      </div>
    `;
  }

  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: "You're crushing it! 🔥 Here's what's next",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>You're doing great, ${userName}!</h2>
        <p>By now, you've created your first branded posts and seen how easy it is to scale your Facebook marketing.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3>📊 Your Current Plan:</h3>
          <p><strong>${details.name} Plan:</strong> ${details.posts} branded posts per month</p>
          <ul>
            <li>AI-generated captions</li>
            <li>Logo branding overlay</li>
            <li>One-click Facebook posting</li>
          </ul>
        </div>

        ${upgradeSection}

        <p><strong>💬 Success Story:</strong> Contractors using SnapPost Pro consistently save 5+ hours per week on marketing while getting more leads.</p>

        <p>Keep creating:</p>
        <a href="https://snappostpro.com/dashboard" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block;">Go to Dashboard</a>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          Questions? Reply to this email or visit our <a href="https://snappostpro.com/contact">contact page</a>.
        </p>
      </div>
    `,
  });
}


export async function sendContactFormNotification(
  name: string,
  email: string,
  message: string,
  ownerEmail: string
) {
  const resend = getResendClient();
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: ownerEmail,
    subject: `New contact form submission from ${name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Contact Form Submission</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Message:</strong></p>
          <p style="white-space: pre-wrap; background: white; padding: 10px; border-radius: 4px;">${message}</p>
        </div>

        <p><strong>Reply to:</strong> <a href="mailto:${email}">${email}</a></p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #666;">
          This is an automated notification from SnapPost Pro contact form.
        </p>
      </div>
    `,
  });
}


export async function sendNewsletterWelcome(email: string) {
  const resend = getResendClient();
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: "Welcome to SnapPost Pro Newsletter",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to SnapPost Pro! 🎉</h2>
        
        <p>Thanks for subscribing to our newsletter. You'll now receive:</p>
        
        <ul style="line-height: 1.8;">
          <li>💡 Weekly tips to save time on social media</li>
          <li>📊 Industry insights for tradies and contractors</li>
          <li>🎁 Exclusive discounts and early access to new features</li>
          <li>📱 Best practices for Facebook marketing</li>
        </ul>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 30px 0; text-align: center;">
          <p style="margin: 0; color: #666;">
            First email coming in 3 days. Check your inbox!
          </p>
        </div>

        <p style="color: #666; font-size: 14px;">
          You can unsubscribe anytime by clicking the link at the bottom of any email.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #999;">
          SnapPost Pro • Marketing automation for tradies<br>
          <a href="https://snappostpro.com" style="color: #5B4FFF; text-decoration: none;">snappostpro.com</a>
        </p>
      </div>
    `,
  });
}

export async function sendNewsletterSignupNotification(email: string, ownerEmail: string) {
  const resend = getResendClient();
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: ownerEmail,
    subject: `New newsletter subscriber: ${email}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>New Newsletter Subscriber</h2>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Email:</strong> <a href="mailto:${email}">${email}</a></p>
          <p><strong>Subscribed:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>Source:</strong> snappostpro.com</p>
        </div>

        <p style="font-size: 12px; color: #666;">
          This is an automated notification from SnapPost Pro.
        </p>
      </div>
    `,
  });
}

export async function sendEmailVerification(email: string, userName: string, verificationToken: string) {
  const resend = getResendClient();
  const verificationUrl = `https://snappostpro.com/verify-email?token=${verificationToken}`;
  
  return resend.emails.send({
    from: "SnapPost Pro <noreply@snappostpro.com>",
    to: email,
    subject: "Verify your SnapPost Pro email",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Verify your email, ${userName}</h2>
        <p>Welcome to SnapPost Pro! Please verify your email address to get started.</p>
        
        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <a href="${verificationUrl}" style="background: #6366f1; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; font-weight: bold;">Verify Email</a>
        </div>

        <p style="color: #666; font-size: 14px;">
          Or copy and paste this link in your browser:<br>
          <code style="background: #f5f5f5; padding: 8px; border-radius: 4px; display: block; word-break: break-all; margin-top: 10px;">${verificationUrl}</code>
        </p>

        <p style="color: #999; font-size: 12px;">
          This link expires in 24 hours. If you didn't sign up for SnapPost Pro, you can ignore this email.
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
        
        <p style="font-size: 12px; color: #999;">
          SnapPost Pro • Marketing automation for tradies<br>
          <a href="https://snappostpro.com" style="color: #5B4FFF; text-decoration: none;">snappostpro.com</a>
        </p>
      </div>
    `,
  });
}
