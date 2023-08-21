const axios = require('axios');

const api = axios.create({
    baseURL: 'https://api.telegram.org/bot',
});

module.exports.hello = async (event) => ({
    statusCode: 200,
    body: JSON.stringify(
        {
            message: 'Go Serverless v1.0! Your function executed successfully!',
            input: event,
        },
        null,
        2,
    ),
});
