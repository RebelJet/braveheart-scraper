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
        itineraries.push(itinerary);
      });
    })
  })

  return itineraries.sort((a,b) => a.price - b.price);
}

function extractItinerariesFromFile(file, req) {
  const itineraries = [];
  const records = file.journeys[0].flights;
  records.forEach(record => {
    const price = extractCheapestPrice(record);
    const legs = extractLegsFromRecord(record, req);
    if (price) itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegsFromRecord(record, req) {
  const legs = [];
  const segments = [];
  const layovers = [];

  record.legs.forEach(seg => {
    const duration = seg.duration.split(':').map(i => parseInt(i))
    const durationMinutes = (duration[0] * 60) + duration[1];
    segments.push(new Segment({
      carrier: 'F9',
      flightNumber: parseInt(seg.flightNumber),
      depAirportCode: seg.departureStation,
      depDate: moment(seg.departureDate).format('YYYY-MM-DD'),
      depTime: moment(seg.departureDate).format('HH:mm'),
      arrAirportCode: seg.arrivalStation,
      arrDate: moment(seg.arrivalDate).format('YYYY-MM-DD'),
      arrTime: moment(seg.arrivalDate).format('HH:mm'),
      durationMinutes: durationMinutes,
    }));
    if (segments.length > 1) {
      layovers.push(new Layover({ durationMinutes: 0 })) // TODO
    }
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

function extractCheapestPrice(flight) {
  return Math.ceil(parseInt((flight.discountDenFareFormatted || flight.standardFareFormatted).replace('$','')) * 100);
}
