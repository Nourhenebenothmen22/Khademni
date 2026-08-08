import http from 'k6/http';
import { check, sleep } from 'k6';

/**
 * k6 Load Test Script — Intelligent Teacher Recruitment Platform AI Module
 * Simulates concurrent candidate submissions and background AI matching runs.
 *
 * Usage:
 *   k6 run scripts/load-test.js
 */

export const options = {
  stages: [
    { duration: '10s', target: 20 },  // Ramp-up to 20 users
    { duration: '20s', target: 100 }, // Spike to 100 concurrent candidate applications
    { duration: '10s', target: 0 },   // Ramp-down to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],    // Less than 1% failed requests
    http_req_duration: ['p(95)<2000'], // 95% of requests complete in < 2000ms
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/api/v1';

export default function () {
  // 1. Fetch CSRF token
  const csrfRes = http.get(`${BASE_URL}/auth/csrf`);
  check(csrfRes, {
    'CSRF status 200': (r) => r.status === 200,
  });

  const csrfToken = csrfRes.json('data.csrfToken');
  const headers = {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken || '',
  };

  // 2. Candidate Registration
  const email = `k6_candidate_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const regPayload = JSON.stringify({
    fullName: 'k6 Test Teacher',
    email,
    password: 'Password123!',
  });

  const regRes = http.post(`${BASE_URL}/auth/register`, regPayload, { headers });
  check(regRes, {
    'Registration status 201': (r) => r.status === 201,
  });

  // 3. Login
  const loginPayload = JSON.stringify({ email, password: 'Password123!' });
  const loginRes = http.post(`${BASE_URL}/auth/login`, loginPayload, { headers });
  const token = loginRes.json('data.accessToken');

  check(loginRes, {
    'Login status 200': (r) => r.status === 200,
    'Has Access Token': () => token !== undefined,
  });

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // 4. Query Published Jobs
  const jobsRes = http.get(`${BASE_URL}/jobs?status=PUBLISHED`, { headers: authHeaders });
  check(jobsRes, {
    'Jobs status 200': (r) => r.status === 200,
  });

  sleep(1);
}
