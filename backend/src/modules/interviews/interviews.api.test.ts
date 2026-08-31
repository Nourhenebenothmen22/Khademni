import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";

vi.mock("../../lib/email.js", () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
  sendApplicationStatusEmail: vi.fn().mockResolvedValue(true),
  sendInterviewInviteEmail: vi.fn().mockResolvedValue(true),
  sendInterviewReminderEmail: vi.fn().mockResolvedValue(true),
  sendInterviewInvitationEmail: vi.fn().mockResolvedValue(true),
  sendInterviewRescheduledEmail: vi.fn().mockResolvedValue(true),
  sendInterviewCancelledEmail: vi.fn().mockResolvedValue(true),
  sendTwoFactorTokenEmail: vi.fn().mockResolvedValue(true),
  sendJobAlertEmail: vi.fn().mockResolvedValue(true),
  sendEmailWithRetry: vi.fn().mockResolvedValue({ messageId: "mock-id" }),
}));

import { app } from "../../app.js";
import { prisma } from "../../lib/prisma.js";
import { signAccessToken } from "../../lib/jwt.js";

describe("Interviews & Scorecards API Integration Tests", () => {
  let adminToken: string;
  let candidateToken: string;
  let orgId: string;
  let adminUserId: string;
  let candidateUserId: string;
  let jobId: string;
  let applicationId: string;
  let interviewId: string;
  let csrfToken: string;
  let csrfCookie: string;

  beforeAll(async () => {
    // 1. Fetch CSRF token & cookie
    const csrfRes = await request(app)
      .get("/api/v1/auth/csrf")
      .set("Origin", "http://localhost:3001");
    csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers["set-cookie"] as unknown as string[];
    csrfCookie = Array.isArray(cookies) ? cookies.join("; ") : cookies;

    // 2. Create organization
    const org = await prisma.organization.create({
      data: {
        name: `Interviews Org ${Date.now()}`,
        slug: `interviews-org-${Date.now()}`,
      },
    });
    orgId = org.id;

    // 3. Create Admin & Candidate
    const admin = await prisma.user.create({
      data: {
        email: `admin_iv_${Date.now()}@example.com`,
        passwordHash: "argon2-hash",
        fullName: "Interview Lead Admin",
        role: "ORGANIZATION_ADMIN",
        organizationId: orgId,
      },
    });
    adminUserId = admin.id;

    const candidate = await prisma.user.create({
      data: {
        email: `cand_iv_${Date.now()}@example.com`,
        passwordHash: "argon2-hash",
        fullName: "Teacher Candidate Jane",
        role: "CANDIDATE",
      },
    });
    candidateUserId = candidate.id;

    // 4. Create Job & Application
    const job = await prisma.jobPost.create({
      data: {
        title: "Science Educator",
        description: "High school physics teacher for AP level coursework and laboratory experiments.",
        requirements: "Bachelor or Master Degree in Physics or STEM Education.",
        organizationId: orgId,
        createdById: adminUserId,
        status: "PUBLISHED",
      },
    });
    jobId = job.id;

    const application = await prisma.application.create({
      data: {
        candidateId: candidate.id,
        jobPostId: job.id,
        status: "SHORTLISTED",
        trackingCode: `TRK-${Date.now()}`,
      },
    });
    applicationId = application.id;

    adminToken = await signAccessToken({
      userId: adminUserId,
      role: "ORGANIZATION_ADMIN",
      organizationId: orgId,
    });

    candidateToken = await signAccessToken({
      userId: candidateUserId,
      role: "CANDIDATE",
    });
  }, 60000);

  afterAll(async () => {
    try {
      if (interviewId) {
        await prisma.scorecardCriteriaScore.deleteMany({ where: { scorecard: { interviewId } } }).catch(() => {});
        await prisma.interviewScorecard.deleteMany({ where: { interviewId } }).catch(() => {});
        await prisma.interviewerAssignment.deleteMany({ where: { interviewId } }).catch(() => {});
        await prisma.interview.delete({ where: { id: interviewId } }).catch(() => {});
      }
      if (applicationId) {
        await prisma.applicationStatusHistory.deleteMany({ where: { applicationId } }).catch(() => {});
        await prisma.application.delete({ where: { id: applicationId } }).catch(() => {});
      }
      if (jobId) await prisma.jobPost.delete({ where: { id: jobId } }).catch(() => {});
      if (adminUserId) await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
      if (candidateUserId) await prisma.user.delete({ where: { id: candidateUserId } }).catch(() => {});
      if (orgId) await prisma.organization.delete({ where: { id: orgId } }).catch(() => {});
    } catch {
      // Ignored
    }
  }, 90000);

  it("POST /api/v1/interviews — should schedule an interview with video conferencing link", async () => {
    const startTime = new Date(Date.now() + 86400000).toISOString();
    const endTime = new Date(Date.now() + 86400000 + 3600000).toISOString();

    const res = await request(app)
      .post("/api/v1/interviews")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        applicationId,
        title: "Technical Teaching Demonstration",
        type: "TECHNICAL",
        startTime,
        endTime,
        interviewerIds: [adminUserId],
        meetingProvider: "CUSTOM_LINK",
        customMeetingUrl: "https://meet.google.com/abc-defg-hij",
        description: "Prepare a 15-minute mock lesson on Newton's Laws.",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.type).toBe("TECHNICAL");
    expect(res.body.data.meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
    interviewId = res.body.data.id;
  }, 45000);

  it("GET /api/v1/interviews/me — candidate can view their upcoming interviews", async () => {
    expect(interviewId).toBeDefined();
    const res = await request(app)
      .get("/api/v1/interviews/me")
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].id).toBe(interviewId);
  }, 45000);

  it("POST /api/v1/interviews/:id/scorecards — should submit multi-criteria evaluation scorecard", async () => {
    expect(interviewId).toBeDefined();
    const res = await request(app)
      .post(`/api/v1/interviews/${interviewId}/scorecards`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`)
      .set("X-CSRF-Token", csrfToken)
      .set("Cookie", csrfCookie)
      .send({
        recommendation: "STRONG_HIRE",
        overallNotes: "Outstanding pedagogical delivery, clear whiteboard breakdown, strong student engagement skills.",
        criteriaScores: [
          { category: "Subject Knowledge", criterion: "Physics Mastery", score: 5, comment: "Mastery of Newtonian physics" },
          { category: "Pedagogy", criterion: "Classroom Management", score: 4, comment: "Keeps students focused" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.recommendation).toBe("STRONG_HIRE");
  }, 45000);

  it("GET /api/v1/interviews/:id/calendar.ics — should download standard iCalendar .ics invitation", async () => {
    expect(interviewId).toBeDefined();
    const res = await request(app)
      .get(`/api/v1/interviews/${interviewId}/calendar.ics`)
      .set("Origin", "http://localhost:3001")
      .set("Authorization", `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/calendar");
    expect(res.text).toContain("BEGIN:VCALENDAR");
    expect(res.text).toContain("Science Educator");
    expect(res.text).toContain("END:VCALENDAR");
  }, 45000);
});
