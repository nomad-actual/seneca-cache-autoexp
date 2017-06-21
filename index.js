/* eslint no-use-before-define: "off" */
const ExpirationCalculator = require('./expireCalc/expireCalc');

const defaultOpts = {
    host: '127.0.0.1',
    port: 6379,
    connect_timeout: 10000
};


/**
 * Auto Expiring seneca module decalaration
 * @module VehicleService
 * @param options The connection info for connecting to redis
 * @returns {object} - Name 'dr-vehicle'
 */
module.exports = function (options) {
    const seneca = this;
    const PLUGIN_NAME = 'dr-autoexp-cache';
    const opts = seneca.util.deepextend(defaultOpts, options);

    // use the redis-cache
    seneca.use('seneca-redis-cache', opts);

    // Get Vehicle which currently just acts on pdGateway
    seneca.add({ role: 'cache', cmd: 'set', expireDate: '*' }, expireOnDate);
    seneca.add({ role: 'cache', cmd: 'set', expireDate: '*', trustIssues: true }, expireOnDateWithTrustIssues); // don't trust the cache for a few days
    seneca.add({ role: 'cache', cmd: 'set', expireSeconds: '*' }, expireInSeconds);
    seneca.add({ role: 'cache', cmd: 'set', expireDuration: '*', timeUnits: '*' }, expireWithTimeUnit);

    return {
        name: PLUGIN_NAME
    };
};

function expireOnDate(msg, done) {
    const seneca = this;
    const logger = seneca.log;

    // parse date
    // if !date || !in future, send back null


    const expiration = ExpirationCalculator.expireOnDate();
    callCache(expiration, done);
}

function expireOnDateWithTrustIssues(msg, done) {
    done(null);
}

function expireInSeconds(msg, done) {
    const seneca = this;
    const logger = seneca.log;

    if (!msg.seconds || msg.seconds <= 0) {
        // log issue
        done(null);
    }

    callCache(msg.seconds, done);
}

function expireWithTimeUnit(msg, done) {
    const seneca = this;
    const logger = seneca.log;

    done(null);
}

function callCache(data, done) {
    const seneca = this;
    const logger = seneca.log;


    seneca.act({ role: 'cache', cmd: 'set', key: data.key }, (err, out) => {
        seneca.act({ plugin: 'redis-cache', cmd: 'native', EX: data }, (err, out) => {
            // intercept here
            done(err, out);
        });
    });
}
