'use strict';

// Load environment vars
require('dotenv').config();

// Require libs
var service = require('./lib');

// Export handlers
exports.slash = service.slash.handler;
exports.authorization = service.authorization.handler;
exports.refresh = service.refresh.handler;
