const moment = require('moment-timezone');

const Utils = require('../../lib/Utils');
const Airports = require('../../lib/common/Airports');

const Itinerary = require('../../lib/models/Itinerary');
const Leg = require('../../lib/models/Leg');
const Segment = require('../../lib/models/Segment');
const Layover = require('../../lib/models/Layover');

////////////////////////////////////////////////////////////////////////////////

module.exports = function parse(req) {
  const itineraries = [];
  const filesByName = req.data.filesByName;
  const depDate = req.depDate.format('YYYY-MM-DD');

  Object.keys(filesByName).forEach(name => {
    const files = filesByName[name];
    files.forEach((file,i) => {
      console.log(`PARSING ${name} :: ${i}`)
      extractItinerariesFromFile(file).forEach(itinerary => {
        // console.log('-----------------------')
        // console.log(itinerary.legs[0].depAirportCode == req.depApt, itinerary.legs[0].arrAirportCode == req.arrApt, itinerary)

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

  file.data.forEach(tmpItin => {
    const price = Math.round((tmpItin.conversion.EUR * 1.24) * 100)
    const legs = extractLegsFromTmpItinerary(tmpItin);
    if (legs.length) itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegsFromTmpItinerary(tmpItin) {
  const usesAlternateTransportation = tmpItin.route.some(route => route.vehicle_type !== 'aircraft');
  if (usesAlternateTransportation) return [];

  const legs = [];
  const depAirportCode = tmpItin.flyFrom;
  const arrAirportCode = tmpItin.flyTo;
  const tmpRoutesByLeg = tmpItin.route.reduce((tmpRoutesByLeg, route) => {
    if (route.flyFrom === arrAirportCode) {
      // we're starting the return journey, add a leg
      tmpRoutesByLeg.push([]);
    }
    tmpRoutesByLeg[tmpRoutesByLeg.length-1].push(route);
    return tmpRoutesByLeg;
  }, [ [] ]);

  tmpRoutesByLeg.forEach(tmpRoutes => {
    const dateTimes = Utils.calculateDurationsForSegs(tmpRoutes.map(route => {
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
    const segments = tmpRoutes.map((route,i) => {
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
    legs.push(new Leg(segments, layovers));
  })

  return legs;
}
