const express = require("express");
const router = express.Router();

// Mongodb user model
const User = require("../models/User");

// Mongodb user verification model
const UserVerification = require("../models/UserVerification");

// Email handler
const nodemailer = require("nodemailer");

// Unique String
const { v4: uuidv4 } = require("uuid");

// Env variables
require("dotenv").config();

// Password handler
const bcrypt = require("bcrypt");

// Nodemailer stuff
let transporter = nodemailer.createTransport({
  service: "gmail",
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
    subject: "Verify your email address",
    html: `<p>Verify your email address to complete the signup and login into your account.</p><p>This link will <b>expires in 2 hours</b>.</p><p>Press <a href="${currentUrl + "user/verify/" + _id + "/" + uniqueString}">here</a> to verify.</p>`,
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

module.exports = router;
