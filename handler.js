const axios = require('axios');
const is = require('./is.js');

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

/* telegram */
// send a Telegram message
const pushTelegramMsg = async (message, chatId = this.chatId) => {
    console.log('Sending message to Telegram...');
    const response = await this.api.get('', {
        params: {
            chat_id: chatId,
            text: message,
        },
    });
    console.log('Telegram message sent.');
    return response;
};

// send an error message to Telegram
const pushTelegramMsgErr = (err) => {
    try {
        const msg = `❗ - ${process.env.AWS_LAMBDA_FUNCTION_NAME} - ❗\n${err.fileName}:${err.lineNumber}:${err.columnNumber}\n**${err.name}:** ${err.message}\`\`\`\n${err.stack}\`\`\`\nPlease contact ${this.maintainer} if you see this message.`;
        return pushTelegramMsg(msg, this.chatIdOwner);
    } catch (error) {
        console.error('ERROR: Failed to send an error message to the maintainer\'s Telegram.', error);
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
        console.error(`FATAL: ${error.message}`, error);
        await pushTelegramMsgErr(error);
    }
    return result;
};

module.exports.hello = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // message contents
    let message;
    try {
        message = event.Records[0].Sns.Message;
        console.log('Parsed SNS message.');
    } catch (error) {
        error.message = `Failed to parse message from SNS!\n${error.message}`;
        throw error;
    }
    // send message to Telegram
    const response = await pushTelegramMsg(message, this.chatIdCustomer);
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
    // sanitize result
    const result = JSON.stringify(rawResult, null, 4)
        .replace(new RegExp(_apiKey, 'g'), '${TELEGRAM_API_KEY}') // eslint-disable-line no-template-curly-in-string
        .replace(new RegExp(this.chatIdCustomer, 'g'), '${TELEGRAM_CHAT_ID}'); // eslint-disable-line no-template-curly-in-string
    console.log('Done.', result);
    // return useful information
    return result;
};
