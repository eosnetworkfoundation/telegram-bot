const axios = require('axios');
const is = require('./is.js');
const joi = require('joi');
const pkg = require('./package.json');

/* schema */
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
// determine if an SNS event came from an SNS topic used for testing
const isDevSnsTopic = (event) => {
    const testArn = this.readEnv('DEV_EVENT_SOURCE_ARN', true);
    return !is.nullOrEmpty(testArn) && (testArn.includes(event.Records[0].Sns.TopicArn) || testArn.includes('*'));
};

/* globals */
// telegram API integration
let _api;
Object.defineProperty(this, 'api', {
    get: () => {
        if (is.nullOrEmpty(_api)) {
            const apiKey = this.readEnv('TELEGRAM_API_KEY', false);
            if (is.nullOrEmpty(apiKey)) {
                throw new Error('TELEGRAM_API_KEY is not defined in the environment!');
            }
            _api = axios.create({
                baseURL: `https://api.telegram.org/bot${apiKey}/sendMessage`,
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
            _chatIdCustomer = this.readEnv('TELEGRAM_CHAT_ID', 'hint');
            if (is.nullOrEmpty(_chatIdCustomer)) {
                throw new Error('TELEGRAM_CHAT_ID is not defined in the environment!');
            }
        }
        return _chatIdCustomer;
    },
});

// telegram chat ID for test notifications
Object.defineProperty(this, 'chatIdDev', {
    get: () => this.readEnv('TELEGRAM_CHAT_ID_DEV', 'hint'),
});

// telegram chat ID for alerts to the bot owner/maintainer
Object.defineProperty(this, 'chatIdOwner', {
    get: () => this.readEnv('TELEGRAM_CHAT_ID_OWNER', 'hint'),
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

// name or contact info for the bot maintainer
Object.defineProperty(this, 'maintainer', {
    get: () => this.readEnv('MAINTAINER', true),
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

/* functions */
// lambda entrypoint; try to catch, log, and notify on error
module.exports.handler = async (event) => {
    const result = {
        statusCode: 500,
        body: 'FATAL: Unknown error!',
    };
    try {
        result.body = await this.main(event);
        result.statusCode = 200;
    } catch (error) {
        result.body = error;
        console.error(this.sanitize(`FATAL: ${error.message}`), this.sanitize(error.toString()));
        try {
            const notification = this.notificationFromError(error);
            await this.pushTelegramMsg(notification, this.chatIdOwner || this.chatId);
        } catch (err) {
            console.error('ERROR: Failed to send an error message to the maintainer\'s Telegram.', this.sanitize(err.toString()));
        }
    }
    return result;
};

// handle SNS event
module.exports.main = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // validate event schema
    joi.assert(event, snsEventSchema, 'SNS event failed joi schema validation!');
    // parse and validate message contents
    const message = event.Records[0].Sns.Message;
    // send message to Telegram
    const response = await this.pushTelegramMsg(message, isDevSnsTopic(event) ? this.chatIdDev : this.chatIdCustomer);
    // sanitize, print, and return result
    const result = this.sanitize(JSON.stringify(response, null, 4));
    console.log('Done.', result);
    return result;
};

// convert a markdown string to HTML
module.exports.markdownToHtml = (markdown) => markdown
    .replace(/(`{3,})(?:\n*)((?:(?!\1)[\s\S])+?)(?:\n*)\1/g, '<pre>$2</pre>') // code blocks
    .replace(/(?<!`)`([^`]+)`(?!`)/g, '<code>$1</code>') // inline code
    .replace(/(?<!\*)[*]{2}([^*]+)[*]{2}(?!\*)/g, '<b>$1</b>') // bold
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>'); // hyperlinks

// return a human-friendly notification body from a nodeJS error
module.exports.notificationFromError = (error) => {
    const head = `❗ <b>${process.env.AWS_LAMBDA_FUNCTION_NAME}</b> ❗`;
    const gh = `<a href="${pkg.homepage}/tree/${this.version}">${enc(this.name)}:${pkg.git.tag || pkg.git.short_commit}</a>${(is.nullOrEmpty(pkg.git.tag)) ? ` from <code>${enc(pkg.git.branch)}</code>` : ''}`;
    const intro = `The <code>${process.env.AWS_LAMBDA_FUNCTION_NAME}</code> lambda running ${gh} just threw the following error:`;
    const stack = `<pre>${enc(error.stack)}</pre>`;
    const logs = `&gt;&gt; <a href="${this.logUri}">CloudWatch Logs</a> &lt;&lt;`;
    const tail = `Please contact ${enc(this.maintainer)} if you see this message.`;
    // join message parts
    return `${head}\n${intro}\n\n${stack}\n\n${logs}\n\n${tail}`;
};

// send a Telegram message
module.exports.pushTelegramMsg = async (message, chatId = this.chatId) => {
    console.log('Sending message to Telegram...');
    const response = await this.api.get('', {
        params: {
            chat_id: chatId,
            disable_web_page_preview: true,
            parse_mode: 'HTML',
            text: this.sanitize(message),
        },
    });
    if (response.status >= 300) {
        throw new Error(`Telegram returned an unexpected ${response.status} HTTP status code.`);
    }
    console.log('Telegram message sent.');
    return response;
};

// read an environment variable and log the status without disclosing secrets
module.exports.readEnv = (key, writeToLog) => {
    const value = process.env[key];
    if (is.nullOrEmpty(value)) {
        console.warn(`WARNING: "${key}" is not defined in the environment!`);
    } else if (writeToLog === true) {
        console.log(`Read "${key}" as "${value}" from the environment.`);
    } else if (writeToLog === 'hint') {
        console.log(`Read "${key}" as "${value.slice(0, 2)}...${value.slice(-4)}" from the environment.`);
    } else {
        console.log(`Read "${key}" with ${value.length} char from the environment.`);
    }
    return value;
};

// try to remove secrets from a string
module.exports.sanitize = (str) => str
    /* eslint-disable no-template-curly-in-string */
    .replace(new RegExp(process.env.TELEGRAM_API_KEY, 'g'), '${TELEGRAM_API_KEY}')
    .replace(new RegExp(process.env.TELEGRAM_CHAT_ID, 'g'), '${TELEGRAM_CHAT_ID}')
    .replace(new RegExp(process.env.TELEGRAM_CHAT_ID_DEV, 'g'), '${TELEGRAM_CHAT_ID_DEV}')
    .replace(new RegExp(process.env.TELEGRAM_CHAT_ID_OWNER, 'g'), '${TELEGRAM_CHAT_ID_OWNER}');
    /* eslint-enable no-template-curly-in-string */ // eslint-disable-line indent
