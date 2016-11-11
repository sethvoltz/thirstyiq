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
  .then(handleOauthResult);
}

function (response) {
  // Parse stringified JSON
  body = JSON.parse(response);

  // Return error
  if (body.ok === false) {
    console.log('authorization error', body.error);
    throw new Error('Sorry, something went wrong with the authorization process');
  }

  // Set team attributes
  var slackTeam = {
    id:                                 body.team_id,
    name:                               body.team_name,
    scope:                              body.scope,
    access_token:                       body.access_token,
    bot_user_id:                        body.bot_user_id,
    bot_access_token:                   body.bot_access_token,
    incoming_webhook_url:               body.incoming_webhook.url,
    incoming_webhook_channel:           body.incoming_webhook.channel,
    incoming_webhook_configuration_url: body.incoming_webhook.configuration_url
  };

  // Create or Update team
  // TODO: Convert team to promises
  team.save(slackTeam, function(error, slackTeam) {

    // Return error
    if (error) {
      console.log('dynamodb error', error);
      throw new Error('Sorry, something went wrong saving your team\'s information');
    }

    // Send incoming webhook
    Slack.sendIncomingWebhook(
        body.access_token,
        {
          webhookUri:  body.incoming_webhook.url,
          text:        'Success, you have just connected me!'
        },
        function(error, result) {

          // Return response
          return done(null, {
            message: 'Your team has successfully connected to this bot!'
          });
        }
    );
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
