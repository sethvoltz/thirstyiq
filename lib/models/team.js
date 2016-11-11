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

Team.prototype.show = function(teamId, cb) {

  var params = {
    TableName : tableName,
    Key: {
      id: teamId
    }
  };

  return dynamodbDocClient.get(params, cb);
};

Team.prototype.save = function(team, cb) {

  var params = {
    TableName : tableName,
    Item: team,
    ReturnValues: 'ALL_OLD'
  };

  dynamodbDocClient.put(params, cb);
};

module.exports = Team;
