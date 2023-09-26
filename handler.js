const axios = require('axios');
const is = require('./is.js');

// init Telegram API
const tgAPI = axios.create({
    baseURL: 'https://api.telegram.org',
});

// try loading an environment variable, optionally showing part of the value or falling back to a default
const loadEnv = (key, hint = false, dflt) => {
    const value = process.env[key];
    if (is.nullOrEmpty(value) && is.nullOrEmpty(dflt)) {
        const errMsg = `FATAL: ${key} is not defined in the environment!`;
        console.error(errMsg);
        throw new Error(errMsg);
    } else if (is.nullOrEmpty(value) && hint) {
        console.log(`No ${key} found in the environment, using default value ("${dflt.slice(0, 2)}...${dflt.slice(-4)}").`);
        return dflt;
    } else if (hint) {
        console.log(`Found ${value.length} char ${key} "${value.slice(0, 2)}...${value.slice(-4)}" in the environment.`);
    } else {
        console.log(`Found ${value.length} char ${key} in the environment.`);
    }
    return value;
};

// entrypoint
module.exports.hello = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // telegram bot API key
    const tgKey = loadEnv('TELEGRAM_API_KEY');
    const route = `/bot${tgKey}/sendMessage`;
    // telegram chat ID for customer notifications
    const chatId = loadEnv('TELEGRAM_CHAT_ID', true);
    // telegram chat ID for maintainer notifications
    const chatIdDev = loadEnv('TELEGRAM_CHAT_ID_DEV', true, chatId);
    // maintainer name or contact info
    const maintainer = loadEnv('MAINTAINER', true, 'the bot maintainer');
    // message contents
    let message;
    try {
        message = event.Records[0].Sns.Message;
        console.log('Parsed SNS message.');
    } catch (error) {
        message = `ERROR: Failed to parse message from SNS!\nPlease contact ${maintainer} if you see this message.`;
        console.error(message, error);
    }
    // send message to Telegram
    console.log('Sending message to Telegram...');
    const response = await tgAPI.get(route, {
        params: {
            chat_id: chatId,
            text: message,
        },
    });
    console.log('Telegram message sent.');
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
        .replace(new RegExp(tgKey, 'g'), '${TELEGRAM_API_KEY}') // eslint-disable-line no-template-curly-in-string
        .replace(new RegExp(chatId, 'g'), '${TELEGRAM_CHAT_ID}'); // eslint-disable-line no-template-curly-in-string
    console.log('Done.', result);
    // return useful information
    return {
        statusCode: 200,
        body: result,
    };
};
