const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

export async function sendVerificationEmail(user, token) {
  const link = `${CLIENT_ORIGIN}/verify-email?token=${token}`;
  console.log("\n--- Verification email (dev) ---");
  console.log(`To: ${user.email}`);
  console.log(`Link: ${link}`);
  console.log("--------------------------------\n");
}

export async function sendResetPasswordEmail(user, token) {
  const link = `${CLIENT_ORIGIN}/reset-password?token=${token}`;
  console.log("\n--- Password reset email (dev) ---");
  console.log(`To: ${user.email}`);
  console.log(`Link: ${link}`);
  console.log("----------------------------------\n");
}
