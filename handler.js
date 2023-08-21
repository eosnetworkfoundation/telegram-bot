const axios = require('axios');

const tgAPI = axios.create({
    baseURL: 'https://api.telegram.org',
});

module.exports.hello = async (event) => {
    const tgKey = process.env.TELEGRAM_API_KEY;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const route = `/bot${tgKey}/sendMessage`;

    const message = 'Test message from JavaScript.';

    const response = await tgAPI.get(route, {
        params: {
            chat_id: chatId,
            text: message,
        },
    });

    return {
        statusCode: 200,
        body: JSON.stringify(
            {
                message: 'Go Serverless v1.0! Your function executed successfully!',
                input: event,
            },
            null,
            2,
        ),
    };
};
