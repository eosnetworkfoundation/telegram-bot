const axios = require('axios');
const is = require('./is.js');
const joi = require('joi');
const pkg = require('./package.json');

/* joi schema */
// schema of a CloudWatch alarm state
const cloudwatchAlarmStateSchema = joi.object({
    reason: joi.string().required(),
    timestamp: joi.string().isoDate().required(),
    value: joi.string().valid('ALARM', 'OK', 'INSUFFICIENT_DATA').required(),
}).unknown();

// schema of an unpacked CloudWatch alarm state change event
const cloudwatchEventSchema = joi.object({
    account: joi.string().pattern(/^[0-9]+$/).required(),
    detail: joi.object({
        alarmName: joi.string().required(),
        configuration: joi.object({
            description: joi.string().allow(null).required(),
        }).unknown().required(),
        previousState: cloudwatchAlarmStateSchema.required(),
        state: cloudwatchAlarmStateSchema.required(),
    }).unknown().required(),
    'detail-type': joi.string().valid('CloudWatch Alarm State Change').required(),
    source: joi.string().valid('aws.cloudwatch').required(),
}).unknown();

// schema of a single SNS event "record"
const snsEventRecordSchema = joi.object({
    EventSource: joi.string().valid('aws:sns').required(),
    Sns: joi.object({
        Message: joi.string().required(),
        Subject: joi.string().allow(null).required(),
        TopicArn: joi.string().required(),
        Type: joi.string().valid('Notification').required(),
    }).unknown(),
}).unknown().label('SNS event record');

// schema of an SNS event containing one or more "records"
const snsEventSchema = joi.object({
    Records: joi.array().items(snsEventRecordSchema).min(1).required(),
}).unknown();

/* functions */
// read an environment variable and log the status
const accessEnv = (key, secret = true) => {
    const value = process.env[key];
    if (is.nullOrEmpty(value)) {
        console.warn(`WARNING: ${key} is not defined in the environment!`);
    } else {
        console.log(`Read ${value.length} char ${key}${secret ? '' : ` ("${value.slice(0, 2)}...${value.slice(-4)}")`} from the environment.`);
    }
    return value;
};

// determine if an SNS message came from an SNS topic used for testing
const isDevSnsTopic = (message) => {
    const testArn = accessEnv('DEV_EVENT_SOURCE_ARN');
    return !is.nullOrEmpty(testArn) && (testArn.includes(message.TopicArn) || testArn.includes('*'));
};

// extract SNS message contents from an SNS event
const parseSnsMessage = (event) => {
    console.log('Parsing SNS message...');
    let message;
    const rawMessage = event.Records[0].Sns.Message;
    if (is.nullOrEmpty(rawMessage)) {
        console.log('SNS message is empty.');
        message = rawMessage;
    } else if (is.string(rawMessage)) {
        try {
            message = JSON.parse(rawMessage);
            console.log('SNS message parsed as JSON.');
        } catch (error) {
            console.log('SNS message is a non-empty string that does not parse as JSON.');
            message = rawMessage;
        }
    } else {
        console.log('SNS message is not empty or a string.');
        message = rawMessage;
    }
    console.log('Parsed SNS message.');
    return message;
};

// scrub sensitive data from a string
const sanitize = (str) => str
    /* eslint-disable no-template-curly-in-string */
    .replace(new RegExp(process.env.TELEGRAM_API_KEY, 'g'), '${TELEGRAM_API_KEY}')
    .replace(new RegExp(process.env.TELEGRAM_CHAT_ID, 'g'), '${TELEGRAM_CHAT_ID}')
    .replace(new RegExp(process.env.TELEGRAM_CHAT_ID_DEV, 'g'), '${TELEGRAM_CHAT_ID_DEV}')
    .replace(new RegExp(process.env.TELEGRAM_CHAT_ID_OWNER, 'g'), '${TELEGRAM_CHAT_ID_OWNER}');
    /* eslint-enable no-template-curly-in-string */

/* globals */
// telegram API integration
let _api;
let _apiKey;
Object.defineProperty(this, 'api', {
    get: () => {
        if (is.nullOrEmpty(_api)) {
            _apiKey = accessEnv('TELEGRAM_API_KEY', true);
            if (is.nullOrEmpty(_apiKey)) {
                throw new Error('TELEGRAM_API_KEY is not defined in the environment!');
            }
            _api = axios.create({
                baseURL: `https://api.telegram.org/bot${_apiKey}/sendMessage`,
            });
        }
        return _api;
    },
});

