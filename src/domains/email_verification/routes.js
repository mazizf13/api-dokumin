const express = require("express");
const router = express.Router();
const { verifyEmail, resendVerificationEmail } = require("./controller");

// Path for static verified page
const path = require("path");

// Resend verification
router.post("/resend", async (req, res) => {
  try {
    let { userId, email } = req.body;
    if (!userId || !email)
      throw Error("User details are missing or incomplete.");

    const emailData = await resendVerificationEmail(userId, email);

    res.status(200).json({
      status: "PENDING",
      message: "A new verification email has been sent to your inbox.",
      data: emailData,
    });
  } catch (error) {
    res.status(400).json({
      status: "FAILED",
      message: error.message,
    });
  }
});

// Verify email
router.get("/:userId/:uniqueString", async (req, res) => {
  try {
    let { userId, uniqueString } = req.params;
    if (!userId || !uniqueString)
      throw Error("User details or verification link are missing.");

    await verifyEmail(userId, uniqueString);
    res.sendFile(path.join(__dirname, "./views/verified.html"));
  } catch (error) {
    res.redirect(
      `/email_verification/verified?error=true&message=${error.message}`,
    );
  }
});

// Verified page route
router.get("/verified", (_, res) => {
  res.sendFile(path.join(__dirname, `./views/verified.html`));
});

module.exports = router;
