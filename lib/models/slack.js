'use strict';

var SlackSDK = require('slack-node');
var User     = require('./user');
var user     = new User();
var Team     = require('./team');
var team     = new Team();

var Slack = {};

/**
 * Send Incoming Webhook
 * - Sends a message into Slack
 */

Slack.sendIncomingWebhook = function (accessToken, options) {
  return new Promise(function (resolve, reject) {
    var slackSdk = new SlackSDK(accessToken);
    slackSdk.setWebhook(options.webhookUri);
    return slackSdk.webhook(options, function (error, response) {
      if (error) { return reject(error); }
      resolve(response);
    });
  })
};

Slack.updateUsers = function (teamId) {
  console.log('loading users for team', teamId);

  return team.show(teamId)
  .then(function (teamItem) { return teamItem.access_token; })
  .then(listUsers)
  .then(loadUsers)
  .then(function (all) { return all.length; });
};

function listUsers(accessToken) {
  return new Promise(function (resolve, reject) {
    var slackSdk = new SlackSDK(accessToken);
    slackSdk.api("users.list", function (error, response) {
      if (error) { reject(new Error(error)); }
      if (response.ok !== true) { reject(new Error(response.error || response)); }
      resolve(response.members);
    });
  });
}

function loadUsers(members) {
  return Promise.all(members.map(member => {
    return new Promise(resolve => {
      resolve(user.update(member.id, member.team_id, {
        user_name: member.name,
        real_name: member.real_name
      }));
    });
  }));
}

module.exports = Slack;
