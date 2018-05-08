const moment = require('moment-timezone');

const Utils = require('../../lib/Utils');

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
      extractItinerariesFromFile(file, req).forEach(itinerary => {
        if (itinerary.legs[0].depDate !== depDate) return;
        if (itinerary.legs[0].depAirportCode !== req.depApt) return;
        if (itinerary.legs[0].arrAirportCode !== req.arrApt) return;

        itineraries.push(itinerary)
      });
    })
  })

  return itineraries.sort((a,b) => a.price - b.price);
}

function extractItinerariesFromFile(file, req) {
  const flightsById = Object.keys(file.flights).reduce((flightsById, id) => {
    return Object.assign(flightsById, { [id]: file.flights[id] })
  }, {});

  return Object.values(file.itineraries.outbound).map(tmpItinerary => {
    const price = req.retDate ? tmpItinerary.min_round_trip_price : tmpItinerary.one_way_price;
    const legs = extractLegsFromTmpFlight(flightsById[tmpItinerary.flight], req);
    return new Itinerary(legs, price);
  });
}

function extractLegsFromTmpFlight(tmpFlight, req) {
  const legs = [];
  const segments = [];
  const layovers = [];

  tmpFlight.segments.forEach((tmpSegment,i) => {
    const depAirportCode = tmpSegment.departure.airport;
    const depDate = moment(tmpSegment.departure.time).format('YYYY-MM-DD');
    const depTime = moment(tmpSegment.departure.time).format('HH:mm');

    if (i > 0) {
      const { arrAirportCode, arrDate, arrTime } = segments[i-1];
      const layoverMinutes = Utils.calculateDuration([arrAirportCode, arrDate, arrTime], [depAirportCode, depDate, depTime])
      layovers.push(new Layover({ durationMinutes: layoverMinutes }))
    }

    segments.push(new Segment({
      carrier: tmpSegment.airline,
      flightNumber: parseInt(tmpSegment.flight_number),
      depAirportCode: depAirportCode,
      depDate: depDate,
      depTime: depTime,
      arrAirportCode: tmpSegment.arrival.airport,
      arrDate: moment(tmpSegment.arrival.time).format('YYYY-MM-DD'),
      arrTime: moment(tmpSegment.arrival.time).format('HH:mm'),
      durationMinutes: Math.round(tmpSegment.duration / 60),
    }));
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
