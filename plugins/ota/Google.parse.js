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
      const data = extractDataFromFile(file);
      extractItinerariesFromData(data, req).forEach(itinerary => {
        if (itinerary.legs[0].depDate !== depDate) return;
        if (itinerary.legs[0].depAirportCode !== req.depApt) return;
        if (itinerary.legs[0].arrAirportCode !== req.arrApt) return;

        itineraries.push(itinerary)
      });
    })
  })

  return itineraries.sort((a,b) => a.price - b.price);
}

function extractDataFromFile(file) {
  const raw = {
    junk: file._r[0],
    junk: file._r[1],
    bestFlights: file._r[2][2][0] || [],
    otherFlights: file._r[2][2][1] || [],
    locations: file._r[3],
    airlines: file._r[4],
    junk: file._r[5],
    misc: file._r[6],
    null: file._r[7],
    empty: file._r[8],
    empty: file._r[9],
    equipment: file._r[10],
    null: file._r[11],
    junk: file._r[12],
  };

  return raw.bestFlights.concat(raw.otherFlights);
}

function extractItinerariesFromData(data, req) {
  const itineraries = [];
  data.forEach(flight => {
    const rawPrice = flight[0][6];
    if (!rawPrice) return;

    const price = parseInt(flight[0][6].replace(/[^0-9.]+/g, '')) * 100;
    const legs = extractLegsFromTmpItinerary(flight[0], req);
    itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegsFromTmpItinerary(tmpLeg, req) {
  const legs = [];
  const tmpRoutes = tmpLeg[4];
  const tmpStopovers = tmpLeg[5] || [];

  const depRoute = tmpRoutes[0];
  const depAirportCode = depRoute[0];

  const depDate = req.depDate.format('YYYY-MM-DD');
  const depTime = depRoute[3][0];

  const dateTimes = Utils.calculateDateTimeForSegs({ depAirportCode, depDate, depTime }, tmpRoutes.map((route, i) => {
    return {
      depAirportCode: route[0],
      arrAirportCode: route[1],
      durationMinutes: route[5],
      layoverMinutes: tmpStopovers[i] ? tmpStopovers[i][0] : 0,
    }
  }));

  const layovers = [];
  const segments = tmpRoutes.map((route,i) => {
    const { depDate, depTime, arrDate, arrTime, durationMinutes, layoverMinutes } = dateTimes[i];
    const carrier = route[2][0];
    const flightNumber = route[2][1];
    const depAirportCode = route[0];
    const arrAirportCode = route[1];

    if (layoverMinutes) layovers.push(new Layover({ durationMinutes: layoverMinutes }))

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
  if (req.retDate) legs.push({
    depAirportCode: legs[0].arrAirportCode,
    depDate: req.retDate.format('YYYY-MM-DD'),
    arrAirportCode: legs[0].depAirportCode,
    requiresFetch: true
  })

  return legs;
}
