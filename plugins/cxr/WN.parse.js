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
  const airProducts = file.data.searchResults.airProducts;
  const retPrice = req.retDate ? extractCheapestFlightPrice(airProducts[1]) : 0;
  airProducts[0].details.forEach(record => {
    const price = extractCheapestPrice(record.fareProducts) + retPrice;
    const legs = extractLegsFromRecord(record, req);
    if (price) itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegsFromRecord(record, req) {
  const legs = [];
  const segments = [];
  const layovers = [];

  record.stopsDetails.forEach(stop => {
    segments.push(new Segment({
      carrier: 'WN',
      flightNumber: parseInt(stop.flightNumber),
      depAirportCode: stop.originationAirportCode,
      depDate: moment(stop.departureDateTime).format('YYYY-MM-DD'),
      depTime: moment(stop.departureDateTime).format('HH:mm'),
      arrAirportCode: stop.destinationAirportCode,
      arrDate: moment(stop.arrivalDateTime).format('YYYY-MM-DD'),
      arrTime: moment(stop.arrivalDateTime).format('HH:mm'),
      durationMinutes: stop.legDuration,
    }));
    if (stop.stopDuration) {
      layovers.push(new Layover({ durationMinutes: stop.stopDuration }))
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

function extractCheapestFlightPrice(airProduct) {
  let price = 0;
  if (!airProduct) return price;
  airProduct.details.forEach(record => {
    const p = extractCheapestPrice(record.fareProducts)
    if (!price || price > p) price = p;
  })
  return price;
}

function extractCheapestPrice(fareProducts) {
  let price;
  Object.values(fareProducts).forEach(fareProduct => {
    Object.values(fareProduct).forEach(fprod => {
      if (['UNAVAILABLE','SOLD_OUT'].includes(fprod.availabilityStatus)) return;
      const p = parseFloat(fprod.fare.totalFare.value);
      if (!price || price > p) price = p;
    });
  });
  return Math.round(price * 100);
}
