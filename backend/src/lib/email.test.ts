import { describe, it, expect, vi, beforeEach } from "vitest";
import nodemailer from "nodemailer";
import { env } from "../config/env.js";

const mockSendMail = vi.fn().mockResolvedValue({ messageId: "test-msg-123" });

vi.mock("nodemailer", () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

import {
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendApplicationStatusEmail,
} from "./email.js";

describe("Email Service & Tenant Templates", () => {
  beforeEach(() => {
    (env as any).SMTP_HOST = "smtp.test.com";
    mockSendMail.mockClear();
  });

  it("renders verification email with organization context when provided", async () => {
    await sendVerificationEmail(
      "test@example.com",
      "Jane <Doe>",
      "token123",
      "Khademni Education System & Academy",
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0]?.[0];
    expect(mailArgs?.to).toBe("test@example.com");
    expect(mailArgs?.subject).toBe("Verify your email — Khademni Education System &amp; Academy");
    expect(mailArgs?.html).toContain("Jane &lt;Doe&gt;");
    expect(mailArgs?.html).toContain("Khademni Education System &amp; Academy");
  });

  it("renders verification email with default platform title when organization is absent", async () => {
    await sendVerificationEmail("test@example.com", "Jane Doe", "token123");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0]?.[0];
    expect(mailArgs?.subject).toBe("Verify your email — Intelligent Teacher Recruitment Platform");
  });

  it("renders welcome email with organization context when provided", async () => {
    await sendWelcomeEmail("test@example.com", "John Smith", "Greenwood Academy");

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0]?.[0];
    expect(mailArgs?.subject).toBe("Welcome to Greenwood Academy!");
    expect(mailArgs?.html).toContain("to <strong>Greenwood Academy</strong>'s recruitment portal");
  });

  it("renders application status update email with organization context and escapes XSS input", async () => {
    await sendApplicationStatusEmail(
      "candidate@example.com",
      "Teacher <Applicant>",
      "APP-8899",
      "Physics & Math Instructor",
      "SHORTLISTED",
      "St. Jude's High School",
      "Strong background in AP Physics",
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0]?.[0];
    expect(mailArgs?.subject).toBe(
      "Application Update: Shortlisted — Physics &amp; Math Instructor (St. Jude&#039;s High School)",
    );
    expect(mailArgs?.html).toContain("Teacher &lt;Applicant&gt;");
    expect(mailArgs?.html).toContain("St. Jude&#039;s High School");
    expect(mailArgs?.html).toContain("Shortlisted");
    expect(mailArgs?.html).toContain("Strong background in AP Physics");
  });

  it("renders application status update email without organization context", async () => {
    await sendApplicationStatusEmail(
      "candidate@example.com",
      "Teacher Applicant",
      "APP-8899",
      "Physics Instructor",
      "ACCEPTED",
    );

    expect(mockSendMail).toHaveBeenCalledTimes(1);
    const mailArgs = mockSendMail.mock.calls[0]?.[0];
    expect(mailArgs?.subject).toBe("Application Update: Accepted — Physics Instructor");
    expect(mailArgs?.html).not.toContain("Institution:");
  });
});
