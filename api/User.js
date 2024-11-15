const express = require("express");
const router = express.Router();

// Mongodb user model
const User = require("../models/User");

// Mongodb user verification model
const UserVerification = require("../models/UserVerification");

// Mongodb user verification model
const PasswordReset = require("../models/PasswordReset");

// Email handler
const nodemailer = require("nodemailer");

// Unique String
const { v4: uuidv4 } = require("uuid");

// Env variables
require("dotenv").config();

// Password handler
const bcrypt = require("bcrypt");

// Path for static verified page
const path = require("path");

// Nodemailer stuff
let transporter = nodemailer.createTransport({
  service: "hotmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASSWORD,
  },
});

// Testing Success
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
    console.log(success);
  }
});

// Signup
router.post("/signup", (req, res) => {
  let { name, email, password, dateOfBirth } = req.body;
  name = name.trim();
  email = email.trim();
  password = password.trim();
  dateOfBirth = dateOfBirth.trim();

  if (name == "" || email == "" || password == "" || dateOfBirth == "") {
    res.status(400).json({
      status: "FAILED",
      message: "Empty input fields!",
    });
  } else if (!/^[a-zA-ZÀ-ÿ ]+$/.test(name)) {
    res.status(400).json({
      status: "FAILED",
      message: "Invalid name entered!",
    });
  } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
    res.status(400).json({
      status: "FAILED",
      message: "Invalid email entered!",
    });
  } else if (!new Date(dateOfBirth).getTime()) {
    res.status(400).json({
      statur: "FAILED",
      message: "Invalid date of birth entered!",
    });
  } else if (password.length < 8) {
    res.status(400).json({
      status: "FAILED",
      message: "Password too short!",
    });
  } else {
    // Check if user already exists
    User.find({ email })
      .then((result) => {
        if (result.length) {
          // A user already exists
          res.status(409).json({
            status: "FAILED",
            message: "User with the provied email already exists!",
          });
        } else {
          // Create a new user

          // Password handling
          const saltRounds = 10;
          bcrypt
            .hash(password, saltRounds)
            .then((hashedPassword) => {
              const newUser = new User({
                name,
                email,
                password: hashedPassword,
                dateOfBirth,
                verified: false,
              });

              newUser
                .save()
                .then((result) => {
                  // Handle email verification
                  sendVerificationEmail(result, res);
                })
                .catch((error) => {
                  res.status(500).json({
                    status: "FAILED",
                    message: "An error occured while creating a new user!",
                  });
                });
            })
            .catch((error) => {
              res.status(500).json({
                status: "FAILED",
                message: "An error occured while hashing the password!",
              });
            });
        }
      })
      .catch((error) => {
        console.log(error);
        res.status(500).json({
          status: "FAILED",
          message: "An error occured while checking if user already exists!",
        });
      });
  }
});

