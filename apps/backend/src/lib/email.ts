import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

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
}

async function sendEmail(options: EmailOptions): Promise<void> {
  const transport = getTransporter();
  const from = env.SMTP_FROM;

  if (!transport) {
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
    });
    logger.info(
      { messageId: info.messageId, to: options.to },
      "Email sent successfully",
    );
  } catch (error) {
    logger.error({ error, to: options.to }, "Failed to send email");
    // Non-blocking: do not throw — email failures should not break flows
  }
}

// ────────────────────────────────────────────────────────────────
// Email Templates
// ────────────────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  fullName: string,
  token: string,
): Promise<void> {
  const verifyUrl = `${env.FRONTEND_URL}/verify-email?token=${token}`;
  await sendEmail({
    to,
    subject: "Verify your email — Intelligent Teacher Recruitment Platform",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a73e8;">Email Verification</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0;">Verify Email</a>
        <p style="color:#666;font-size:14px;">Or copy this link: <code>${verifyUrl}</code></p>
        <p style="color:#666;font-size:12px;">This link expires in 24 hours.</p>
      </div>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  fullName: string,
  token: string,
): Promise<void> {
  const resetUrl = `${env.FRONTEND_URL}/reset-password?token=${token}`;
  await sendEmail({
    to,
    subject: "Password Reset — Intelligent Teacher Recruitment Platform",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a73e8;">Password Reset</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>We received a request to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#e8471a;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0;">Reset Password</a>
        <p style="color:#666;font-size:14px;">Or copy this link: <code>${resetUrl}</code></p>
        <p style="color:#666;font-size:12px;">This link expires in 1 hour. If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}

export async function sendWelcomeEmail(
  to: string,
  fullName: string,
): Promise<void> {
  await sendEmail({
    to,
    subject:
      "Welcome to the Intelligent Teacher Recruitment Platform!",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a73e8;">Welcome!</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your email has been verified successfully. You can now sign in and start exploring job opportunities or managing your recruitment workflow.</p>
        <a href="${env.FRONTEND_URL}/login" style="display:inline-block;padding:12px 24px;background:#1a73e8;color:#fff;text-decoration:none;border-radius:4px;margin:16px 0;">Sign In</a>
      </div>
    `,
  });
}

export async function sendApplicationStatusEmail(
  to: string,
  fullName: string,
  trackingCode: string,
  jobTitle: string,
  newStatus: string,
  reason?: string,
): Promise<void> {
  const statusLabels: Record<string, string> = {
    UNDER_REVIEW: "Under Review",
    SHORTLISTED: "Shortlisted",
    ACCEPTED: "Accepted",
    REJECTED: "Not Selected",
    WITHDRAWN: "Withdrawn",
  };

  const label = statusLabels[newStatus] || newStatus;

  await sendEmail({
    to,
    subject: `Application Update: ${label} — ${jobTitle}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
        <h2 style="color:#1a73e8;">Application Status Update</h2>
        <p>Hello <strong>${fullName}</strong>,</p>
        <p>Your application <strong>${trackingCode}</strong> for the position <strong>"${jobTitle}"</strong> has been updated:</p>
        <p style="font-size:18px;font-weight:bold;color:#333;padding:8px 16px;background:#f1f3f4;border-radius:4px;display:inline-block;">${label}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
        <p style="color:#666;font-size:14px;">Log in to your account to view full details.</p>
      </div>
    `,
  });
}
