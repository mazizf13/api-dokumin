const User = require("./model");
const hashData = require("../../util/hashData");
const verifyHashedData = require("./../../util/verifyHashedData");

const createNewUser = async (data) => {
  try {
    const { name, email, password, dateOfBirth } = data;
    // Check if user already exists
    const existingUser = await User.find({ email });

    if (existingUser.length) {
      // A user already exists
      throw Error("User with the provided email already exists!");
    } else {
      // Hash Password
      const hashedPassword = await hashData(password);
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        dateOfBirth,
        verified: false,
      });
      // Save the new user
      const createdUser = await newUser.save();
      return createdUser;
    }
  } catch (error) {
    throw error;
  }
};

const authenticateUser = async (email, password) => {
  try {
    const fetchedUsers = await User.find({ email });
    if (!fetchedUsers.length) {
      throw Error("Email or password is incorrect!");
    } else {
      if (!fetchedUsers[0].verified) {
        throw Error("Email has not been verified yet. Check your inbox!");
      } else {
        const hashedPassword = fetchedUsers[0].password;
        const passwordMatch = await verifyHashedData(password, hashedPassword);

        if (!passwordMatch) {
          throw Error("Email or password is incorrect!");
        } else {
          return fetchedUsers;
        }
      }
    }
  } catch (error) {
    throw error;
  }
};

module.exports = { createNewUser, authenticateUser };
