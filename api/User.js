const express = require("express");
const router = express.Router();

// Mongodb user model
const User = require("../models/User");

// Password handler
const bcrypt = require("bcrypt");

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
              });

              newUser
                .save()
                .then((result) => {
                  res.status(201).json({
                    status: "SUCCESS",
                    message: "User created successfully!",
                    data: result,
                  });
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
