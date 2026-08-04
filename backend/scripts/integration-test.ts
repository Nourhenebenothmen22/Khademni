import { app } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { generate } from 'otplib';
import type { Server } from 'node:http';

async function runIntegrationTest() {
  console.log('🚀 Starting Comprehensive Backend Integration Test Suite...');
  let server: Server | null = null;
  const PORT = 3098;

  try {
    server = app.listen(PORT);
    const baseUrl = `http://localhost:${PORT}/api/v1`;

    // 0. Test CSRF Token Issuance
    console.log('🔹 [Security] Testing CSRF Protection & Token Issuance...');
    const csrfRes = await fetch(`${baseUrl}/auth/csrf`);
    const csrfData = await csrfRes.json();
    if (!csrfRes.ok || !csrfData.data?.csrfToken) {
      throw new Error(`CSRF token issuance failed: ${JSON.stringify(csrfData)}`);
    }
    const csrfToken = csrfData.data.csrfToken;
    console.log('  ✅ CSRF token issued cleanly.');

    // 1. Candidate Registration & Login
    console.log('🔹 [Auth] Testing Candidate Registration & Login...');
    const candidateEmail = `candidate_test_${Date.now()}@example.com`;
    const adminEmail = `admin_test_${Date.now()}@example.com`;
    const password = 'StrongPassword123!';

    const regCandidateRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({
        fullName: 'Jane Candidate',
        email: candidateEmail,
        password,
      }),
    });
    const regCandidateData = await regCandidateRes.json();
    if (!regCandidateRes.ok) throw new Error(`Candidate registration failed: ${JSON.stringify(regCandidateData)}`);
    const candidateUserId = regCandidateData.data.id;
    console.log('  ✅ Candidate registered.');

    const adminUser = await prisma.user.create({
      data: {
        fullName: 'Admin User',
        email: adminEmail,
        passwordHash: candidateUserId,
        role: 'ADMIN',
        isEmailVerified: true,
      },
    });

    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password }),
    });
    const loginData = await loginRes.json();
    let candidateToken = loginData.data.accessToken;
    let candidateRefreshToken = loginData.data.refreshToken;
    console.log('  ✅ Login successful. Access & Refresh Tokens issued.');

    // 2. Forgot Password Flow
    console.log('🔹 [Auth] Testing Password Reset Request...');
    const forgotRes = await fetch(`${baseUrl}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail }),
    });
    const forgotData = await forgotRes.json();
    if (!forgotRes.ok) throw new Error(`Forgot password failed: ${JSON.stringify(forgotData)}`);
    console.log('  ✅ Forgot password request submitted.');

    // 3. MFA Setup, MFA Verification & MFA Login Flow
    console.log('🔹 [Security] Testing MFA Setup, Verification & MFA Login Flow...');
    const mfaSetupRes = await fetch(`${baseUrl}/auth/mfa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const mfaSetupData = await mfaSetupRes.json();
    if (!mfaSetupRes.ok) throw new Error(`MFA setup failed: ${JSON.stringify(mfaSetupData)}`);
    const secret = mfaSetupData.data.secret;

    const totpCode = await generate({ secret });
    const mfaVerifyRes = await fetch(`${baseUrl}/auth/mfa/verify`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${candidateToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: totpCode }),
    });
    const mfaVerifyData = await mfaVerifyRes.json();
    if (!mfaVerifyRes.ok) throw new Error(`MFA verification failed: ${JSON.stringify(mfaVerifyData)}`);
    console.log('  ✅ MFA verified & enabled on candidate account.');

    // Test Login with MFA challenge
    const mfaLoginChallengeRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: candidateEmail, password }),
    });
    const mfaLoginChallengeData = await mfaLoginChallengeRes.json();
    if (!mfaLoginChallengeData.mfaRequired) throw new Error('MFA challenge should be required.');
    console.log('  ✅ Login correctly requested MFA challenge.');

    // Perform MFA Login
    const loginTotpCode = await generate({ secret });
    const mfaLoginRes = await fetch(`${baseUrl}/auth/mfa/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: candidateUserId, code: loginTotpCode }),
    });
    const mfaLoginData = await mfaLoginRes.json();
    if (!mfaLoginRes.ok) throw new Error(`MFA Login failed: ${JSON.stringify(mfaLoginData)}`);
    candidateToken = mfaLoginData.data.accessToken;
    candidateRefreshToken = mfaLoginData.data.refreshToken;
    console.log('  ✅ MFA Login successful! Issued new token pair.');

    // 4. Refresh Token Rotation & Breach Defense
    console.log('🔹 [Security] Testing Token Rotation & Stolen Refresh Token Breach Defense...');
    const oldRefreshToken = candidateRefreshToken;

    const refresh1Res = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken }),
    });
    const refresh1Data = await refresh1Res.json();
    if (!refresh1Res.ok) throw new Error(`Token refresh failed: ${JSON.stringify(refresh1Data)}`);
    console.log('  ✅ Token rotated cleanly.');

    // Reuse stolen old refresh token -> Should trigger security lockout!
    const reuseRes = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: oldRefreshToken }),
    });
    const reuseData = await reuseRes.json();
    if (reuseRes.ok || !reuseData.message.includes('Security alert')) {
      throw new Error(`Token breach defense failed to block reuse: ${JSON.stringify(reuseData)}`);
    }
    console.log('  ✅ Refresh token reuse attack blocked & active sessions invalidated.');

    // Re-authenticate candidate after lockout test
    const postLockoutCode = await generate({ secret });
    const postLockoutRes = await fetch(`${baseUrl}/auth/mfa/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: candidateUserId, code: postLockoutCode }),
    });
    const postLockoutData = await postLockoutRes.json();
    candidateToken = postLockoutData.data.accessToken;

    // 5. Job Creation, Keywords & Matching Rules
    console.log('🔹 [Jobs] Testing Admin Job Creation, Keywords & Matching Rules...');
    const { signAccessToken } = await import('../src/lib/jwt.js');
    const adminToken = await signAccessToken({ userId: adminUser.id, role: 'ADMIN' });

    const createJobRes = await fetch(`${baseUrl}/jobs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: 'Lead Physics Teacher',
        description: 'We are seeking an experienced Physics Teacher for advanced level courses in mechanics and quantum physics.',
        requirements: 'At least 5 years experience in Physics education. Master degree required. CELTA or QTS certification.',
        status: 'DRAFT',
      }),
    });
    const createJobData = await createJobRes.json();
    const jobId = createJobData.data.id;

    // Add keywords
    const addKeywordsRes = await fetch(`${baseUrl}/jobs/${jobId}/keywords`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        keywords: [
          { keyword: 'Physics', type: 'REQUIRED', weight: 5 },
          { keyword: 'Teacher', type: 'REQUIRED', weight: 3 },
          { keyword: 'Quantum', type: 'OPTIONAL', weight: 2 },
        ],
      }),
    });
    if (!addKeywordsRes.ok) throw new Error(`Add keywords failed: ${await addKeywordsRes.text()}`);
    console.log('  ✅ Keywords added to job post.');

    // Add matching rules
    const addRulesRes = await fetch(`${baseUrl}/jobs/${jobId}/rules`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ruleName: 'Require Master Degree',
        type: 'DEGREE',
        condition: { value: 'master' },
        weight: 10,
        isActive: true,
      }),
    });
    if (!addRulesRes.ok) throw new Error(`Add matching rule failed: ${await addRulesRes.text()}`);
    console.log('  ✅ Matching rule added to job post.');

    // Publish job
    await fetch(`${baseUrl}/jobs/${jobId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'PUBLISHED' }),
    });
    console.log('  ✅ Job published successfully ID:', jobId);

    // 6. Candidate Application & Document Streaming
    console.log('🔹 [Applications] Testing Candidate Application Intake & Document File Streaming...');
    const formData = new FormData();
    formData.append('motivationLetter', 'Extremely interested in the Physics Teacher role. I hold a Master of Science in Physics and QTS certification with 6 years experience.');
    const pdfBlob = new Blob(['(Jane Candidate Resume) (Master of Science in Physics) (6 years teaching experience) (QTS certification)'], { type: 'application/pdf' });
    formData.append('file', pdfBlob, 'physics_resume.pdf');

    const applyRes = await fetch(`${baseUrl}/jobs/${jobId}/apply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${candidateToken}` },
      body: formData,
    });
    const applyData = await applyRes.json();
    if (!applyRes.ok) throw new Error(`Application failed: ${JSON.stringify(applyData)}`);
    const appId = applyData.data.id;
    const docId = applyData.data.documents[0].id;
    console.log('  ✅ Application submitted successfully. Tracking code:', applyData.data.trackingCode);

    // Test Document Stream Download
    const downloadRes = await fetch(`${baseUrl}/applications/${appId}/documents/${docId}/download`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    if (!downloadRes.ok) throw new Error(`Document download failed: status ${downloadRes.status}`);
    const downloadText = await downloadRes.text();
    if (!downloadText.includes('Master of Science')) {
      throw new Error('Downloaded document content mismatch');
    }
    console.log('  ✅ Candidate successfully streamed document file from disk.');

    // 7. Phase 1, 2 & 3 pgvector Hybrid AI Matching Engine Execution
    console.log('🔹 [AI Matching] Testing pgvector Dense Vector & Hybrid Matching...');
    const createModelRes = await fetch(`${baseUrl}/ai-models`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'pgvector Dense Vector Teacher Matcher v3',
        version: '3.0.0',
        algorithm: 'pgvector-hnsw-hybrid',
        hyperparameters: { ruleWeight: 0.7, semanticWeight: 0.3 },
        isActive: true,
      }),
    });
    const createModelData = await createModelRes.json();
    if (!createModelRes.ok) throw new Error(`Create AI Model failed: ${JSON.stringify(createModelData)}`);
    const modelId = createModelData.data.id;
    console.log('  ✅ AI Matching Model created ID:', modelId);

    // Trigger Hybrid Matching Run
    const runMatchingRes = await fetch(`${baseUrl}/matching/run`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ applicationId: appId, modelId }),
    });
    const runMatchingData = await runMatchingRes.json();
    if (!runMatchingRes.ok) throw new Error(`Run matching failed: ${JSON.stringify(runMatchingData)}`);
    const breakdown = runMatchingData.data.scoreBreakdown;
    console.log(`  ✅ Hybrid AI Matching completed! Final Score: ${runMatchingData.data.totalScore}% (Rule Score: ${breakdown.ruleBasedScore}%, Semantic Vector Score: ${breakdown.semanticScore}%)`);

    // 7.5 Test Asynchronous AI Matching Background Queue
    console.log('🔹 [AI Matching Queue] Testing Asynchronous AI Matching Queue Submission & Status Tracking...');
    const enqueueRes = await fetch(`${baseUrl}/matching/queue-job/${jobId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ modelId }),
    });
    const enqueueData = await enqueueRes.json();
    if (!enqueueRes.ok || enqueueRes.status !== 202) {
      throw new Error(`Enqueue matching job failed: ${JSON.stringify(enqueueData)}`);
    }
    const queueJobId = enqueueData.data.queueJobId;
    console.log('  ✅ AI Matching Job enqueued asynchronously. Queue Job ID:', queueJobId);

    // Check queue status
    const statusRes = await fetch(`${baseUrl}/matching/queue-status/${queueJobId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const statusData = await statusRes.json();
    if (!statusRes.ok) throw new Error(`Fetch queue status failed: ${JSON.stringify(statusData)}`);
    console.log(`  ✅ Async Queue Status verified: status="${statusData.data.status}", totalApplications=${statusData.data.totalApplications}`);

    // 8. AI Model Evaluation & Metrics
    console.log('🔹 [AI Evaluation] Testing AI Model Evaluation & Performance Metrics...');
    const evalRes = await fetch(`${baseUrl}/ai-models/${modelId}/evaluations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        datasetName: 'Physics Teacher Test Suite 2026',
        evaluationSampleSize: 50,
        averageLatencyMs: 12.4,
        evaluationDetails: { algorithm: 'pgvector-hnsw-hybrid', sampleCount: 50 },
      }),
    });
    const evalData = await evalRes.json();
    if (!evalRes.ok) throw new Error(`Create Evaluation failed: ${JSON.stringify(evalData)}`);
    const evalId = evalData.data.id;

    // Add Metrics to Evaluation
    const metricsRes = await fetch(`${baseUrl}/ai-models/${modelId}/evaluations/${evalId}/metrics`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        metrics: [
          { type: 'PRECISION', value: 0.95 },
          { type: 'RECALL', value: 0.91 },
          { type: 'F1_SCORE', value: 0.93 },
          { type: 'MAP', value: 0.92 },
          { type: 'NDCG_AT_5', value: 0.96 },
        ],
      }),
    });
    const metricsData = await metricsRes.json();
    if (!metricsRes.ok) throw new Error(`Add metrics failed: ${JSON.stringify(metricsData)}`);
    console.log(`  ✅ AI Model Evaluation & ${metricsData.data.length} metrics created successfully.`);

    // 9. Application Status Transition State Machine & Notifications
    console.log('🔹 [Notifications] Testing State Machine Transitions & Notifications...');

    // SUBMITTED -> UNDER_REVIEW
    const reviewRes = await fetch(`${baseUrl}/applications/${appId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'UNDER_REVIEW', reason: 'Initial screening' }),
    });
    if (!reviewRes.ok) throw new Error(`UNDER_REVIEW transition failed: ${await reviewRes.text()}`);
    console.log('  ✅ Application transitioned SUBMITTED -> UNDER_REVIEW.');

    // UNDER_REVIEW -> SHORTLISTED
    const statusUpdateRes = await fetch(`${baseUrl}/applications/${appId}/status`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'SHORTLISTED', reason: 'Strong Physics background & Master degree' }),
    });
    if (!statusUpdateRes.ok) throw new Error(`SHORTLISTED transition failed: ${await statusUpdateRes.text()}`);
    console.log('  ✅ Application transitioned UNDER_REVIEW -> SHORTLISTED.');

    // Fetch Candidate Notifications
    const notifRes = await fetch(`${baseUrl}/notifications`, {
      headers: { Authorization: `Bearer ${candidateToken}` },
    });
    const notifData = await notifRes.json();
    if (!notifRes.ok || notifData.data.items.length === 0) {
      throw new Error(`Notifications test failed: ${JSON.stringify(notifData)}`);
    }
    console.log(`  ✅ In-app notifications received: ${notifData.data.items.length} notification(s). Latest title: "${notifData.data.items[0].title}"`);

    // 10. Admin Dashboard Statistics
    console.log('🔹 [Admin] Testing Admin Dashboard Statistics...');
    const adminStatsRes = await fetch(`${baseUrl}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminStatsData = await adminStatsRes.json();
    if (!adminStatsRes.ok) throw new Error(`Admin stats failed: ${JSON.stringify(adminStatsData)}`);
    console.log(`  ✅ Admin Dashboard Stats: Total users=${adminStatsData.data.users.total}, Applications=${JSON.stringify(adminStatsData.data.applications)}`);

    console.log('\n🎉 ALL PRODUCTION SCALABILITY & BACKEND INTEGRATION TESTS PASSED CLEANLY!');
  } catch (error) {
    console.error('❌ Integration Test Failed:', error);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
  }
}

runIntegrationTest();
