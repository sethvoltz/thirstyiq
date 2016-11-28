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
  .then(response => response.Items || []);
};

Group.prototype.newGroup = function(teamId, groupName, userId, memberIds, isPrivate) {
  return dynamodbDocClient.put({
    TableName: tableName,
    Item: {
      organization: teamId,
      name: groupName,
      creator: userId,
      members: memberIds,
      private: isPrivate
    },
    ConditionExpression: 'attribute_not_exists (#n)',
    ExpressionAttributeNames: {'#n': 'name'}
  }).promise();
}

Group.prototype.show = function(teamId, groupName) {
  return dynamodbDocClient.get({
    TableName: tableName,
    Key: {
      organization: teamId,
      name: groupName
    }
  }).promise()
  .then(response => response.Item);
}

Group.prototype.delete = function(teamId, userId, groupName) {
  return dynamodbDocClient.delete({
    TableName: tableName,
    Key: {
      organization: teamId,
      name: groupName
    },
    ConditionExpression: 'attribute_exists (#n) and (creator = :user)',
    ExpressionAttributeNames: {'#n': 'name'},
    ExpressionAttributeValues: { ':user': userId }
  }).promise()
}

module.exports = Group;
