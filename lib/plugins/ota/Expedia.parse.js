const moment = require('moment-timezone');

const Utils = require('../../Utils');

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
  const legsById = Object.keys(file.content.legs).reduce((legsById, id) => {
    return Object.assign(legsById, { [id]: file.content.legs[id] })
  }, {});

  Object.values(file.content.offers).forEach(tmpOffer => {
    const price = Math.round((tmpOffer.price.exactPrice) * 100)
    const legs = tmpOffer.legIds.map(tmpLegId => {
      const tmpLeg = legsById[tmpLegId];
      return extractLegFromTmpLeg(tmpLeg);
    })
    if (price) itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegFromTmpLeg(tmpLeg) {
  const segments = [];
  const layovers = [];

  tmpLeg.timeline.forEach((timeline,i) => {
    if (timeline.type === 'Layover') {
      return layovers.push(new Layover({ durationMinutes: (timeline.duration.hours * 60) + timeline.duration.minutes }))
    } else if (timeline.type !== 'Segment') return;

    segments.push(new Segment({
      carrier: timeline.carrier.airlineCode,
      flightNumber: parseInt(timeline.carrier.flightNumber),
      depAirportCode: timeline.departureAirport.code,
      depDate: moment(timeline.departureTime.isoStr).format('YYYY-MM-DD'),
      depTime: moment(timeline.departureTime.isoStr).format('HH:mm'),
      arrAirportCode: timeline.arrivalAirport.code,
      arrDate: moment(timeline.arrivalTime.isoStr).format('YYYY-MM-DD'),
      arrTime: moment(timeline.arrivalTime.isoStr).format('HH:mm'),
      durationMinutes: (timeline.duration.hours * 60) + timeline.duration.minutes,
    }));
  })

  return new Leg(segments, layovers);
}
