'use strict';

const AWS = require('aws-sdk');
const qs = require('querystring');

const dynamodb = new AWS.DynamoDB();

function processEvent(event) {
  const params = qs.parse(event.body);
  const requestToken = params.token;
  console.log('/thirsty', params);

  if (requestToken !== process.env.SLACK_REQUEST_TOKEN) {
    console.error(`Request token (${requestToken}) does not match expected`);
    throw 'Invalid request token';
  }

  // const team = params.team_id;
  // const user = params.user_id;

  return JSON.stringify(params);
}

exports.handler = (event, context, callback) => {
  const done = (error, result) => callback(null, {
    statusCode: error ? '400' : '200',
    body: error ? (error.message || error) : JSON.stringify({ text: result }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  Promise.resolve(event)
  .then(processEvent)
  .then(function (message) { done(null, message); })
  .catch(done);
};
