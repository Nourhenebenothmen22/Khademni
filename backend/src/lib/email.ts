import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { AppError } from "../common/errors/app-error.js";

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  if (!env.SMTP_HOST) {
    logger.warn("SMTP not configured — emails will be logged to console only.");
    return null;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth:
      env.SMTP_USER && env.SMTP_PASS
        ? { user: env.SMTP_USER, pass: env.SMTP_PASS }
        : undefined,
  });

  return transporter;
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

async function sendEmail(options: EmailOptions): Promise<void> {
  const transport = getTransporter();
  const from = env.SMTP_FROM;

  if (!transport) {
    if (env.NODE_ENV === "production") {
      throw new AppError("SMTP transport is required in production environment.", 500);
    }
    logger.info(
      { to: options.to, subject: options.subject },
      "Email (dev log — SMTP not configured)",
    );
    logger.debug({ html: options.html }, "Email body");
    return;
  }

  try {
    const info = await transport.sendMail({
      from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
    logger.info(
      { messageId: info.messageId, to: options.to },
      "Email sent successfully via Brevo SMTP",
    );
  } catch (error) {
    logger.error({ error, to: options.to }, "Failed to send email via Brevo SMTP");
    // Non-blocking: do not throw — email failures should not break flows
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderEmailLayout(title: string, contentHtml: string, subtitle?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title}</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; -webkit-font-smoothing: antialiased;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
              <!-- Top Accent Bar (Light Blue) -->
              <tr>
                <td style="background-color: #3b82f6; height: 4px; font-size: 0; line-height: 0;">&nbsp;</td>
              </tr>
              <!-- Header -->
              <tr>
                <td style="padding: 28px 32px 20px; border-bottom: 1px solid #f1f5f9;">
                  <h1 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.3px;">
                    ${title}
                  </h1>
                  ${subtitle ? `<p style="margin: 4px 0 0; color: #64748b; font-size: 13px; font-weight: 500;">${subtitle}</p>` : ""}
                </td>
              </tr>
              <!-- Body -->
              <tr>
                <td style="padding: 28px 32px; font-size: 15px; line-height: 1.6; color: #334155;">
                  ${contentHtml}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 32px; background-color: #f8fafc; border-top: 1px solid #f1f5f9; text-align: center; color: #94a3b8; font-size: 12px; line-height: 1.5;">
                  <p style="margin: 0 0 4px; font-weight: 600; color: #64748b;">Khademni Recruitment</p>
                  <p style="margin: 0;">Automated email. Please do not reply directly to this message.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

// ────────────────────────────────────────────────────────────────
// Email Templates
// ────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  fullName: string,
  token: string,
  organizationName?: string,
): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  const safeFullName = escapeHtml(fullName);
  const safeOrgName = organizationName ? escapeHtml(organizationName) : undefined;
  const headerSubtitle = safeOrgName ? `${safeOrgName} Portal` : "Account Verification";

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>Please verify your email address to activate your account and access the recruitment portal:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Verify Email Address</a>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Link expires in 24 hours. Or copy this URL: <br><a href="${verifyUrl}" style="color: #3b82f6; word-break: break-all;">${verifyUrl}</a></p>
  `;

  await sendEmail({
    to,
    subject: safeOrgName
      ? `Verify your email — ${safeOrgName}`
      : "Verify your email — Intelligent Teacher Recruitment Platform",
    html: renderEmailLayout("Email Verification", content, headerSubtitle),
  });
}

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  token: string,
): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  const safeFullName = escapeHtml(fullName);

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>We received a request to reset your password. Click below to set a new password:</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${resetUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Reset Password</a>
    </div>
    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Link expires in 1 hour. If you didn't request this, you can ignore this email. <br><a href="${resetUrl}" style="color: #3b82f6; word-break: break-all;">${resetUrl}</a></p>
  `;

  await sendEmail({
    to,
    subject: "Password Reset — Intelligent Teacher Recruitment Platform",
    html: renderEmailLayout("Password Reset", content, "Account Security"),
  });
}

export async function sendWelcomeEmail(
  to: string,
  fullName: string,
  organizationName?: string,
): Promise<void> {
  const safeFullName = escapeHtml(fullName);
  const safeOrgName = organizationName ? escapeHtml(organizationName) : undefined;
  const headerSubtitle = safeOrgName ? `Welcome to ${safeOrgName}` : "Account Activated";
  const orgMsg = safeOrgName ? ` to <strong>${safeOrgName}</strong>'s recruitment portal` : "";

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>Your email has been verified successfully. Welcome${orgMsg}! You can now sign in and start exploring job opportunities or managing your recruitment workflow.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${env.FRONTEND_URL}/login" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Sign In to Dashboard</a>
    </div>
  `;

  await sendEmail({
    to,
    subject: safeOrgName
      ? `Welcome to ${safeOrgName}!`
      : "Welcome to the Intelligent Teacher Recruitment Platform!",
    html: renderEmailLayout("Welcome!", content, headerSubtitle),
  });
}

export async function sendApplicationStatusEmail(
  to: string,
  fullName: string,
  trackingCode: string,
  jobTitle: string,
  newStatus: string,
  organizationName?: string,
  reason?: string,
): Promise<void> {
  const statusLabels: Record<string, string> = {
    UNDER_REVIEW: "Under Review",
    SHORTLISTED: "Shortlisted",
    ACCEPTED: "Accepted",
    REJECTED: "Not Selected",
    WITHDRAWN: "Withdrawn",
  };

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    ACCEPTED: { bg: "#f0fdf4", text: "#166534", border: "#bbf7d0" },
    SHORTLISTED: { bg: "#eff6ff", text: "#1e40af", border: "#bfdbfe" },
    UNDER_REVIEW: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
    REJECTED: { bg: "#fff1f2", text: "#9f1239", border: "#fecdd3" },
    WITHDRAWN: { bg: "#f8fafc", text: "#475569", border: "#e2e8f0" },
  };

  const label = statusLabels[newStatus] || newStatus;
  const badgeStyle = statusColors[newStatus] || { bg: "#f8fafc", text: "#334155", border: "#e2e8f0" };

  const safeFullName = escapeHtml(fullName);
  const safeTracking = escapeHtml(trackingCode);
  const safeTitle = escapeHtml(jobTitle);
  const safeOrgName = organizationName ? escapeHtml(organizationName) : undefined;
  const safeReason = reason ? escapeHtml(reason) : undefined;

  const orgSuffix = safeOrgName ? ` (${safeOrgName})` : "";
  const headerSubtitle = safeOrgName ? safeOrgName : "Candidate Update";

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>Your application <strong>${safeTracking}</strong> for the position <strong>"${safeTitle}"</strong> has been updated:</p>

    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${safeOrgName ? `
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 13px;">Institution:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${safeOrgName}</td>
        </tr>` : ""}
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 13px;">Tracking Code:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-size: 13px; font-family: monospace; text-align: right;">${safeTracking}</td>
        </tr>
        <tr>
          <td style="color: #64748b; font-size: 13px;">Status:</td>
          <td style="text-align: right;">
            <span style="display: inline-block; background-color: ${badgeStyle.bg}; color: ${badgeStyle.text}; border: 1px solid ${badgeStyle.border}; font-weight: 600; padding: 4px 12px; border-radius: 12px; font-size: 13px;">
              ${label}
            </span>
          </td>
        </tr>
      </table>
      ${safeReason ? `
        <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 13px;">
          <strong>Reason:</strong> ${safeReason}
        </div>
      ` : ""}
    </div>

    <div style="text-align: center; margin-top: 24px;">
      <a href="${env.FRONTEND_URL}/applications" style="display: inline-block; background-color: #3b82f6; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">View Application Details</a>
    </div>
  `;

  await sendEmail({
    to,
    subject: `Application Update: ${label} — ${safeTitle}${orgSuffix}`,
    html: renderEmailLayout("Application Status Update", content, headerSubtitle),
  });
}

export async function sendInterviewInvitationEmail(options: {
  to: string;
  fullName: string;
  jobTitle: string;
  interviewType: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  timezone: string;
  meetingUrl?: string;
  locationDetails?: string;
  organizationName?: string;
  icsContent: string;
  googleCalendarUrl?: string;
  outlookCalendarUrl?: string;
}): Promise<void> {
  const safeFullName = escapeHtml(options.fullName);
  const safeJobTitle = escapeHtml(options.jobTitle);
  const safeOrgName = options.organizationName ? escapeHtml(options.organizationName) : undefined;
  const safeTime = `${escapeHtml(options.startTimeFormatted)} - ${escapeHtml(options.endTimeFormatted)} (${escapeHtml(options.timezone)})`;
  const safeLocation = options.locationDetails ? escapeHtml(options.locationDetails) : undefined;

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>You have been scheduled for a <strong>${escapeHtml(options.interviewType)}</strong> interview for the position <strong>"${safeJobTitle}"</strong>.</p>
    
    <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        ${safeOrgName ? `
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 13px;">Organization:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-size: 14px; font-weight: 600; text-align: right;">${safeOrgName}</td>
        </tr>` : ""}
        <tr>
          <td style="padding-bottom: 8px; color: #64748b; font-size: 13px;">Date & Time:</td>
          <td style="padding-bottom: 8px; color: #0f172a; font-size: 13px; font-weight: 600; text-align: right;">${safeTime}</td>
        </tr>
        ${options.meetingUrl ? `
        <tr>
          <td style="color: #64748b; font-size: 13px;">Video Meeting:</td>
          <td style="text-align: right;">
            <a href="${options.meetingUrl}" style="color: #2563eb; font-weight: 600; text-decoration: underline;">Join Video Call</a>
          </td>
        </tr>` : ""}
        ${safeLocation ? `
        <tr>
          <td style="color: #64748b; font-size: 13px;">Location:</td>
          <td style="color: #0f172a; font-size: 13px; text-align: right;">${safeLocation}</td>
        </tr>` : ""}
      </table>
    </div>

    <div style="text-align: center; margin: 24px 0; display: flex; gap: 12px; justify-content: center;">
      ${options.meetingUrl ? `
        <a href="${options.meetingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Join Meeting Now</a>
      ` : ""}
      ${options.googleCalendarUrl ? `
        <a href="${options.googleCalendarUrl}" target="_blank" style="display: inline-block; background-color: #ffffff; color: #2563eb; border: 1px solid #bfdbfe; font-weight: 600; text-decoration: none; padding: 12px 18px; border-radius: 6px; font-size: 13px;">+ Add to Google Calendar</a>
      ` : ""}
    </div>

    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">An iCal calendar invite file (<code>interview.ics</code>) is attached to this email so you can import this event into Apple Calendar, Outlook, or Google Calendar.</p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Interview Scheduled: ${options.interviewType} — ${safeJobTitle}`,
    html: renderEmailLayout("Interview Invitation", content, safeOrgName || "Recruitment Schedule"),
    attachments: [
      {
        filename: "interview.ics",
        content: options.icsContent,
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });
}

export async function sendInterviewRescheduledEmail(options: {
  to: string;
  fullName: string;
  jobTitle: string;
  newStartTimeFormatted: string;
  newEndTimeFormatted: string;
  timezone: string;
  reason?: string;
  meetingUrl?: string;
  organizationName?: string;
  icsContent: string;
}): Promise<void> {
  const safeFullName = escapeHtml(options.fullName);
  const safeJobTitle = escapeHtml(options.jobTitle);
  const safeTime = `${escapeHtml(options.newStartTimeFormatted)} - ${escapeHtml(options.newEndTimeFormatted)} (${escapeHtml(options.timezone)})`;
  const safeReason = options.reason ? escapeHtml(options.reason) : undefined;

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>Your upcoming interview for <strong>"${safeJobTitle}"</strong> has been rescheduled.</p>
    
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0 0 8px; color: #1e40af; font-size: 14px; font-weight: 600;">New Time:</p>
      <p style="margin: 0; color: #1e3a8a; font-size: 15px; font-weight: 700;">${safeTime}</p>
      ${safeReason ? `<p style="margin: 12px 0 0; color: #3b82f6; font-size: 13px;"><strong>Reason:</strong> ${safeReason}</p>` : ""}
    </div>

    ${options.meetingUrl ? `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${options.meetingUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-weight: 600; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px;">Join Meeting Link</a>
    </div>` : ""}

    <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">An updated calendar event file (<code>interview-update.ics</code>) is attached to update your personal calendar.</p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Interview Rescheduled: ${safeJobTitle}`,
    html: renderEmailLayout("Interview Rescheduled", content, options.organizationName || "Recruitment Schedule"),
    attachments: [
      {
        filename: "interview-update.ics",
        content: options.icsContent,
        contentType: "text/calendar; method=REQUEST",
      },
    ],
  });
}

