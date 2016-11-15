'use strict';

/**
 * Model: Team
 * - A Slack team that has authorized your Slack Application
 */

// Configure DynamoDb
var AWS = require('aws-sdk');
var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'thirstyiq-slack-teams';
// TODO: Add stage prefix to table name

var Team = function() {};

Team.prototype.show = function(teamId) {
  var params = {
    TableName : tableName,
    Key: {
      id: teamId
    }
  };

  return new Promise(function (resolve, reject) {
    dynamodbDocClient.get(params, function (error, response) {
      if (error) { return reject(error); }
      resolve(response);
    });
  });
};

Team.prototype.save = function(team, cb) {
  var params = {
    TableName : tableName,
    Item: team,
    ReturnValues: 'ALL_OLD'
  };

  return new Promise(function (resolve, reject) {
    dynamodbDocClient.put(params, function (error, response) {
      if (error) { return reject(error); }
      resolve(response);
    });
  })
};

module.exports = Team;
