// mongodb
require("./config/db");

require('dotenv').config(); 

const app = require("express")();
const port = process.env.PORT;

const UserRouter = require('./api/User')

const bodyParser = require("express").json;
app.use(bodyParser());

app.use('/user', UserRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
