const redisSetPattern = { role: 'cache', cmd: 'set' };
const goodKey = 55555;
const goodValue = 'This is a good value';
const goodExpirationInSeconds = 5;

module.exports = {
    goodExpirationInSeconds,
    goodKey,
    goodValue,
    redisSetPattern
};
