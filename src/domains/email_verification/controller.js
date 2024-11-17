const UserVerification = require("./model");
const User = require("./../user/model");
const hashData = require("./../../util/hashData");
const verifyHashedData = require("./../../util/verifyHashedData");
const sendEmail = require("./../../util/sendEmail");
const currentUrl = require("./../../util/currentUrl");

// Unique string
const { v4: uuidv4 } = require("uuid");

const sendVerificationEmail = async ({ _id, email }) => {
  try {
    const uniqueString = uuidv4() + _id;

    // Mail options
    const mailOptions = {
      from: process.env.AUTH_EMAIL,
      to: email,
      subject: "Verify Your Email Address",
      html: `<p>To complete your registration and start using your account, please verify your email address.</p>
      <p>The verification link will <b>expire in 6 hours</b>.</p>
      <p>Click <a href=${currentUrl + "email_verification/" + _id + "/" + uniqueString}>here</a> to verify your email.</p>
      <p>Team Dokumin ❤️</p>`,
    };

    const hashedUniqueString = await hashData(uniqueString);
    const newVerification = new UserVerification({
      userId: _id,
      uniqueString: hashedUniqueString,
      createdAt: Date.now(),
      expiresAt: Date.now() + 21600000, // 6 Jours
    });
    await newVerification.save();
    await sendEmail(mailOptions);
    return {
      userId: _id,
      email,
    };
  } catch (error) {
    throw error;
  }
};

const verifyEmail = async (userId, uniqueString) => {
  try {
    // Ensure record exists
    const matchedVerificationRecords = await UserVerification.find({ userId });
    if (!matchedVerificationRecords.length) {
      let message =
        "It looks like your account doesn't exist or has already been verified. Please either sign up or log in!";
      throw Error(message);
    } else {
      const { expiresAt } = matchedVerificationRecords[0];
      const hashedUniqueString = matchedVerificationRecords[0].uniqueString;

      // Checking for expired unique string
      if (expiresAt < Date.now()) {
        await UserVerification.deleteOne({ userId });
        // Delete expired user
        await User.deleteOne({ _id: userId });
        let message =
          "This verification link has expired. Please sign up again!";
        throw Error(message);
      } else {
        const stringMatch = await verifyHashedData(
          uniqueString,
          hashedUniqueString,
        );
        if (!stringMatch) {
          let message =
            "The verification details you provided are invalid. Please check your inbox and try again!";
          throw Error(message);
        } else {
          const verifiedUser = await User.updateOne(
            { _id: userId },
            { verified: true },
          );
          await UserVerification.deleteOne({ userId });
          return verifiedUser;
        }
      }
    }
  } catch (error) {
    throw error;
  }
};

const resendVerificationEmail = async (userId, email) => {
  // Delete existing records and resend
  await UserVerification.deleteMany({ userId });
  const emailData = await sendVerificationEmail({ _id: userId, email });
  return emailData;
};

module.exports = {
  sendVerificationEmail,
  verifyEmail,
  resendVerificationEmail,
};
