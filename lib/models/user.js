'use strict';

/**
 * Model: User
 * - A Slack user as part of a team
 */

// Configure DynamoDb
var AWS = require('aws-sdk');
var dynamoConfig = {
  sessionToken:    process.env.AWS_SESSION_TOKEN,
  region:          process.env.AWS_REGION
};
var dynamodbDocClient = new AWS.DynamoDB.DocumentClient(dynamoConfig);
var tableName = 'thirstyiq-users';
// TODO: Add stage prefix to table name

var User = function () {};

const ATTRIBUTE_NAMES = ['user_name', 'real_name'];

// Add or update a user to a team
User.prototype.update = function (userId, teamId, attributes) {
  var set = [];
  var remove = [];
  ATTRIBUTE_NAMES.forEach(function (key) {
    if (attributes[key]) { set.push(`#${key} = :${key}`); } else { remove.push(`#${key}`); }
  });
  var expression = [
    (set.length > 0) ? `set ${set.join(', ')}` : '',
    (remove.length > 0) ? `remove ${remove.join(', ')}` : ''
  ].join(' ');

  return dynamodbDocClient.update({
    TableName: tableName,
    Key: {
      id : userId,
      organization: teamId
    },
    UpdateExpression: expression,
    ExpressionAttributeNames: ATTRIBUTE_NAMES.reduce(function (out, key) {
      out[`#${key}`] = key;
      return out;
    }, {}),
    ExpressionAttributeValues: ATTRIBUTE_NAMES.reduce(function (out, key) {
      if (attributes[key]) out[`:${key}`] = attributes[key];
      return out;
    }, {})
  }).promise();
};

User.prototype.mapUserNames = function (organization, userNames) {
  return dynamodbDocClient.scan({
    TableName: tableName,
    IndexName: 'organization-index',
    ProjectionExpression: 'id, user_name'
  }).promise()
  .then(response => response.Items.filter(item => userNames.indexOf(item.user_name) !== -1))
  .then(users => users.map(user => user.id));
}

User.prototype.mapUserIds = function (organization, userIds) {
  return dynamodbDocClient.scan({
    TableName: tableName,
    IndexName: 'organization-index',
    ProjectionExpression: 'id, user_name'
  }).promise()
  .then(response => response.Items.filter(item => userIds.indexOf(item.id) !== -1))
  .then(users => users.map(user => user.user_name));
}

module.exports = User;
