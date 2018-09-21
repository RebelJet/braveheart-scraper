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
  const itineraries = [];
  const records = file.itinerary;
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

  record.trip[0].flightSegment.forEach(seg => {
    const depDateTime = moment(seg.schedDepartLocalTs, 'YYYY-MM-DDTHH:mm');
    const arrDateTime = moment(seg.schedArrivalLocalTs, 'YYYY-MM-DDTHH:mm');
    segments.push(new Segment({
      carrier: 'DL',
      flightNumber: parseInt(seg.marketingFlightNum),
      depAirportCode: seg.originAirportCode,
      depDate: depDateTime.format('YYYY-MM-DD'),
      depTime: depDateTime.format('HH:mm'),
      arrAirportCode: seg.destAirportCode,
      arrDate: arrDateTime.format('YYYY-MM-DD'),
      arrTime: arrDateTime.format('HH:mm'),
      durationMinutes: (seg.totalAirTime.day * 1440) + (seg.totalAirTime.hour * 60) + seg.totalAirTime.minute,
    }));
    if (segments.length > 1) {
      layovers.push(new Layover({ durationMinutes: 0 })) // TODO
    }
  })

  legs.push(new Leg(segments, layovers));

  return legs;
}

function extractCheapestPrice(record) {
  let price = 0;
  record.fare.forEach(fare => {
    if (fare.soldOut) return;
    const p = fare.totalPrice.currency.amount;
    if (!price || price > p) price = p;
  });
  return Math.round(price * 100);
}
