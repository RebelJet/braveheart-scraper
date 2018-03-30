const moment = require('moment');
const Airports = require('./common/Airports');

function prefix(str, prefix) {
  return (prefix + str.toString()).substr(-prefix.length);
}

exports.extractTime = function extractTime(...args) {
  const [hoursMinsStr, amPmStr] = (args.length == 1) ? args[0].match(/^([0-9:]+)\s*?(am|pm)/i).slice(1) : args
  const time = hoursMinsStr.split(':').map(str => parseInt(str))
  time[0] = (amPmStr.toUpperCase() === 'AM' || time[0] === 12) ? time[0] : time[0] + 12;
  return `${prefix(time[0], '00')}:${prefix(time[1], '00')}`
};

exports.calculateArrDate = function calculateArrDate(depDate, depTime, arrTime) {
  const date = moment(depDate, 'YYYY-MM-DD');
  const isNextDay = (arrTime[0] < depTime[0] || (arrTime[0] === depTime[0] && arrTime[1] < depTime[1]))
  if (isNextDay) date.add(1, 'day');
  return date.format('YYYY-MM-DD')
};

exports.sleep = function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

exports.calculateDateTimeForSegs = function calculateDateTimeForSegs(leg, segs) {
  const { depAirportCode, depDate, depTime } = leg;
  let curDateTimeTz = moment.tz(`${depDate} ${depTime}`, 'YYYY-MM-DD HH:mm', Airports.tzname(depAirportCode));

  return segs.map(seg => {
    const { depAirportCode, arrAirportCode, durationMinutes, layoverMinutes } = seg;

    const depTZ = Airports.tzname(depAirportCode);
    const arrTZ = Airports.tzname(arrAirportCode);

    const depDateTime = curDateTimeTz.tz(depTZ);
    const depDate = depDateTime.format('YYYY-MM-DD');
    const depTime = depDateTime.format('HH:mm');

    curDateTimeTz = curDateTimeTz.add(durationMinutes, 'minutes');

    const arrDateTime = curDateTimeTz.tz(arrTZ);
    const arrDate = arrDateTime.format('YYYY-MM-DD');
    const arrTime = arrDateTime.format('HH:mm');

    curDateTimeTz = curDateTimeTz.add(layoverMinutes, 'minutes');

    return { depDate, depTime, arrDate, arrTime, durationMinutes, layoverMinutes }
  })
}

exports.calculateDurationsForSegs = function calculateDurationsForSegs(rawSegs) {
  return rawSegs.reduce((calcedSegs, seg, i) => {
    const { depAirportCode, depDate, depTime, arrAirportCode, arrDate, arrTime } = seg;

    const depDateTime = moment.tz(`${depDate} ${depTime}`, 'YYYY-MM-DD HH:mm', Airports.tzname(depAirportCode));
    const arrDateTime = moment.tz(`${arrDate} ${arrTime}`, 'YYYY-MM-DD HH:mm', Airports.tzname(arrAirportCode));
    const durationMinutes = arrDateTime.diff(depDateTime, 'minutes');

    let layoverMinutes = 0;
    if (i > 0) {
      const prev = rawSegs[i-1];
      const prevArrDateTime = moment.tz(`${prev.arrDate} ${prev.arrTime}`, 'YYYY-MM-DD HH:mm', Airports.tzname(prev.arrAirportCode));
      layoverMinutes = depDateTime.diff(prevArrDateTime, 'minutes');
    }

    calcedSegs.push({ depDate, depTime, arrDate, arrTime, durationMinutes, layoverMinutes })
    return calcedSegs
  }, [])
}

exports.calculateMissingNextDate = function calculateNextDateForSeg(from, to) {
  const [ fromDate, fromTime ] = from;
  const [ toTime ] = to;

  const [ fromHours, fromMinutes ] = fromTime.split(':').map(v => parseInt(v));
  const [ toHours, toMinutes ] = toTime.split(':').map(v => parseInt(v));

  const toDate = moment(fromDate, 'YYYY-MM-DD');
  const isNextDay = (toHours < fromHours || (toHours === fromHours && toMinutes <= fromMinutes))
  if (isNextDay) toDate.add(1, 'day');
  return toDate.format('YYYY-MM-DD')
}

exports.calculateDuration = function calculateDuration(dep, arr) {
  const [ depAirportCode, depDate, depTime ] = dep;
  const [ arrAirportCode, arrDate, arrTime ] = arr;

  const depDateTime = moment.tz(`${depDate} ${depTime}`, 'YYYY-MM-DD HH:mm', Airports.tzname(depAirportCode));
  const arrDateTime = moment.tz(`${arrDate} ${arrTime}`, 'YYYY-MM-DD HH:mm', Airports.tzname(arrAirportCode));
  return arrDateTime.diff(depDateTime, 'minutes');
}
