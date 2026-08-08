import { sendPasswordResetEmail } from "../src/lib/email.js";
import { generateRandomToken, hashToken } from "../src/lib/token.js";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const emails = ["benothmennourhene9@gmail.com", "benothmennourhen8@gmail.com"];

  for (const email of emails) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const rawToken = generateRandomToken();
      const hashedToken = hashToken(rawToken);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordResetTokenHash: hashedToken,
          passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });
      await sendPasswordResetEmail(user.email, user.fullName, rawToken);
      console.log(`Password reset email sent successfully to ${user.email}!`);
    } else {
      console.log(`User ${email} not in DB, sending test reset email...`);
      await sendPasswordResetEmail(email, "Nourhene", "test_reset_token_123");
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
