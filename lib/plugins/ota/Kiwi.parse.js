const moment = require('moment-timezone');

const Utils = require('../../Utils');
const Airports = require('../../common/Airports');

const Itinerary = require('../../models/Itinerary');
const Leg = require('../../models/Leg');
const Segment = require('../../models/Segment');
const Layover = require('../../models/Layover');

////////////////////////////////////////////////////////////////////////////////

module.exports = function parse(req) {
  const itineraries = [];
  const filesByName = req.data.filesByName;
  const depDate = req.depDate.format('YYYY-MM-DD');

  Object.keys(filesByName).forEach(name => {
    const files = filesByName[name];
    files.forEach((file,i) => {
      console.log(`PARSING ${name}/${i}`)
      extractItinerariesFromFile(file).forEach(itinerary => {
        if (itinerary.legs[0].depDate !== depDate) return;
        if (itinerary.legs[0].depAirportCode !== req.depApt) return;
        if (itinerary.legs[0].arrAirportCode !== req.arrApt) return;

        itineraries.push(itinerary)
      });
    })
  })

  return itineraries.sort((a,b) => a.price - b.price);
}

function extractItinerariesFromFile(file) {
  const itineraries = [];

  file.data.forEach(tmpLeg => {
    const price = Math.round((tmpLeg.conversion.EUR * 1.24) * 100)
    const leg = extractLegFromTmpLeg(tmpLeg);
    if (leg) itineraries.push(new Itinerary([leg], price));
  });
  return itineraries;
}

function extractLegFromTmpLeg(tmpLeg) {
  const usesAlternateTransportation = tmpLeg.route.some(route => route.vehicle_type !== 'aircraft');
  if (usesAlternateTransportation) return;

  const depRoute = tmpLeg.route[0];
  const depAirportCode = depRoute.flyFrom;
  const depTz = Airports.tzname(depAirportCode)
  const depDateTime = moment(depRoute.dTimeUTC * 1000).tz(depTz)
  const depDate = depDateTime.format('YYYY-MM-DD');
  const depTime = depDateTime.format('HH:mm');

  const arrRoute = tmpLeg.route[0];
  const arrAirportCode = arrRoute.flyTo;

  const dateTimes = Utils.calculateDurationsForSegs(tmpLeg.route.map(route => {
    const depDateTime = moment(route.dTimeUTC * 1000).tz(Airports.tzname(route.flyFrom));
    const arrDateTime = moment(route.aTimeUTC * 1000).tz(Airports.tzname(route.flyTo));
    return {
      depAirportCode: route.flyFrom,
      depDate: depDateTime.format('YYYY-MM-DD'),
      depTime: depDateTime.format('HH:mm'),
      arrAirportCode: route.flyTo,
      arrDate: arrDateTime.format('YYYY-MM-DD'),
      arrTime: arrDateTime.format('HH:mm'),
    }
  }));

  const layovers = [];
  const segments = tmpLeg.route.map((route,i) => {
    const { depDate, depTime, arrDate, arrTime, durationMinutes, layoverMinutes } = dateTimes[i];
    const carrier = route.airline;
    const flightNumber = route.flight_no;
    const depAirportCode = route.flyFrom;
    const arrAirportCode = route.flyTo;

    if (layoverMinutes) layovers.push(new Layover({ durationMinutes: layoverMinutes }));

    return new Segment({
      carrier,
      flightNumber,
      depAirportCode,
      depDate,
      depTime,
      arrAirportCode,
      arrDate,
      arrTime,
      durationMinutes,
    })
  })

  return new Leg(segments, layovers);
}
