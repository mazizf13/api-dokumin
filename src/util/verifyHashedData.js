const bcrypt = require("bcrypt");

const verifyHashedData = async (unhashed, hashedData) => {
  try {
    const match = await bcrypt.compare(unhashed, hashedData);
    return match;
  } catch (error) {
    throw error;
  }
};

module.exports = verifyHashedData;
