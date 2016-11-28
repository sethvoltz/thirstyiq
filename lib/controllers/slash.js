'use strict';

const _ = require('lodash');
const AWS = require('aws-sdk');
const qs = require('querystring');
const Group = require('../models/group');
const group = new Group();
const User = require('../models/user');
const user = new User();
const Team = require('../models/team');
const team = new Team();
const Slack = require('../models/slack');


const commandRouter = {
  help:      { run: runHelp, help: helpHelp },
  list:      { run: runList, help: helpList },
  new:       { run: runNew, help: helpNew },
  update:    { run: runUpdate, help: helpUpdate },
  show:      { run: runShow, help: helpShow },
  remove:    { run: runRemove, help: helpRemove },
  join:      { run: runJoin, help: helpJoin },
  leave:     { run: runLeave, help: helpLeave },
  notify:    { run: runNotify, help: helpNotify },
  calendar:  { run: runCalendar, help: helpCalendar },
  mute:      { run: runMute, help: helpMute },
  available: { run: runAvailable, help: helpAvailable }
};

// =---------------------------------------------------------------------------= Command Router =--=

// Params:
// {
//   "token": "<access-token>",
//   "team_id": "T0xxxxxxx",
//   "team_domain": "xxxxxxxx",
//   "channel_id": "C0xxxxxxx",
//   "channel_name": "general",
//   "user_id": "U0xxxxxxx",
//   "user_name": "<caller>",
//   "command": "/thirsty",
//   "text": "<input-text>",
//   "response_url": "https://hooks.slack.com/commands/<team-id>/<secrets>"
// }
function processEvent(event) {
  const params = qs.parse(event.body);
  const requestToken = params.token;
  if (requestToken !== process.env.SLACK_REQUEST_TOKEN) {
    console.error(`Request token (${requestToken}) does not match expected`);
    throw 'Invalid request token';
  }

  const commandText = params.text;

  const call = commandText.split(' ')[0];
  if (!hasCommand(call)) {
    return `Unknown command '${call}', please run \`/thirsty help\` for more information`;
  }

  const commandParams = tokenizeParams(commandText.substring(call.length + 1));
  return commandRouter[call].run(params, call, commandParams);
}


// =----------------------------------------------------------------------------= Command: Help =--=

function runHelp(environment, command, params) {
  const call = params[0];

  if (call && call.length > 0) {
    if (hasCommand(call)) {
      return `thirsty ${call}: ${commandRouter[call].help()}`;
    }
    return `Unknown command ${command}. For a list of commands, run \`/thirsty help\`.`;
  }
  return 'ThirstyIQ helps you keep in touch with your beverage loving buddies.\n'
    + 'Usage: /thirsty <command> [arguments]\n'
    + `Commands: ${Object.keys(commandRouter).join(', ')}\n`
    + 'For more information on a command, run `/thirsty help <command>`';
}
function helpHelp() {
  return 'Get help using the ThirstyIQ Slack command.';
}


// =----------------------------------------------------------------------------= Command: List =--=

function runList(environment) {
  return group.all(environment.team_id, environment.user_id)
  .then(function (groups) {
    if (groups.length > 0) {
      var list = groups.reduce((set, group) => {
        if (group.creator === environment.user_id) { set.mine.push(group); }
        else if (group.members && group.members.indexOf(environment.user_id)) { set.member.push(group); }
        else { set.other.push(group); }
        return set;
      }, { mine: [], member: [], other: [] });
      return `My Groups: ${formatGroupList(list.mine)}`
        + `\nJoined Groups: ${formatGroupList(list.member)}`
        + `\nOther Groups: ${formatGroupList(list.other)}`;
    }

    return 'There are no visible groups. Create one with `/thirsty new <group name>`!';
  });
}

function helpList() {
  return 'View all groups which are public or private and visible to you.\n'
    + 'A private group is visible if you created or are a member of it.';
}


// =-----------------------------------------------------------------------------= Command: New =--=

