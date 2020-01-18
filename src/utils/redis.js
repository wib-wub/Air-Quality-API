const redis = require('redis');
const {promisify} = require('util');
const redisClient = redis.createClient(process.env.REDISURL);

module.exports = {
	get: promisify(redisClient.get).bind(redisClient),
	set: promisify(redisClient.set).bind(redisClient),
};