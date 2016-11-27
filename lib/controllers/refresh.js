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

function processEvent(event) {
  if (!event.Records) { throw new Error('This function must be called from SNS'); }

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

exports.handler = (event, context, callback) => {
  const done = (err, res) => callback(null, {
    ok: !err,
    message: err ? (err.message || err) : res
  });

  Promise.resolve(event)
  .then(processEvent)
  .then(function (message) { console.log('success', JSON.stringify(message)); done(null, message); })
  .catch(function (error) {
    console.log('error', error);
    done(error);
  });
};