function runNew(environment, command, params) {
  // Check private
  var isPrivate = params[0] === 'private';
  if (isPrivate) { params.shift(); }

  // Get name and groups
  var groupName = params.shift();
  var groupUsers = params.filter(user => user[0] === '@').map(user => user.slice(1));
  var userIds = [];
  groupUsers.push(environment.user_name);

  // If users, map users to user_id, then append and uniq caller's id
  return user.mapUserNames(environment.team_id, groupUsers)

  // Send to DynamoDB
  .then(function (mappedUserIds) {
    userIds = mappedUserIds;
    return group.newGroup(environment.team_id, groupName, environment.user_id, userIds, isPrivate);
  })

  // Finally, report back to the user
  .then(() => team.show(environment.team_id))
  .then(function (slackTeam) {
    console.log('notifyUsers', JSON.stringify(slackTeam));
    var numUsers = userIds.length;
    return Promise.all(userIds.map(user => {
      console.log("sendIncomingWebhook", JSON.stringify([user, environment.user_id]));
      if (user === environment.user_id) { return; }

      return Slack.sendIncomingWebhook(slackTeam.access_token, {
        webhookUri: slackTeam.incoming_webhook_url,
        channel: user,
        text: `Hiya, you have been added to @${environment.user_name}'s group '${groupName}'!`
      });
    }))

    .then(() => `Created group '${groupName}' with ${numUsers} user${numUsers > 1 ? 's' : ''}.`);
  })
  .catch(function (error) {
    if (error && error.code && error.code === 'ConditionalCheckFailedException') {
      return `The group '${groupName}' already exists.`;
    }
    throw error;
  });
}

function helpNew() {
  return 'Create a new thirsty group.\n'
    + 'Usage: `/thirsty new [private] <group name> [list of users]\n'
    + 'Tips:\n'
    + '   Use the @name of any users you want in your group'
    + '   Group names may contain spaces if you "surround it with quotes".\n'
    + '   The word "private" at the beginning will hide the group from anyone who is not a member';
}


// =--------------------------------------------------------------------------= Command: Update =--=

function runUpdate(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpUpdate() { return 'This command has not yet been implemented.'; }


// =----------------------------------------------------------------------------= Command: Show =--=

function runShow(environment, command, params) {
  var groupName = params[0];

  if (!groupName) {
    return 'Please specify a group name to show. Use `/thirsty list` to get a list of groups';
  }

  return group.show(environment.team_id, groupName)
  .then(groupItem => user.canSeeGroup(environment.user_id, groupItem))
  .then(groupItem => user.mapUserIds(environment.team_id, groupItem.members))
  .then(userNames => `Group '${groupName}' users: ${userNames.join(', ')}`)
  .catch((error) => {
    if (error.code === '' || error.code === '') {
      return `Unknown group '${groupName}'`;
    }
    throw error;
  });
}

function helpShow() {
  return 'Show the users in a group visible to you.\n'
    + 'Usage: `/thirsty show <group name>\n'
    + 'Tips:\n'
    + '   Group names may contain spaces if you "surround it with quotes".';
}


// =--------------------------------------------------------------------------= Command: Remove =--=

function runRemove(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpRemove() { return 'This command has not yet been implemented.'; }


// =----------------------------------------------------------------------------= Command: Join =--=

function runJoin(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpJoin() { return 'This command has not yet been implemented.'; }


// =---------------------------------------------------------------------------= Command: Leave =--=

function runLeave(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpLeave() { return 'This command has not yet been implemented.'; }


// =--------------------------------------------------------------------------= Command: Notify =--=

function runNotify(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpNotify() { return 'This command has not yet been implemented.'; }


// =------------------------------------------------------------------------= Command: Calendar =--=

function runCalendar(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpCalendar() { return 'This command has not yet been implemented.'; }


// =----------------------------------------------------------------------------= Command: Mute =--=

function runMute(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpMute() { return 'This command has not yet been implemented.'; }


// =-----------------------------------------------------------------------= Command: Available =--=

function runAvailable(environment, command, params) {
  return 'This command has not yet been implemented. Please hold tight, we\'ll get there!';
}

function helpAvailable() { return 'This command has not yet been implemented.'; }


// =----------------------------------------------------------------------------------= Helpers =--=

function formatGroupList(list) {
  if (list.length === 0) { return '(none)'; }
  return list.map(item => [item.name, item.private ? '(private)' : ''].join(' ')).join(', ')
}

function hasCommand(command) {
  return Object.keys(commandRouter).indexOf(command) !== -1;
}

function tokenizeParams(params) {
  return (params.match(/[\w@]+|"[^"]+"/g) || [])
  .map(item => item.replace(/"/g,"").trim());
}


// =----------------------------------------------------------------------------------= Handler =--=

exports.handler = (event, context, callback) => {
  const done = (error, result) => callback(null, {
    statusCode: error ? '400' : '200',
    body: error ? (error.message || error) : JSON.stringify({
      text: result,
      link_names: '1'
    }),
    headers: {
      'Content-Type': 'application/json'
    }
  });

  Promise.resolve(event)
  .then(processEvent)
  .then(function (message) { done(null, message); })
  .catch(done);
};