// Send verification email
const sendVerificationEmail = ({ _id, email }, res) => {
  // url to be used in the email
  const currentUrl = "http://localhost:5000/";

  const uniqueString = uuidv4() + _id;

  // mail options
  const mailOptions = {
    from: process.env.AUTH_EMAIL,
    to: email,
    subject: "Verify Your Email Address",
    html: `
            <p>Verify your email address to complete the signup and login into your account.</p>
            <p>This link will <b>expire in 2 hours</b>.</p>
            <p>Press <a href="${currentUrl + "user/verify/" + _id + "/" + uniqueString}">here</a> to verify.</p>
            <p>Team Dokumin ❤️</p>
          `,
  };

  // Hash the unique string
  const saltRounds = 10;
  bcrypt
    .hash(uniqueString, saltRounds)
    .then((hashedUniqueString) => {
      // Set values in userVerification model
      const newVerification = new UserVerification({
        userId: _id,
        uniqueString: hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 7200000, // 2 hours
      });

      newVerification
        .save()
        .then(() => {
          // Send email
          transporter
            .sendMail(mailOptions)
            .then(() => {
              // Email sent and verification data saved
              res.status(200).json({
                status: "PENDING",
                message: "Verification email sent!",
              });
            })
            .catch((error) => {
              console.log(error);
              res.status(500).json({
                status: "FAILED",
                message: "Verification email failed!",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.status(500).json({
            status: "FAILED",
            message: "Could not save verification email data!",
          });
        });
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        status: "FAILED",
        message: "An error occurred while hashing email data!",
      });
    });
};

// Verify email
router.get("/verify/:userId/:uniqueString", (req, res) => {
  let { userId, uniqueString } = req.params;

  UserVerification.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        // User verification record exists so we proceed
        const { expiresAt } = result[0];
        const hashedUniqueString = result[0].uniqueString;

        // Check if verification link has expired
        if (expiresAt < Date.now()) {
          // Verification link has expired
          UserVerification.deleteOne({ userId })
            .then((result) => {
              User.deleteOne({ _id: userId })
                .then(() => {
                  let message = "Link has expired. Please sign up again!";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                })
                .catch((error) => {
                  console.log(error);
                  let message =
                    "Clearing user with expired unique string failed!";
                  res.redirect(`/user/verified/error=true&message=${message}`);
                });
            })
            .catch((error) => {
              console.log(error);
              let message =
                "An error occured while clearing expired user verification record!";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        } else {
          // Valid record exists and proceed the user string
          // Compare the hashed unique string
          bcrypt
            .compare(uniqueString, hashedUniqueString)
            .then((result) => {
              if (result) {
                // Strings match
                User.updateOne({ _id: userId }, { verified: true })
                  .then(() => {
                    UserVerification.deleteOne({ userId })
                      .then(() => {
                        res.sendFile(
                          path.join(__dirname, "../views/verified.html"),
                        );
                      })
                      .catch((error) => {
                        console.log(error);
                        let message =
                          "An error occured while clearing user verification record!";
                        res.redirect(
                          `/user/verified/error=true&message=${message}`,
                        );
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    let message =
                      "An error occured while updating user record to show verified!";
                    res.redirect(
                      `/user/verified/error=true&message=${message}`,
                    );
                  });
              } else {
                // Existing record exists but incorrect verification details passed
                let message =
                  "Invalid verification details passed. Check your inbox!";
                res.redirect(`/user/verified/error=true&message=${message}`);
              }
            })
            .catch((error) => {
              let message = "An error occured while comparing unique string!";
              res.redirect(`/user/verified/error=true&message=${message}`);
            });
        }
      } else {
        // User verification record does not exist
        let message =
          "Account record does not exist or has been verified already. Please sign up or log in!";
        res.redirect(`/user/verified/error=true&message=${message}`);
      }
    })
    .catch((error) => {
      console.log(error);
      let message =
        "An error occurred while cheking for existing user verification record!";
      res.redirect(`/user/verified/error=true&message=${message}`);
    });
});

// Verify page route handler
router.get("/verified", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/verified.html"));
});

// Signin
router.post("/signin", (req, res) => {
  let { email, password } = req.body;
  email = email.trim();
  password = password.trim();

  if (email == "" || password == "") {
    res.status(400).json({
      status: "FAILED",
      message: "Email and password are required!",
    });
  } else {
    // Checl if user exist
    User.find({ email })
      .then((data) => {
        if (data.length) {
          // User exists

          // Check if user is verified
          if (!data[0].verified) {
            // User is not verified
            res.status(400).json({
              status: "FAILED",
              message:
                "Email has not been verified yet. Please check your inbox!",
            });
          } else {
            const hashedPassword = data[0].password;
            bcrypt
              .compare(password, hashedPassword)
              .then((result) => {
                if (result) {
                  // Passwords match
                  res.status(200).json({
                    status: "SUCCESS",
                    message: "User signed in successfully!",
                    data: data[0],
                  });
                } else {
                  // Passwords do not match
                  res.status(400).json({
                    status: "FAILED",
                    message: "Email or password incorrect!",
                  });
                }
              })
              .catch((error) => {
                res.status(500).json({
                  status: "FAILED",
                  message: "An error occured while comparing passwords!",
                });
              });
          }
        } else {
          res.status(400).json({
            status: "FAILED",
            message: "Invalid credentials entered!",
          });
        }
      })
      .catch((error) => {
        res.status(400).json({
          status: "FAILED",
          message: "Email or password incorrect!",
        });
      });
  }
});

// Password reset stuff
router.post("/requestPasswordReset", (req, res) => {
  const { email, redirectUrl } = req.body;

  // Check if email exists
  User.find({ email })
    .then((data) => {
      if (data.length) {
        // User exists

        // Check if user is verified
        if (!data[0].verified) {
          // User is not verified
          res.status(400).json({
            status: "FAILED",
            message:
              "Email has not been verified yet. Please check your inbox!",
          });
        } else {
          // User is verified
          sendResetEmail(data[0], redirectUrl, res);
        }
      } else {
        res.status(400).json({
          status: "FAILED",
          message: "No user found with the provided email!",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        status: "FAILED",
        message: "An error occured while checking for existing user!",
      });
    });
});

// Send password reset email
const sendResetEmail = ({ _id, email }, redirectUrl, res) => {
  const resetString = uuidv4() + _id;

  // Clear all existing reset records
  PasswordReset.deleteMany({ userId: _id })
    .then((result) => {
      // Reset record deleted successfully

      // Sent email
      const mailOptions = {
        from: process.env.AUTH_EMAIL,
        to: email,
        subject: "Reset Password",
        html: `<p>Click the link below to reset your password.</p>
               <p>Do not share this link with anyone.</p>
               <p>This link will <b>expire in 30 minutes</b>.</p>
               <p>Press <a href="${redirectUrl + "/" + _id + "/" + resetString}">here</a> to reset password.</p>
               <p>Team Dokumin ❤️</p>
               `,
      };

      // Hash the reset string
      const saltRounds = 10;
      bcrypt
        .hash(resetString, saltRounds)
        .then((hashedResetString) => {
          // Set values in passwordReset model
          const newPasswordReset = new PasswordReset({
            userId: _id,
            resetString: hashedResetString,
            createdAt: Date.now(),
            expiresAt: Date.now() + 1800000, // 30 minutes
          });

          newPasswordReset
            .save()
            .then(() => {
              // Email sent successfully
              transporter
                .sendMail(mailOptions)
                .then(() => {
                  res.status(200).json({
                    status: "PENDING",
                    message: "Password reset email sent!",
                  });
                })
                .catch((error) => {
                  console.log(error);
                  res.status(500).json({
                    status: "FAILED",
                    message:
                      "An error occured while sending the password reset email!",
                  });
                });
            })
            .catch((error) => {
              console.log(error);
              res.status(500).json({
                status: "FAILED",
                message:
                  "An error occured while saving the password reset data!",
              });
            });
        })
        .catch((error) => {
          console.log(error);
          res.status(500).json({
            status: "FAILED",
            message: "An error occured while hashing the password reset data!",
          });
        });
    })
    .catch((error) => {
      // Error clearing existing password reset records
      console.log(error);
      res.status(500).json({
        status: "FAILED",
        message:
          "An error occured while clearing existing password reset records!",
      });
    });
};

// Reset password
router.post("/resetPassword", (req, res) => {
  let { userId, resetString, newPassword } = req.body;

  PasswordReset.find({ userId })
    .then((result) => {
      if (result.length > 0) {
        // Password reset record exists
        const { expiresAt } = result[0];
        const hashedResetString = result[0].resetString;

        // Check if reset link has expired
        if (expiresAt < Date.now()) {
          PasswordReset.deleteOne({ userId })
            .then(() => {
              // Reset record deleted successfully
              res.status(400).json({
                status: "FAILED",
                message: "Password reset link has expired!",
              });
            })
            .catch((error) => {
              // Deletion failed
              console.log(error);
              res.status(500).json({
                status: "FAILED",
                message: "Clearing password reset record failed!",
              });
            });
        } else {
          // Valid reset record exists so validate the reset string
          // Compare the hashed reset string

          bcrypt
            .compare(resetString, hashedResetString)
            .then((result) => {
              if (result) {
                // Strings match
                const saltRounds = 10;
                bcrypt
                  .hash(newPassword, saltRounds)
                  .then((hashedNewPassword) => {
                    // Update user password
                    User.updateOne(
                      { _id: userId },
                      { password: hashedNewPassword },
                    )
                      .then(() => {
                        // Update complete and delete reset record
                        PasswordReset.deleteOne({ userId })
                          .then(() => {
                            // Both user record and reset record updated
                            res.status(200).json({
                              status: "SUCCESS",
                              message: "Password has been reset successfully!",
                            });
                          })
                          .catch((error) => {
                            console.log(error);
                            res.status(500).json({
                              status: "FAILED",
                              message:
                                "An error occured while finalizing password reset!",
                            });
                          });
                      })
                      .catch((error) => {
                        console.log(error);
                        res.status(500).json({
                          status: "FAILED",
                          message: "Updating user password failed!",
                        });
                      });
                  })
                  .catch((error) => {
                    console.log(error);
                    res.status(500).json({
                      status: "FAILED",
                      message: "An error occured while hashing new password!",
                    });
                  });
              } else {
                // Existing record exists but incorrect reset string passed
                res.status(400).json({
                  status: "FAILED",
                  message: "Invalid password reset details passed!",
                });
              }
            })
            .catch((error) => {
              console.log(error);
              res.status(500).json({
                status: "FAILED",
                message: "An error occured while comparing reset strings!",
              });
            });
        }
      } else {
        // Password reset record does not exist
        res.status(400).json({
          status: "FAILED",
          message: "Password reset record does not found!",
        });
      }
    })
    .catch((error) => {
      console.log(error);
      res.status(500).json({
        status: "FAILED",
        message:
          "An error occured while checking for existing password reset record!",
      });
    });
});

module.exports = router;
