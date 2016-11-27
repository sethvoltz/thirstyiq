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

Team.prototype.show = function (teamId) {
  return dynamodbDocClient.get({
    TableName: tableName,
    Key: {
      id: teamId
    }
  }).promise()
  .then(function (team) {
    return team.Item;
  });
};

Team.prototype.save = function (team) {
  return dynamodbDocClient.put({
    TableName: tableName,
    Item: team,
    ReturnValues: 'ALL_OLD'
  }).promise();
};

Team.prototype.all = function () {
  return dynamodbDocClient.scan({
    TableName: tableName,
    AttributesToGet: [ 'id', 'name' ]
  }).promise()
  .then(function (teams) {
    return teams.Items;
  });
}

module.exports = Team;
