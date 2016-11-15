'use strict';

// Configure DynamoDb
var AWS = require('aws-sdk');
var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'thirstyiq-groups';
// TODO: Add stage prefix to table name

var Group = function() {};

Group.prototype.all = function(teamId, userId) {
  return dynamodbDocClient.scan({
    TableName: tableName,
    FilterExpression: 'organization = :organization and ((#p = :false) or (creator = :user) or contains (members, :user))',
    ExpressionAttributeNames: {
      '#p': 'private'
    },
    ExpressionAttributeValues: {
      ':organization': teamId,
      ':user': userId,
      ':false': false
    }
  }).promise()
};

module.exports = Group;
