/**
 * Controller: Authorization
 * - Authorizes Slack via Oauth
 */

const Team = require('../models/team');
const team = new Team();
const Slack = require('../models/slack');
const fetch = require('node-fetch');
const url = require('url');

/**
 * Authorize
 * - Exchanges Code for AccessToken
 */

function processEvent(event) {
  // Prepare response to get Access Token
  var slackClientId     = process.env.SLACK_OAUTH_CLIENT_ID;
  var slackClientSecret = process.env.SLACK_OAUTH_CLIENT_SECRET;
  var oauthAccessCode   = event.queryStringParameters.code;

  // Construct URL
  var parsedUrl = url.parse('https://slack.com/api/oauth.access');
  parsedUrl.query = {
    client_id: slackClientId,
    client_secret: slackClientSecret,
    code: oauthAccessCode
  }

  // Add redirect url, if it is set as ENV
  if (process.env.SLACK_AUTH_REDIRECT_URL) {
    parsedUrl.query.redirect_uri = process.env.SLACK_AUTH_REDIRECT_URL;
  }

  // Send request to get Access Token
  return fetch(url.format(parsedUrl))
  .then(function (response) { return response.text(); })
  .then(handleOauthResult)
  .then(buildTeam)
  .then(saveTeam)
  .then(sendNotifications);
}

function handleOauthResult(response) {
  // Parse stringified JSON
  var body = JSON.parse(response);

  // Return error
  if (body.ok === false) {
    console.log('authorization error', body.error);
    throw new Error('Sorry, something went wrong with the authorization process');
  }

  return body;
}

function buildTeam(response) {
  // Set team attributes
  return {
    id:                                 response.team_id,
    name:                               response.team_name,
    scope:                              response.scope,
    access_token:                       response.access_token,
    bot_user_id:                        response.bot_user_id,
    bot_access_token:                   response.bot_access_token,
    incoming_webhook_url:               response.incoming_webhook.url,
    incoming_webhook_channel:           response.incoming_webhook.channel,
    incoming_webhook_configuration_url: response.incoming_webhook.configuration_url
  };
}

function saveTeam(slackTeam) {
  console.log('saveTeam', slackTeam);
  return team.save(slackTeam)
  .then(function (response) {
    return response.Attributes;
  })
  .catch(function (error) {
    console.log('dynamodb error', error);
    throw new Error('Sorry, something went wrong saving your team\'s information');
  })
}

function sendNotifications(slackTeam) {
  console.log('sendNotifications', slackTeam);
  // Send incoming webhook
  var hook = {
    webhookUri: slackTeam.incoming_webhook_url,
    text: 'Welcome to ThirstyIQ! For more information, run `/thirsty help`'
  }

  return Slack.sendIncomingWebhook(slackTeam.access_token, hook)
  .then(function (response) {
    return 'Your team has successfully connected to this bot!';
  });
}

exports.handler = (event, context, callback) => {
  const done = (err, res) => callback(null, {
    statusCode: err ? '400' : '200',
    body: err ? (err.message || err) : JSON.stringify({ text: res }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  Promise.resolve(event)
  .then(processEvent)
  .then(function (message) { done(null, message); })
  .catch(done);
};
