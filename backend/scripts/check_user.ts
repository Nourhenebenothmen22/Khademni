import { prisma } from "../src/lib/prisma.js";

async function main() {
  const email = "benothmennourhen8@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  console.log("=== USER CHECK ===");
  console.log("Searching for:", email);
  console.log("User found:", !!user);
  if (user) {
    console.log("ID:", user.id);
    console.log("Full Name:", user.fullName);
    console.log("Email:", user.email);
    console.log("Role:", user.role);
    console.log("Email Verified:", user.isEmailVerified);
    console.log("Password Reset Token Hash Present:", !!user.passwordResetTokenHash);
    console.log("Password Reset Expires At:", user.passwordResetExpiresAt);
  } else {
    console.log("No account found with this email address.");
    const allUsers = await prisma.user.findMany({
      select: { id: true, email: true, fullName: true, role: true }
    });
    console.log("Existing users in database:", allUsers);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
