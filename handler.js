const axios = require('axios');
const is = require('./is.js');

/* globals */
// telegram chat ID for error messages
let _chatIdErr;
Object.defineProperty(this, 'chatIdErr', {
    get: () => _chatIdErr || process.env.TELEGRAM_CHAT_ID_ERR,
    set: (id) => {
        _chatIdErr = id;
    },
});

// init Telegram API
const tgAPI = axios.create({
    baseURL: 'https://api.telegram.org',
});

// telegram API key
let _tgKey;
Object.defineProperty(this, 'tgKey', {
    get: () => _tgKey,
    set: (k) => {
        _tgKey = k;
    },
});

// telegram API route
Object.defineProperty(this, 'tgRoute', {
    get: () => `/bot${_tgKey}/sendMessage`,
});

/* functions */
// send a Telegram message
const pushTelegramMsg = async (message, chatId) => {
    console.log('Sending message to Telegram...');
    const response = await tgAPI.get(this.tgRoute, {
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
        const msg = `❗ - ${process.env.AWS_LAMBDA_FUNCTION_NAME} - ❗\n${err.fileName}:${err.lineNumber}:${err.columnNumber}\n**${err.name}:** ${err.message}\`\`\`\n${err.stack}\`\`\``;
        return pushTelegramMsg(msg, this.chatIdErr);
    } catch (error) {
        console.error('ERROR: Failed to send an error message to the maintainer\'s Telegram.', error);
        return Promise.resolve();
    }
};

// try loading an environment variable, optionally showing part of the value or falling back to a default
const readEnv = (key, hint = false, dflt) => {
    const value = process.env[key];
    if (is.nullOrEmpty(value) && is.nullOrEmpty(dflt)) {
        const errMsg = `FATAL: ${key} is not defined in the environment!`;
        const err = new Error(errMsg);
        console.error(errMsg, err);
        throw err;
    } else if (is.nullOrEmpty(value) && hint) {
        console.log(`No ${key} found in the environment, using default value ("${dflt.slice(0, 2)}...${dflt.slice(-4)}").`);
        return dflt;
    } else if (hint) {
        console.log(`Found ${value.length} char ${key} ("${value.slice(0, 2)}...${value.slice(-4)}") in the environment.`);
    } else {
        console.log(`Found ${value.length} char ${key} in the environment.`);
    }
    return value;
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
        console.error(`FATAL: ${error.name} - ${error.message}`, error);
        await pushTelegramMsgErr(error);
    }
    return result;
};

module.exports.hello = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // read environment variables
    this.tgKey = readEnv('TELEGRAM_API_KEY'); // telegram bot API key
    const chatIdProd = readEnv('TELEGRAM_CHAT_ID', true); // telegram chat ID for customer notifications
    const chatIdDev = readEnv('TELEGRAM_CHAT_ID_DEV', true, chatIdProd); // telegram chat ID for maintainer notifications
    const maintainer = readEnv('MAINTAINER', true, 'the bot maintainer'); // maintainer name or contact info
    // message contents
    let message;
    try {
        message = event.Records[0].Sns.Message;
        console.log('Parsed SNS message.');
    } catch (error) {
        message = `ERROR: Failed to parse message from SNS!\nPlease contact ${maintainer} if you see this message.`;
        console.error(message, error);
        pushTelegramMsg(message, chatIdDev);
    }
    // send message to Telegram
    const response = await pushTelegramMsg(message, chatIdProd);
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
        .replace(new RegExp(this.tgKey, 'g'), '${TELEGRAM_API_KEY}') // eslint-disable-line no-template-curly-in-string
        .replace(new RegExp(chatIdProd, 'g'), '${TELEGRAM_CHAT_ID}'); // eslint-disable-line no-template-curly-in-string
    console.log('Done.', result);
    // return useful information
    return result;
};
