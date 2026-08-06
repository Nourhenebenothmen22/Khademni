import { registerUser, verifyEmail, loginUser } from "../src/modules/auth/auth.service.js";
import { prisma } from "../src/lib/prisma.js";

async function testUserFlow() {
  const testEmail = "benothmennourhene9@gmail.com";
  const password = "Password123!Secure";
  const fullName = "Nourhen Ben Othmen";

  console.log(`\n=== Testing Full Auth & Brevo Email Flow for ${testEmail} ===\n`);

  // 1. Cleanup previous test user if exists
  await prisma.user.deleteMany({
    where: { email: testEmail.toLowerCase() },
  });
  console.log("1. Cleaned up any existing user record with this email.");

  // 2. Register user
  console.log("2. Registering user and dispatching verification email via Brevo SMTP...");
  const regResult = await registerUser({
    fullName,
    email: testEmail,
    password,
  });

  console.log("✅ User registered successfully. User ID:", regResult.user.id);
  if (regResult.verificationToken) {
    console.log("🔑 Generated Verification Token (Dev):", regResult.verificationToken);

    // 3. Verify Email
    console.log("3. Verifying email token...");
    const verifyResult = await verifyEmail({ token: regResult.verificationToken });
    console.log("✅ Email verification result:", verifyResult.message);
  }

  // 4. Test Login
  console.log("4. Attempting Login with registered user credentials...");
  const loginResult = await loginUser(
    {
      email: testEmail,
      password,
    },
    "127.0.0.1",
    "Test-Agent-Browser",
  );

  console.log("✅ Login Successful!");
  console.log("   Access Token generated (first 20 chars):", loginResult.accessToken.substring(0, 20) + "...");
  console.log("   User Role:", loginResult.user.role);
  console.log("   Email Verified:", loginResult.user.isEmailVerified);

  console.log("\n🎉 ALL STEPS SUCCEEDED! Real Brevo verification email dispatched to inbox.");
  await prisma.$disconnect();
}

testUserFlow().catch(async (err) => {
  console.error("❌ Test failed:", err);
  await prisma.$disconnect();
  process.exit(1);
});
