const axios = require('axios');
const is = require('./is.js');

const tgAPI = axios.create({
    baseURL: 'https://api.telegram.org',
});

module.exports.hello = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 4));
    // telegram bot API key
    const tgKey = process.env.TELEGRAM_API_KEY;
    if (is.nullOrEmpty(tgKey)) {
        throw new Error('Fatal: TELEGRAM_API_KEY is not defined in the environment!');
    } else {
        console.log(`Found ${tgKey.length} char TELEGRAM_API_KEY in the environment.`);
    }
    const route = `/bot${tgKey}/sendMessage`;
    // telegram chat ID
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (is.nullOrEmpty(chatId)) {
        throw new Error('Fatal: TELEGRAM_CHAT_ID is not defined in the environment!');
    } else {
        console.log(`Found ${chatId.length} char TELEGRAM_CHAT_ID "${chatId.slice(0, 2)}...${chatId.slice(-4)}" in the environment.`);
    }
    // message contents
    const message = 'Test message from JavaScript.';
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
    const result = JSON.stringify(rawResult, null, 4).replace(tgKey, '${TELEGRAM_API_KEY}').replace(chatId, '${TELEGRAM_CHAT_ID}'); // eslint-disable-line no-template-curly-in-string
    console.log('Done.', result);
    // return useful information
    return {
        statusCode: 200,
        body: result,
    };
};
