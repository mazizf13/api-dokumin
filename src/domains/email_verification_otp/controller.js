const UserOTPVerification = require("./model");
const User = require("../user/model");
const generateOTP = require("../../util/generateOTP");
const verifyHashedData = require("../../util/verifyHashedData");
const hashData = require("../../util/hashData");
const sendEmail = require("../../util/sendEmail");

const sendOTPVerificationEmail = async ({ _id, email }) => {
  try {
    const otp = await generateOTP();

    // Mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email Address",
      html: `
                <p>Enter <b>${otp}</b> to complete your account setup and login.</p>
                <p>This code <b>expires in 60 minutes</b>.</p>
                <p>Team Dokumin ❤️</p>
              `,
    };

    const hashedOTP = await hashData(otp);
    const newOTPVerification = await new UserOTPVerification({
      userId: _id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000, // 1 hour
    });
    // Save the otp verification record
    await newOTPVerification.save();
    await sendEmail(mailOptions);
    return {
      userId: _id,
      email,
    };
  } catch (error) {
    throw error;
  }
};

const verifyOTPEmail = async (userId, otp) => {
  try {
    // Ensure record exists
    const matchedOTPVerificationRecords = await UserOTPVerification.find({
      userId,
    });
    if (!matchedOTPVerificationRecords.length) {
      let message =
        "No verification record found for this account or it has already been verified. Please sign up or log in to proceed.";
      throw Error(message);
    } else {
      const { expiresAt } = matchedOTPVerificationRecords[0];
      const hashedOTP = matchedOTPVerificationRecords[0].otp;

      // Checking for expired OTP
      if (expiresAt < Date.now()) {
        await UserOTPVerification.deleteOne({ userId });
        throw Error("The OTP code has expired. Please request a new one.");
      } else {
        const validOTP = await verifyHashedData(otp, hashedOTP);
        if (!validOTP) {
          throw Error("Invalid OTP. Please check your inbox and try again.");
        } else {
          const verifiedUser = await User.updateOne(
            { _id: userId },
            { verified: true },
          );
          await UserOTPVerification.deleteMany({ userId });
          return verifiedUser;
        }
      }
    }
  } catch (error) {
    throw error;
  }
};

const resendOTPVerificationEmail = async (userId, email) => {
  // Delete existing records and resend
  await UserOTPVerification.deleteMany({ userId });
  const emailData = await sendOTPVerificationEmail({ _id: userId, email });
  return emailData;
};

module.exports = {
  verifyOTPEmail,
  sendOTPVerificationEmail,
  resendOTPVerificationEmail,
};
