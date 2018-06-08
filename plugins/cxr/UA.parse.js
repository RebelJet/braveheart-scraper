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
  const records = file.data.Trips[0].Flights;
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

  const segs = [{
    FlightNumber: record.FlightNumber,
    Origin: record.Origin,
    DepartDateTime: record.DepartDateTime,
    Destination: record.Destination,
    DestinationDateTime: record.DestinationDateTime,
    TravelMinutes: record.TravelMinutes
  }].concat(record.Connections);

  segs.forEach(seg => {
    const depDateTime = moment(seg.DepartDateTime, 'MM/DD/YYYY HH:mm');
    const arrDateTime = moment(seg.DestinationDateTime, 'MM/DD/YYYY HH:mm');
    segments.push(new Segment({
      carrier: 'UA',
      flightNumber: parseInt(seg.FlightNumber),
      depAirportCode: seg.Origin,
      depDate: depDateTime.format('YYYY-MM-DD'),
      depTime: depDateTime.format('HH:mm'),
      arrAirportCode: seg.Destination,
      arrDate: arrDateTime.format('YYYY-MM-DD'),
      arrTime: arrDateTime.format('HH:mm'),
      durationMinutes: seg.TravelMinutes,
    }));
    if (segments.length > 1) {
      layovers.push(new Layover({ durationMinutes: 0 })) // TODO
    }
  })

  legs.push(new Leg(segments, layovers));
  // if (req.retDate) legs.push({
  //   depAirportCode: legs[0].arrAirportCode,
  //   depDate: req.retDate.format('YYYY-MM-DD'),
  //   arrAirportCode: legs[0].depAirportCode,
  //   requiresFetch: true
  // })

  return legs;
}

function extractCheapestPrice(record) {
  let price = 0;
  Object.values(record.PricesByColumn).forEach(p => {
    if (!price || p &&  p < price) price = p;
  });
  return Math.ceil(price * 100);
}
