import nodemailer from "nodemailer";
import { env } from "../src/config/env.js";

async function verifySmtp() {
  console.log("=== Testing Brevo SMTP Integration ===");
  console.log(`Host: ${env.SMTP_HOST}`);
  console.log(`Port: ${env.SMTP_PORT}`);
  console.log(`User: ${env.SMTP_USER}`);

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
    connectionTimeout: 10000,
  });

  try {
    await transporter.verify();
    console.log("\n🎉 SUCCESS! Brevo SMTP connection & authentication verified 100%!");
  } catch (error: any) {
    console.error("\n❌ SMTP Verification Error:", error.message);
    if (error.message.includes("525 5.7.1 Unauthorized IP address")) {
      console.log("\n📌 ACTION REQUIRED IN BREVO:");
      console.log("Add your server's current public IP address to Brevo -> SMTP & API -> Authorized IP addresses.");
    }
  }
}

verifySmtp();
