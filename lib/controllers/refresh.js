/**
 * Controller: Refresh
 * - Refresh team users
 */

var AWS = require('aws-sdk');
var snsConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var sns = new AWS.SNS(snsConfig);

const Slack = require('../models/slack');
const Team = require('../models/team');
const team = new Team();

var environment = {};

function processEvent(event) {
  if (!event.Records) {
    // The function was not called from SNS, let's fire an SNS request from the context
    return processSns({
      TopicArn: `arn:aws:sns:${environment.region}:${environment.account}:refresh-users`
    });
  }

  return Promise.all(event.Records.map(record => {
    return new Promise(resolve => resolve(processSns(record.Sns)));
  }));
}

function processSns(event) {
  console.log('processSns', JSON.stringify(event));
  var message;

  try {
    message = JSON.parse(event.Message);
  } catch (e) {
    message = {};
  }

  if (message.team) {
    return loadTeam(message.team);
  }
  return loadAllTeams(event.TopicArn);
}

function loadAllTeams(topicArn) {
  console.log('Loading all teams');
  return team.all()
  .then(function (teams) {
    console.log('teams', JSON.stringify(teams))
    return Promise.all(teams.map(team => {
      return new Promise(resolve => resolve(sendSns(team.id, topicArn)));
    }));
  })
}

function sendSns(team, topicArn) {
  console.log('Triggering SNS for individual team load', team, topicArn);
  var params = {
    TopicArn: topicArn,
    Message: JSON.stringify({ team: team })
  };
  console.log('params', JSON.stringify(params));
  return sns.publish(params).promise();
}

function loadTeam(teamId) {
  console.log('Loading single team', teamId);
  return Slack.updateUsers(teamId);
}

function init(context) {
  var splitArn = context.invokedFunctionArn.split(':');
  Object.assign(environment, {
    arn: environment.invokedFunctionArn,
    region: splitArn[3],
    account: splitArn[4]
  });
}

exports.handler = (event, context, callback) => {
  const done = (err, res) => callback(null, {
    ok: !err,
    message: err ? (err.message || err) : res
  });

  init(context);
  Promise.resolve(event)
  .then(processEvent)
  .then(function (message) { console.log('success', JSON.stringify(message)); done(null, message); })
  .catch(function (error) {
    console.log('error', error);
    done(error);
  });
};
