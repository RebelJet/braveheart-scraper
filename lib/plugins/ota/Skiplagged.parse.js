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
  const flightsById = Object.keys(file.flights).reduce((flightsById, id) => {
    return Object.assign(flightsById, { [id]: file.flights[id] })
  }, {});

  return Object.values(file.itineraries.outbound).map(tmpItinerary => {
    const price = tmpItinerary.one_way_price;
    const leg = extractLegFromTmpFlight(flightsById[tmpItinerary.flight]);
    return new Itinerary([leg], price);
  });
}

function extractLegFromTmpFlight(tmpFlight) {
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
      flightNumber: parseInt(tmpSegment.flightNumber),
      depAirportCode: depAirportCode,
      depDate: depDate,
      depTime: depTime,
      arrAirportCode: tmpSegment.arrival.airport,
      arrDate: moment(tmpSegment.arrival.time).format('YYYY-MM-DD'),
      arrTime: moment(tmpSegment.arrival.time).format('HH:mm'),
      durationMinutes: tmpSegment.duration,
    }));
  })

  return new Leg(segments, layovers);
}
