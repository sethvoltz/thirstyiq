'use strict';

var SlackSDK = require('slack-node'),
    Team     = require('./team');

var Slack = {};

/**
 * Send Incoming Webhook
 * - Sends a message into Slack
 */

Slack.sendIncomingWebhook = function(accessToken, options) {
  return new Promise(function (resolve, reject) {
    var slackSdk = new SlackSDK(accessToken);
    slackSdk.setWebhook(options.webhookUri);
    return slackSdk.webhook(options, function (error, response) {
      if (error) { return reject(error); }
      resolve(response);
    });
  })
};

module.exports = Slack;
