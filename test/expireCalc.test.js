const Code = require('code');
const Lab = require('lab');
const moment = require('moment');
const Seneca = require('seneca');
const RedisServer = require('redis-server');
const toTest = require('../expireCalc/expireCalc');
const mockRedisData = require('./mockData/mockRedisCacheData');

const lab = Lab.script();
exports.lab = lab;

const goodKey = mockRedisData.goodKey;
const goodValue = mockRedisData.goodValue;
const goodExpirationInSeconds = mockRedisData.goodExpirationInSeconds;

const initSeneca = (done) => {
    return Seneca({ log: 'test' })
        .test(done)
        .use(require('../index')); // eslint-disable-line global-require
};

lab.experiment('expireCalc tests', () => {
    lab.experiment('expireOnDate', () => {
        lab.test('should return a negative number (to prevent caching) if an invalid type is sent', (finish) => {
            Code.expect(toTest.expireOnDate()).to.equal(-1);
            Code.expect(toTest.expireOnDate(null)).to.equal(-1);
            Code.expect(toTest.expireOnDate({})).to.equal(-1);
            Code.expect(toTest.expireOnDate(false)).to.equal(-1);
            Code.expect(toTest.expireOnDate(true)).to.equal(-1);
            Code.expect(toTest.expireOnDate('')).to.equal(-1);
            finish();
        });

        lab.test('should handle negative numbers (This will evaluate to a time in the past which results in -1).', (finish) => {
            Code.expect(toTest.expireOnDate(-100)).to.equal(-1);
            finish();
        });

        lab.test('should handle dates in the past', (finish) => {
            Code.expect(toTest.expireOnDate(Date.now() - 1000)).to.equal(-1);
            finish();
        });

        lab.test('should return a valid number of seconds from any timezone (convert to UTC and then expire)', (finish) => {
            const futureTime = moment().add(1, 'h');
            const expected = 60 * 60; // 60 mins in seconds
            const actual = toTest.expireOnDate(futureTime);

            Code.expect(actual).to.equal(expected);
            finish();
        });

        lab.test('should be able to handle a target date (1st of next month)', (finish) => {
            const now = new Date();
            const currYear = now.getFullYear();
            const currMonth = now.getMonth() + 1; // convert to 1-based month for moment
            const currDay = now.getDate();

            const futureTime = moment(`${currYear}-${currMonth + 2}-${currDay}`);
            const expected = Math.ceil((futureTime.toDate() - moment.utc().toDate()) / 1000);
            const actual = toTest.expireOnDate(futureTime);

            Code.expect(actual).to.equal(expected);
            finish();
        });
    });

    lab.experiment('expireWithTimeUnit', () => {
        lab.test('should return -1 if passed a negative number', (finish) => {
            Code.expect(toTest.expireWithTimeUnit(-30)).to.equal(-1);
            finish();
        });

        lab.test('should return -1 if passed 0 (0 means never expire - that is what the set commad is for)', (finish) => {
            Code.expect(toTest.expireWithTimeUnit(0)).to.equal(-1);
            finish();
        });

        lab.test('should return -1 if the duration is invalid', (finish) => {
            Code.expect(toTest.expireWithTimeUnit(-5, 'MEGASECONDS')).to.equal(-1);
            finish();
        });

        lab.test('should not modify input due to invalid time unit', (finish) => {
            Code.expect(toTest.expireWithTimeUnit(5, 'MEGASECONDS')).to.equal(5);
            finish();
        });

        lab.test('should convert valid durations and timeunits correctly', (finish) => {
            const FIVE_HOURS_IN_SECONDS = 5 * 60 * 60;
            Code.expect(toTest.expireWithTimeUnit(5, 'h')).to.equal(FIVE_HOURS_IN_SECONDS);
            Code.expect(toTest.expireWithTimeUnit(5, 'hours')).to.equal(FIVE_HOURS_IN_SECONDS);
            Code.expect(toTest.expireWithTimeUnit(5, 'Hours')).to.equal(FIVE_HOURS_IN_SECONDS);
            finish();
        });

        lab.test('should use seconds by default', (finish) => {
            Code.expect(toTest.expireWithTimeUnit(100)).to.equal(100);
            finish();
        });

        lab.test('should handle falsy or invalid types of data', (finish) => {
            Code.expect(toTest.expireWithTimeUnit()).to.equal(-1);
            Code.expect(toTest.expireWithTimeUnit(null)).to.equal(-1);
            Code.expect(toTest.expireWithTimeUnit(false)).to.equal(-1);
            Code.expect(toTest.expireWithTimeUnit(true)).to.equal(-1);
            Code.expect(toTest.expireWithTimeUnit({})).to.equal(-1);
            Code.expect(toTest.expireWithTimeUnit([])).to.equal(-1);
            finish();
        });
    });

    lab.experiment('with Seneca', () => {
        // Because seneca-redis-cache looks for a redis-serve on init, we need to start one up for it to see
        const resolve = require('path').resolve; // eslint-disable-line global-require
        const bin = resolve('./test/redis/redis-server');
        const server = new RedisServer({ port: 6379, bin });

        lab.beforeEach((done) => {
            server.open().then(() => {
                // You may now connect a client to the Redis server bound to `server.port`.
                done();
            }).catch((err) => {
                console.log(err);
            });
        });

        lab.afterEach((done) => {
            server.close().then(() => {
                // The associated Redis server is now closed.
                done();
            });
        });

        lab.test('expireInSeconds should return the expected key when called with valid data', (finish) => {
            const seneca = initSeneca(finish);
            const expireInSecondsPattern = {
                role: 'cache',
                cmd: 'set',
                expire: 'seconds',
                key: goodKey,
                value: goodValue,
                expirationSeconds: goodExpirationInSeconds
            };

            seneca.act(expireInSecondsPattern, (err, out) => {
                Code.expect(err).to.equal(null);
                Code.expect(out).to.not.equal(null);
                Code.expect(out).to.equal({ key: goodKey });

                finish();
            });
        });

        lab.test('expireOnDate should return the expected key when called with valid data', (finish) => {
            const seneca = initSeneca(finish);
            const tomorrow = moment(new Date()).add(1, 'days');
            const expireOnDatePattern = {
                role: 'cache',
                cmd: 'set',
                expire: 'date',
                key: goodKey,
                value: goodValue,
                expirationDate: tomorrow
            };

            seneca.act(expireOnDatePattern, (err, out) => {
                Code.expect(err).to.equal(null);
                Code.expect(out).to.not.equal(null);
                Code.expect(out).to.equal({ key: goodKey });

                finish();
            });
        });

        lab.test('expireWithTimeUnit should return the expected key when called with valid data', (finish) => {
            const seneca = initSeneca(finish);
            const expireOnDatePattern = {
                role: 'cache',
                cmd: 'set',
                expire: 'time',
                key: goodKey,
                value: goodValue,
                expirationTime: 5,
                expirationUnit: 'minutes'
            };

            seneca.act(expireOnDatePattern, (err, out) => {
                Code.expect(err).to.equal(null);
                Code.expect(out).to.not.equal(null);
                Code.expect(out).to.equal({ key: goodKey });

                finish();
            });
        });
    });
});
