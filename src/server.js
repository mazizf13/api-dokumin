require("./config/db");

const app = require("express")();
const express = require("express");
const cors = require("cors");
const routes = require("./routes");

// Cors
app.use(cors());

app.use(express.json());

// Registering routes
app.use(routes);

module.exports = app;
