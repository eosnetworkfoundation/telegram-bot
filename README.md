# Telegram Bot
JavaScript project to deliver instant message (IM) notifications via Telegram using an Amazon Web Services (AWS) [Lambda](https://aws.amazon.com/lambda).

> [!IMPORTANT]
> Only tagged releases are considered "stable" software in this repo at this time.

### Index
1. [Development](#development)
    1. [Prerequisites](#prerequisites)
    1. [Initialization](#initialization)
    1. [Lint](#lint)
    1. [Test](#test)
    1. [Build](#build)
1. [CI](#ci)
1. [Inputs](#inputs)
    1. [Environment Variables](#environment-variables)
    1. [Events](#events)
1. [Outputs](#outputs)

## Development
Start here to build this project or to contribute to this repo.

> [!NOTE]
> The source of truth for the version of nodeJS this project supports is the [`.nvmrc`](.nvmrc) file. Backward- or forward-compatibility with other versions of `node` is made on a best-effort basis, but is not guaranteed.

### Prerequisites
You will need the following tools:
- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- [nodeJS](https://www.w3schools.com/nodejs/nodejs_intro.asp)  
    Install `node` using `nvm`. In the root of this repo:
    ```bash
    nvm install
    ```
    This will automagically install and use the correct version of `node` for this project, as defined in the [`.nvmrc`](.nvmrc) file.
- [yarn](https://yarnpkg.com) version 1  
    The easiest way to install this is using `npm`, which is installed with `node` by `nvm`.
    ```bash
    npm install --global yarn
    ```
These tools are all you need to get started!

### Initialization
Once you have the [prerequisites](#prerequisites) installed, you can get going by making sure `nvm` is using the correct version of nodeJS...
```bash
nvm install
```
...and then downloading all project dependencies.
```bash
yarn
```
Easy.

### Lint
This project uses [eslint](https://eslint.org) with customizations on top of the [airbnb-base](https://www.npmjs.com/package/eslint-config-airbnb-base) config to perform static code analysis.
```bash
yarn lint
```
The purpose of linting is to catch bugs early, not to create unnecessary friction, so many rules which will not realistically catch bugs are disabled.

### Test
This project uses the [jest](https://jestjs.io) test framework.
```bash
yarn test
```
The goal is full test coverage, not because we chased a number, but because we exhaustively tested all intended functionality.

### Build
This is how release artifacts are generated.
```bash
yarn build
```
The "build" generates a `*.zip` archive in the root of the repo that can be uploaded directly to AWS Lambda using the web console, AWS CLI, or with something like ~~Terraform~~ Tofu.

The output of `yarn pack` is **_not_** compatible with AWS. AWS requires the dependencies (`node_modules`) to be packed in the `*.zip` file for lambdas, so it may be wise to do your own build with updated dependencies to make sure your deployment is not missing any security patches published for dependencies since our latest release. If you are building a tag, the script requires the version in the `git` tag to match the version in the `package.json`. Finally, the build script does briefly move your `node_modules` folder in order to guarantee developer dependencies are not packed into the `*.zip` file so it is as small as possible. The script puts your `node_modules` back afterwards so this should hopefully not be a problem for anyone.

## CI
This repo contains the following GitHub Actions workflow for continuous integration (CI):
- **telegram-bot CI** - lint, test, and build the `telegram-bot` project.
    - [Pipeline](https://github.com/eosnetworkfoundation/telegram-bot/actions/workflows/ci.yml)
    - [Documentation](./.github/workflows/ci.md)

See the pipeline documentation for more information.

## Inputs
This lambda receives two primary inputs:
1. User-defined environment variables to configure lambda behavior.
1. AWS Simple Notification Service (SNS) event payloads delivered by AWS, where the `Message` field contains a string to be delivered (almost) verbatim as a Telegram notification.

Special attention should be paid to your lambda function name(s), alarm name(s), and alarm description(s). The resource name is the only real identifier sent to the maintainer or the customer to determine where an error message is coming from, and the alarm description is included verbatim in the message body. Your resource names need to be unique enough to globally identify these resources, especially if you have multiple AWS accounts. The alarm description should be something useful. For example, to copy the AWS example below, "This alarm triggers when the US datacenter API server CPU utilization is above 50% for five minutes."

### Environment Variables
This lambda is configured entirely with environment variables to make deployment in AWS easy.

Key | Usage | Type | Description
--- | --- | --- | ---
`AWS_DEFAULT_REGION` | [AWS Intrinsic](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime) | String | Used to link maintainer to CloudWatch logs on error.
`AWS_LAMBDA_FUNCTION_NAME` | [AWS Intrinsic](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime) | String | The name of the lambda function, used when sending error notifications.
`AWS_LAMBDA_LOG_GROUP_NAME` | [AWS Intrinsic](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime) | String | Used to link maintainer to CloudWatch logs on error.
`AWS_LAMBDA_LOG_STREAM_NAME` | [AWS Intrinsic](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime) | String | Used to link maintainer to CloudWatch logs on error.
`AWS_REGION` | [AWS Intrinsic](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime) | String | Used to link maintainer to CloudWatch logs on error.
`MAINTAINER` | Optional | String | Name or contact info for the bot maintainer.
`REPLACE` | Optional | 2D JSON string array | For each top-level element, the first string is replaced with the second when sanitizing strings.
`TELEGRAM_API_KEY` | Required | String | The API key for the Telegram bot.
`TELEGRAM_CHAT_ID` | Required | String | Telegram chat ID for customer-facing notifications.
`TELEGRAM_CHAT_ID_DEV` | Optional | String | Telegram chat ID for test notifications.
`TELEGRAM_CHAT_ID_OWNER` | Optional | String | Telegram chat ID for runtime errors to be delivered to the bot owner, operator, or maintainer.
`TEST_EVENT_SOURCE_ARN` | Optional | JSON string array | List of event source ARNs to send to `TELEGRAM_CHAT_ID_DEV` instead of `TELEGRAM_CHAT_ID`, for testing.

### Events
This lambda currently only supports SNS events as input. Event schema is validated using [joi](https://joi.dev). EventBridge events or inputs from other sources will throw a `ValidationError` exception.

The SNS event schema looks like this.
```json
{
  "Records": [
    {
      "EventSource": "aws:sns",
      "EventVersion": "1.0",
      "EventSubscriptionArn": "arn:aws:sns:us-east-1:123456789012:sns-topic-name-goes-here:d9a4b8f1-36e7-4702-9e5d-2f1c871496ab",
      "Sns": {
        "Type": "Notification",
        "MessageId": "f3a8c7e9-241b-4d61-9e0c-86d4b2f8c730",
        "TopicArn": "arn:aws:sns:us-east-1:123456789012:sns-topic-name-goes-here",
        "Subject": null,
        "Message": "❌ **acmecorp-us-east_server-cpu-too-high** ❌\nThe `acmecorp-us-east_server-cpu-too-high` alarm is triggered! This alarm triggers when CPU utilization of the `acmecorp-us-east` server exceeds 50% for five minutes.\n\nReason:\n```\nThreshold Crossed: 1 out of the last 1 datapoints [99.50160229693434] was greater than the threshold (50.0) (minimum 1 datapoint for OK -> ALARM transition).\n```\nTimestamp:\n```\n2019-02-10 16:59:00.412 EDT\n```\nPlease put eyes 👀 on this message if you are investigating this.",
        "Timestamp": "2019-02-10T21:59:00.412Z",
        "SignatureVersion": "1",
        "Signature": "VG9nZXJtZW50UGxhY2Vob2xkZXIxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMA==",
        "SigningCertUrl": "https://sns.us-east-1.amazonaws.com/SimpleNotificationService-s8f4a1b7c0e9d3a4e5e2b3d6a9c7b0f1.pem",
        "UnsubscribeUrl": "https://sns.us-east-1.amazonaws.com/?Action=Unsubscribe&SubscriptionArn=arn:aws:sns:us-east-1:123456789012:sns-topic-name-goes-here:d9a4b8f1-36e7-4702-9e5d-2f1c871496ab",
        "MessageAttributes": {}
      }
    }
  ]
}
```
The `Message` property must contain a non-empty string to be delivered as a Telegram notification. The following transforms are performed on this string:
1. Secrets are replaced with a placeholder (e.g. `${TELEGRAM_API_KEY}`), and any user-defined string replacements are performed.
1. Any `<`, `>`, and `&` characters are turned into an HTML escape sequence, as required by Telegram.
1. Limited markdown syntax is converted to HTML.

The example payload above is the output of the [aws-cloudwatch-alarm-handler](https://github.com/eosnetworkfoundation/aws-cloudwatch-alarm-handler) lambda, which can be used to generate human-friendly notifications for arbitrary CloudWatch alarms.

## Outputs
This lambda has three primary outputs:
1. Telegram messages:
    - Customer-facing notifications.
    - Developer-facing test notifications.
    - Notifications about runtime errors intended for the maintainer.
1. Logs in CloudWatch.
1. Return value, a JSON object with this schema:
    - **body**:
        - **data** - data from the Telegram API response.
        - **error** - any error encountered during the Telegram request.
        - **status** - HTTP status of the Telegram response.
    - **statusCode** - HTTP response for the lambda as a whole.

The lambda makes a good-faith attempt to sanitize secrets from Telegram message contents and log output, but it is ultimately the responsibility of the bot operator to ensure secrets are not leaked.

---
> **_Legal Notice_**  
Some content in this repository was generated in collaboration with one or more machine learning algorithms or weak artificial intelligence (AI). This notice is required in some countries.
