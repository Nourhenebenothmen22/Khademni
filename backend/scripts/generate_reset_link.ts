import { prisma } from "../src/lib/prisma.js";
import { generateRandomToken, hashToken } from "../src/lib/token.js";

async function main() {
  const email = "benothmennourhen8@gmail.com";
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user) {
    console.error("User not found!");
    return;
  }

  const rawToken = generateRandomToken();
  const hashedToken = hashToken(rawToken);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetTokenHash: hashedToken,
      passwordResetExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
  });

  console.log("=== RESET TOKEN GENERATED FOR USER ===");
  console.log("User:", user.email);
  console.log("Raw Token:", rawToken);
  console.log("Direct Reset URL:", `http://localhost:5173/reset-password?token=${rawToken}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
