# Telegram Bot
"[Serverless](https://www.serverless.com)" JavaScript project to deliver instant message (IM) notifications via Telegram using an Amazon Web Services (AWS) [Lambda](https://aws.amazon.com/lambda).

### Index
1. [Development](#development)
    1. [Prerequisites](#prerequisites)
    1. [Initialization](#initialization)
    1. [Lint](#lint)
    1. [Test](#test)
1. [Inputs](#inputs)
    1. [Environment Variables](#environment-variables)
    1. [Events](#events)
1. [Outputs](#outputs)

## Development
Start here to build this project or to contribute to this repo.

### Prerequisites
You will need the following tools:
- [nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- [nodeJS](https://www.w3schools.com/nodejs/nodejs_intro.asp)  
    Install `node` using `nvm`. In the root of this repo:
    ```bash
    nvm install
    ```
    This will automagically install and use the correct version of `node` for this project, as defined in the [`.nvmrc`](./.nvmrc) file.
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

## Inputs
This lambda receives two primary inputs, AWS Simple Notification Service (SNS) event payloads delivered by AWS and user-defined environment variables to configure the script.

### Environment Variables
This lambda is configured entirely with environment variables to make deployment in AWS easy.

Key | Usage | Type | Description
--- | --- | --- | ---
`AWS_LAMBDA_FUNCTION_NAME` | [AWS Intrinsic](https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html#configuration-envvars-runtime) | String | The name of the lambda function, used when sending error notifications.
`DEV_EVENT_SOURCE_ARN` | Optional | JSON string array | List of event source ARNs to send to `TELEGRAM_CHAT_ID_DEV` instead of `TELEGRAM_CHAT_ID`, for testing.
`MAINTAINER` | Optional | String | Name or contact info for the bot maintainer.
`TELEGRAM_API_KEY` | Required | String | The API key for the Telegram bot.
`TELEGRAM_CHAT_ID` | Required | String | Telegram chat ID for customer-facing notifications.
`TELEGRAM_CHAT_ID_DEV` | Optional | String | Telegram chat ID for test notifications.
`TELEGRAM_CHAT_ID_OWNER` | Optional | String | Telegram chat ID for runtime errors to be delivered to the bot owner, operator, or maintainer.

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
        "Message": "{\"version\":\"0\",\"id\":\"c4c1c1c9-6542-e61b-6ef0-8c4d36933a92\",\"detail-type\":\"CloudWatch Alarm State Change\",\"source\":\"aws.cloudwatch\",\"account\":\"123456789012\",\"time\":\"2019-10-02T17:04:40Z\",\"region\":\"us-east-1\",\"resources\":[\"arn:aws:cloudwatch:us-east-1:123456789012:alarm:ServerCpuTooHigh\"],\"detail\":{\"alarmName\":\"ServerCpuTooHigh\",\"configuration\":{\"description\":\"Goes into alarm when server CPU utilization is too high!\",\"metrics\":[{\"id\":\"30b6c6b2-a864-43a2-4877-c09a1afc3b87\",\"metricStat\":{\"metric\":{\"dimensions\":{\"InstanceId\":\"i-12345678901234567\"},\"name\":\"CPUUtilization\",\"namespace\":\"AWS/EC2\"},\"period\":300,\"stat\":\"Average\"},\"returnData\":true}]},\"previousState\":{\"reason\":\"Threshold Crossed: 1 out of the last 1 datapoints [0.0666851903306472 (01/10/19 13:46:00)] was not greater than the threshold (50.0) (minimum 1 datapoint for ALARM -> OK transition).\",\"reasonData\":\"{\\\"version\\\":\\\"1.0\\\",\\\"queryDate\\\":\\\"2019-10-01T13:56:40.985+0000\\\",\\\"startDate\\\":\\\"2019-10-01T13:46:00.000+0000\\\",\\\"statistic\\\":\\\"Average\\\",\\\"period\\\":300,\\\"recentDatapoints\\\":[0.0666851903306472],\\\"threshold\\\":50.0}\",\"timestamp\":\"2019-10-01T13:56:40.987+0000\",\"value\":\"OK\"},\"state\":{\"reason\":\"Threshold Crossed: 1 out of the last 1 datapoints [99.50160229693434 (02/10/19 16:59:00)] was greater than the threshold (50.0) (minimum 1 datapoint for OK -> ALARM transition).\",\"reasonData\":\"{\\\"version\\\":\\\"1.0\\\",\\\"queryDate\\\":\\\"2019-10-02T17:04:40.985+0000\\\",\\\"startDate\\\":\\\"2019-10-02T16:59:00.000+0000\\\",\\\"statistic\\\":\\\"Average\\\",\\\"period\\\":300,\\\"recentDatapoints\\\":[99.50160229693434],\\\"threshold\\\":50.0}\",\"timestamp\":\"2019-10-02T17:04:40.989+0000\",\"value\":\"ALARM\"}}}",
        "Timestamp": "2023-09-26T00:31:17.412Z",
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
The SNS event contains a `message` payload from CloudWatch that looks like this when unpacked.
```json
{
  "version": "0",
  "id": "c4c1c1c9-6542-e61b-6ef0-8c4d36933a92",
  "detail-type": "CloudWatch Alarm State Change",
  "source": "aws.cloudwatch",
  "account": "123456789012",
  "time": "2019-10-02T17:04:40Z",
  "region": "us-east-1",
  "resources": ["arn:aws:cloudwatch:us-east-1:123456789012:alarm:ServerCpuTooHigh"],
  "detail": {
    "alarmName": "ServerCpuTooHigh",
    "configuration": {
      "description": "Goes into alarm when server CPU utilization is too high!",
      "metrics": [{
        "id": "30b6c6b2-a864-43a2-4877-c09a1afc3b87",
        "metricStat": {
          "metric": {
            "dimensions": {
              "InstanceId": "i-12345678901234567"
            },
            "name": "CPUUtilization",
            "namespace": "AWS/EC2"
          },
          "period": 300,
          "stat": "Average"
        },
        "returnData": true
      }]
    },
    "previousState": {
      "reason": "Threshold Crossed: 1 out of the last 1 datapoints [0.0666851903306472 (01/10/19 13:46:00)] was not greater than the threshold (50.0) (minimum 1 datapoint for ALARM -> OK transition).",
      "reasonData": "{\"version\":\"1.0\",\"queryDate\":\"2019-10-01T13:56:40.985+0000\",\"startDate\":\"2019-10-01T13:46:00.000+0000\",\"statistic\":\"Average\",\"period\":300,\"recentDatapoints\":[0.0666851903306472],\"threshold\":50.0}",
      "timestamp": "2019-10-01T13:56:40.987+0000",
      "value": "OK"
    },
    "state": {
      "reason": "Threshold Crossed: 1 out of the last 1 datapoints [99.50160229693434 (02/10/19 16:59:00)] was greater than the threshold (50.0) (minimum 1 datapoint for OK -> ALARM transition).",
      "reasonData": "{\"version\":\"1.0\",\"queryDate\":\"2019-10-02T17:04:40.985+0000\",\"startDate\":\"2019-10-02T16:59:00.000+0000\",\"statistic\":\"Average\",\"period\":300,\"recentDatapoints\":[99.50160229693434],\"threshold\":50.0}",
      "timestamp": "2019-10-02T17:04:40.989+0000",
      "value": "ALARM"
    }
  }
}
```
The schema of this CloudWatch "alarm state change" message is also validated using `joi`.

## Outputs
This lambda has three primary outputs:
1. Telegram messages:
    - Customer-facing notifications.
    - Developer-facing test notifications.
    - Notifications about runtime errors intended for the maintainer.
1. Logs in CloudWatch.
1. Return value, a JSON object with this schema:
    - **body**:
        - **input** - original event received by the lambda.
        - **message** - parsed SNS message.
        - **output**:
            - **data** - data from the Telegram API response.
            - **error** - any error encountered during the Telegram request.
            - **status** - HTTP status of the Telegram response.
    - **statusCode** - HTTP response for the lambda as a whole.

The lambda makes a good-faith attempt to sanitize secrets from Telegram message contents and log output, but it is ultimately the responsibility of the bot operator to ensure secrets are not leaked.

---
> **_Legal Notice_**  
Some content in this repository was generated in collaboration with one or more machine learning algorithms or weak artificial intelligence (AI). This notice is required in some countries.