// telegram chat ID for customer notifications
let _chatIdCustomer;
Object.defineProperty(this, 'chatIdCustomer', {
    get: () => {
        if (is.nullOrEmpty(_chatIdCustomer)) {
            _chatIdCustomer = accessEnv('TELEGRAM_CHAT_ID', false);
            if (is.nullOrEmpty(_chatIdCustomer)) {
                throw new Error('TELEGRAM_CHAT_ID is not defined in the environment!');
            }
        }
        return _chatIdCustomer;
    },
});

// telegram chat ID for test notifications
Object.defineProperty(this, 'chatIdDev', {
    get: () => accessEnv('TELEGRAM_CHAT_ID_DEV', false),
});

// telegram chat ID for alerts to the bot owner/maintainer
Object.defineProperty(this, 'chatIdOwner', {
    get: () => accessEnv('TELEGRAM_CHAT_ID_OWNER', false),
});

// name or contact info for the bot maintainer
Object.defineProperty(this, 'maintainer', {
    get: () => accessEnv('MAINTAINER'),
});

// return the log URI
Object.defineProperty(this, 'logUri', {
    get: () => {
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
        const logGroupName = encodeURIComponent(process.env.AWS_LAMBDA_LOG_GROUP_NAME);
        const logStreamName = encodeURIComponent(process.env.AWS_LAMBDA_LOG_STREAM_NAME);
        return `https://console.aws.amazon.com/cloudwatch/home?region=${region}#logsV2:log-groups/log-group/${logGroupName}/log-events/${logStreamName}`;
    },
});

// return the package name
Object.defineProperty(this, 'name', {
    get: () => pkg.name,
});

// return the git version of this build
Object.defineProperty(this, 'version', {
    get: () => ((is.nullOrEmpty(pkg.git.tag)) ? pkg.git.commit : pkg.git.tag),
});

/* telegram */
// take a string and replace HTML characters with escape sequences as required for Telegram
const enc = (str) => {
    const replacements = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
    };
    return str.replace(/[&<>]/g, char => replacements[char]);
};

// send a Telegram message
const pushTelegramMsg = async (message, chatId = this.chatId) => {
    console.log('Sending message to Telegram...');
    const response = await this.api.get('', {
        params: {
            chat_id: chatId,
            parse_mode: 'HTML',
            text: sanitize(message),
        },
    });
    console.log('Telegram message sent.');
    return response;
};

// send an error message to Telegram
const pushTelegramMsgErr = (err) => {
    try {
        const head = `❗ <b>${process.env.AWS_LAMBDA_FUNCTION_NAME}</b> ❗`;
        const stack = `<pre>${enc(err.stack)}</pre>`;
        const gh = `GitHub: <a href="${pkg.homepage}/tree/${this.version}">${enc(this.name)}:${this.version}</a>`;
        const logs = `&gt;&gt; <a href="${this.logUri}">CloudWatch Logs</a> &lt;&lt;`;
        const tail = `Please contact ${enc(this.maintainer)} if you see this message.`;
        // join message parts
        const msg = `${head}\n\n${stack}\n\n${gh}\n${logs}\n\n${tail}`;
        return pushTelegramMsg(msg, this.chatIdOwner || this.chatId);
    } catch (error) {
        console.error('ERROR: Failed to send an error message to the maintainer\'s Telegram.', sanitize(error.toString())); // we do not propagate this error because there is a higher error we want to alert on
        return Promise.resolve();
    }
};

/* entrypoint */
module.exports.entrypoint = async (event) => {
    const result = {
        statusCode: 500,
        body: 'FATAL: Unknown error!',
    };
    try {
        result.body = await this.hello(event);
        result.statusCode = 200;
    } catch (error) {
        result.body = error;
        console.error(sanitize(`FATAL: ${error.message}`), sanitize(error.toString()));
        await pushTelegramMsgErr(error);
    }
    return result;
};

module.exports.hello = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // validate event schema
    joi.assert(event, snsEventSchema, 'SNS event failed joi schema validation!');
    // parse and validate message contents
    const message = parseSnsMessage(event);
    joi.assert(message, cloudwatchEventSchema, 'SNS message failed joi schema validation!');
    // send message to Telegram
    const response = await pushTelegramMsg(message, isDevSnsTopic(message) ? this.chatIdDev : this.chatIdCustomer);
    // construct useful data to return
    const rawResult = {
        input: event,
        message,
        output: {
            data: response.data || null,
            error: response.error || null,
            status: response.status || null,
        },
    };
    // sanitize, print, and return result
    const result = sanitize(JSON.stringify(rawResult, null, 4));
    console.log('Done.', result);
    return result;
};
