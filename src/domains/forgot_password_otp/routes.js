const express = require("express");
const router = express.Router();
const {
  requestOTPPasswordReset,
  resetOTPUserPassword,
  resendOTPPasswordResetEmail,
} = require("./controller");

// Password reset stuff
router.post("/request", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) throw Error("Empty credentials are not allowed!");

    const emailData = await requestOTPPasswordReset(email);
    res.status(200).json({
      status: "PENDING",
      message: "Password reset otp email sent!",
      data: emailData,
    });
  } catch (error) {
    res.status(400).json({
      status: "FAILED",
      message: error.message,
    });
  }
});

router.post("/reset", async (req, res) => {
  try {
    let { userId, otp, newPassword } = req.body;
    if (!userId || !otp || !newPassword)
      throw Error("Empty credentials are not allowed!");

    await resetOTPUserPassword(userId, otp, newPassword);

    res.status(200).json({
      status: "SUCCESS",
      message: "Password has been reset successfully!",
    });
  } catch (error) {
    res.status(400).json({
      status: "FAILED",
      message: error.message,
    });
  }
});

// Resend verification
router.post("/resend", async (req, res) => {
  try {
    let { userId, email } = req.body;
    if (!userId || !email) throw Error("Empty credentials are not allowed!");

    const emailData = await resendOTPPasswordResetEmail(userId, email);

    res.status(200).json({
      status: "PENDING",
      message: "Password reset otp email sent!",
      data: emailData,
    });
  } catch (error) {
    res.status(400).json({
      status: "FAILED",
      message: error.message,
    });
  }
});

module.exports = router;
