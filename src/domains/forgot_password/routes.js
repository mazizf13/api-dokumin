const express = require("express");
const router = express.Router();
const { requestPasswordReset, resetUserPassword } = require("./controller");

// Request password reset
router.post("/request", async (req, res) => {
  try {
    const { email, redirectUrl } = req.body;

    if (!email || !redirectUrl)
      throw Error("Please provide both email and redirect URL!");

    await requestPasswordReset(email, redirectUrl);
    res.status(200).json({
      status: "PENDING",
      message: "A password reset email has been sent to your inbox!",
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
    let { userId, resetString, newPassword } = req.body;
    if (!userId || !resetString || !newPassword)
      throw Error("All fields are required to reset your password!");

    await resetUserPassword(userId, resetString, newPassword);

    res.status(200).json({
      status: "SUCCESS",
      message: "Your password has been successfully reset!",
    });
  } catch (error) {
    res.status(400).json({
      status: "FAILED",
      message: error.message,
    });
  }
});

module.exports = router;
