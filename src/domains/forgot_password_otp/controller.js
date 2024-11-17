const PasswordResetOTP = require("./model");
const User = require("./../user/model");
const hashData = require("./../../util/hashData");
const verifyHashedData = require("./../../util/verifyHashedData");
const sendEmail = require("./../../util/sendEmail");
const generateOTP = require("./../../util/generateOTP");

const requestOTPPasswordReset = async (email) => {
  try {
    // check if user exists with email.
    const matchedUsers = await User.find({ email });
    if (!matchedUsers.length) {
      throw Error("No account with the supplied email exists!");
    } else {
      if (!matchedUsers[0].verified) {
        throw Error("Email hasn't been verified yet. Check your inbox!");
      } else {
        // valid email, set reset email

        const emailData = await sendOTPPasswordResetEmail(matchedUsers[0]);
        return emailData;
      }
    }
  } catch (error) {
    throw error;
  }
};

const sendOTPPasswordResetEmail = async ({ _id, email }) => {
  try {
    const otp = await generateOTP();
    await PasswordResetOTP.deleteMany({ userId: _id });

    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Password Reset",
      html: `<p>Click the link below to reset your password.</p>
      <p>Enter <b>${otp}</b> in the app to proceed with the reset process.</p>
      <p>This code <b>expires in 60 minutes</b>. </p>
      <p>Team Dokumin ❤️</p>`,
    };

    const hashedOTP = await hashData(otp);

    // set values in password reset collection
    const newPasswordResetOTP = new PasswordResetOTP({
      userId: _id,
      otp: hashedOTP,
      createdAt: Date.now(),
      expiresAt: Date.now() + 3600000,
    });

    await newPasswordResetOTP.save();
    await sendEmail(mailOptions);
    return {
      userId: _id,
      email,
    };
  } catch (error) {
    throw error;
  }
};

const resetOTPUserPassword = async (userId, otp, newPassword) => {
  try {
    // check if user exists with email.
    const matchedPasswordResetOTPRecords = await PasswordResetOTP.find({
      userId,
    });
    if (!matchedPasswordResetOTPRecords.length) {
      throw Error("Password reset request not found!");
    } else {
      const { expiresAt } = matchedPasswordResetOTPRecords[0];
      const hashedOTP = matchedPasswordResetOTPRecords[0].otp;

      if (expiresAt < Date.now()) {
        await PasswordResetOTP.deleteOne({ userId });
        throw Error("Code has expired. Please request again!");
      } else {
        const otpMatch = await verifyHashedData(otp, hashedOTP);
        if (!otpMatch) {
          throw Error("Invalid code passed. Check your inbox!");
        }
        {
          const hashedNewPassword = await hashData(newPassword);
          await User.updateOne(
            { _id: userId },
            { password: hashedNewPassword },
          );
          await PasswordResetOTP.deleteOne({ userId });
          return;
        }
      }
    }
  } catch (error) {
    throw error;
  }
};

const resendOTPPasswordResetEmail = async (userId, email) => {
  // delete existing records and resend
  await PasswordResetOTP.deleteMany({ userId });
  const emailData = await sendOTPPasswordResetEmail({ _id: userId, email });
  return emailData;
};

module.exports = {
  requestOTPPasswordReset,
  resetOTPUserPassword,
  resendOTPPasswordResetEmail,
};
