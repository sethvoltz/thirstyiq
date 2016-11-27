# ThirstyIQ

Bring your friends and coworkers together over a drink, whether it's coffee or beer, whiskey or tea, ThirstyIQ can help you let your group know when you're ready to share a glass.

[ThirstyIQ][] started as a Hack Day project at [SalesforceIQ][] to build a simple Slack application and evolved into a showcase of how to build a complete app using a variety of AWS serverless technologies, including Lambda, SNS, and DynamoDB.

## Installation

Go to [ThirstyIQ][] and click the "Add to Slack" button. This will request permissions for your Slack org and enable the `/thirsty` slash command. For help, start by running `/thirsty help`.

## Setup

{TBD}

## Development

{TBD}

### Slack Button

The Add to Slack button requires one additional permission than normal from Slack organizations so it can maintain an up-to-date mapping of usernames to user IDs. The link below includes the `users:read` permission to allow `users.list` API calls to be made. Modify it replacing `<APP_CLIENT_ID>` with your own.

```
https://slack.com/oauth/authorize?scope=incoming-webhook,commands,users:read&client_id=<APP_CLIENT_ID>
```

## Contributing

{TBD}

# Thanks

A special thanks to [SalesforceIQ][salesforceiq] for having an awesome development culture and an even more amazing set of coworkers. In particular my hack day partners Ryan, Carter and Joseph for making the initial project rock.

[thirstyiq]: https://thirstyiq.com
[salesforceiq]: https://salesforceiq.com
