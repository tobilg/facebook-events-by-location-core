// Check if .env file exists, and load values. But do not fail if it doesn't!
require('dotenv').config({silent: true});

module.exports = require("./lib/eventSearch");