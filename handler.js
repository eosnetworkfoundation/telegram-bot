const axios = require('axios');
const is = require('./is.js');
const joi = require('joi');
const moment = require('moment-timezone');
const pkg = require('./package.json');

/* joi schema */
// schema of a CloudWatch alarm state
const cloudwatchAlarmStateSchema = joi.object({
    reason: joi.string().required(),
    reasonData: joi.string().required(),
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

// determine if an SNS event came from an SNS topic used for testing
const isDevSnsTopic = (event) => {
    const testArn = accessEnv('DEV_EVENT_SOURCE_ARN');
    return !is.nullOrEmpty(testArn) && (testArn.includes(event.Records[0].Sns.TopicArn) || testArn.includes('*'));
};

// parse alarm state reasonData
const parseReasonData = (message) => {
    const output = message;
    output.detail.previousState.reasonData = JSON.parse(message.detail.previousState.reasonData);
    output.detail.state.reasonData = JSON.parse(message.detail.state.reasonData);
    return output;
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

// return timezones of interest
let _tz;
Object.defineProperty(this, 'timezone', {
    get: () => {
        if (is.nullOrEmpty(_tz)) {
            const tz = accessEnv('TIMEZONE');
            if (is.nullOrEmpty(tz) || tz === '[]') {
                _tz = ['UTC'];
            } else {
                _tz = JSON.parse(tz);
            }
        }
        return _tz;
    },
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

// replace pairs of back-ticks with HTML code tags
const parseInlineCode = str => str.replace(/`([^`]+)`/g, '<code>$1</code>');

// send a Telegram message
const pushTelegramMsg = async (message, chatId = this.chatId) => {
    console.log('Sending message to Telegram...');
    const response = await this.api.get('', {
        params: {
            chat_id: chatId,
            disable_web_page_preview: true,
            parse_mode: 'HTML',
            text: sanitize(message),
        },
    });
    if (response.status >= 300) {
        const msg = `Telegram returned an unexpected ${response.status} HTTP status code.`;
        console.error(`ERROR: ${msg}`, sanitize(response.data.toString()));
        throw new Error(msg);
    }
    console.log('Telegram message sent.');
    return response;
};

// send an error message to Telegram
const pushTelegramMsgErr = (err) => {
    try {
        const head = `❗ <b>${process.env.AWS_LAMBDA_FUNCTION_NAME}</b> ❗`;
        const gh = `<a href="${pkg.homepage}/tree/${this.version}">${enc(this.name)}:${pkg.git.tag || pkg.git.short_commit}</a>${(is.nullOrEmpty(pkg.git.tag)) ? ` from <code>${enc(pkg.git.branch)}</code>` : ''}`;
        const intro = `The <code>${process.env.AWS_LAMBDA_FUNCTION_NAME}</code> lambda running ${gh} just threw the following error:`;
        const stack = `<pre>${enc(err.stack)}</pre>`;
        const logs = `&gt;&gt; <a href="${this.logUri}">CloudWatch Logs</a> &lt;&lt;`;
        const tail = `Please contact ${enc(this.maintainer)} if you see this message.`;
        // join message parts
        const msg = `${head}\n${intro}\n\n${stack}\n\n${logs}\n\n${tail}`;
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
        result.body = await this.handler(event);
        result.statusCode = 200;
    } catch (error) {
        result.body = error;
        console.error(sanitize(`FATAL: ${error.message}`), sanitize(error.toString()));
        await pushTelegramMsgErr(error);
    }
    return result;
};

// format SNS message for humans
module.exports.formatCloudwatchEvent = (message) => {
    let emoji;
    let state;
    if (message.detail.state.value === 'ALARM') {
        emoji = '❌';
        state = 'triggered';
    } else if (message.detail.state.value === 'OK') {
        emoji = '✅';
        state = 'resolved';
    } else {
        emoji = '❔';
        state = 'ambiguous';
    }
    const head = `${emoji} <b>${message.detail.alarmName}</b> ${emoji}`;
    const intro = `The <code>${message.detail.alarmName}</code> alarm is ${state}!`;
    const description = parseInlineCode(enc(message.detail.configuration.description));
    const reason = enc(message.detail.state.reason.replace(/ [(][^)]*[0-9]{2}\/[0-9]{2}\/[0-9]{2}[^)]*[)]/, '')); // remove ambiguous timestamp(s) from reason string
    // print timestamp in timezones of interest
    const time = moment(message.detail.state.timestamp);
    let timestamp = 'Timestamp:\n<pre>';
    for (let i = 0; i < this.timezone.length; i++) {
        timestamp += `${time.tz(this.timezone[i]).format('YYYY-MM-DD HH:mm:ss.SSS z')}\n`;
    }
    timestamp += '</pre>';
    // construct and return message
    return `${head}\n${intro}\n${description}\n\n${reason}\n\n${timestamp}`;
};

// handle SNS event
module.exports.handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // validate event schema
    joi.assert(event, snsEventSchema, 'SNS event failed joi schema validation!');
    // parse and validate message contents
    let message = parseSnsMessage(event);
    joi.assert(message, cloudwatchEventSchema, 'SNS message failed joi schema validation!');
    message = parseReasonData(message);
    // send message to Telegram
    const response = await pushTelegramMsg(this.formatCloudwatchEvent(message), isDevSnsTopic(event) ? this.chatIdDev : this.chatIdCustomer);
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
