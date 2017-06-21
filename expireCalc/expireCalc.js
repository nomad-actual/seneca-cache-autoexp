const moment = require('moment');

const convertToMs = (momentDate) => {
    return momentDate.toDate().getTime();
};

const expireWithTimeUnit = (units, timeUnit = 'seconds') => {
    if (!units || units <= 0) {
        return -1;
    }

    const timeUnitUsed = moment.normalizeUnits(timeUnit) || 'seconds';
    const duration = moment.duration(units, timeUnitUsed);
    if (duration.isValid()) {
        const result = Math.ceil(duration.asSeconds());
        if (result > 0) {
            return result;
        }
    }

    return -1;
};

const expireOnDate = (date) => {
    const parsedUtcDate = moment.utc(date);

    // needs to be a valid moment date
    if (!parsedUtcDate.isValid()) {
        return -1;
    }

    const secondsFromNow = convertToMs(parsedUtcDate) - convertToMs(moment.utc());

    // difference must be larger than 0 in order to set the correct time;
    if (secondsFromNow > 0) {
        return expireWithTimeUnit(secondsFromNow, 'ms'); // convert to seconds
    }

    return -1;
};

module.exports = {
    expireOnDate,
    expireWithTimeUnit
};