export async function sendInterviewCancelledEmail(options: {
  to: string;
  fullName: string;
  jobTitle: string;
  reason: string;
  organizationName?: string;
  icsContent?: string;
}): Promise<void> {
  const safeFullName = escapeHtml(options.fullName);
  const safeJobTitle = escapeHtml(options.jobTitle);
  const safeReason = escapeHtml(options.reason);

  const content = `
    <p style="margin-top: 0;">Hello <strong>${safeFullName}</strong>,</p>
    <p>Please note that your scheduled interview for the position <strong>"${safeJobTitle}"</strong> has been cancelled.</p>
    
    <div style="background-color: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; padding: 16px; margin: 20px 0;">
      <p style="margin: 0; color: #9f1239; font-size: 14px;"><strong>Reason for Cancellation:</strong> ${safeReason}</p>
    </div>

    <p style="font-size: 13px; color: #64748b;">If you have any questions regarding your application status, please reach out via the recruitment portal.</p>
  `;

  await sendEmail({
    to: options.to,
    subject: `Interview Cancelled: ${safeJobTitle}`,
    html: renderEmailLayout("Interview Cancellation", content, options.organizationName || "Recruitment Schedule"),
    attachments: options.icsContent
      ? [
          {
            filename: "interview-cancel.ics",
            content: options.icsContent,
            contentType: "text/calendar; method=CANCEL",
          },
        ]
      : undefined,
  });
}





