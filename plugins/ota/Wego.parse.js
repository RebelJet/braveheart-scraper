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
  const legsById = file.legs.reduce((legsById, leg) => {
    return Object.assign(legsById, { [leg.id]: leg })
  }, {});

  const faresByTripId = file.fares.reduce((faresByTripId, fare) => {
    return Object.assign(faresByTripId, { [fare.tripId]: fare })
  }, {});

  return file.trips.map(trip => {
    const fare = faresByTripId[trip.id];
    const price = Math.ceil((fare.price.amountPerAdult || fare.price.originalAmountUsd) * 100)
    const legs = trip.legIds.map((tmpLegId,i) => {
      const tmpLeg = legsById[tmpLegId];
      const depDate = file.search.legs[i].outboundDate;
      return extractLegFromTmpLeg(tmpLeg, depDate);
    })
    return new Itinerary(legs, price);
  });
}

function extractLegFromTmpLeg(tmpLeg, depDate) {
  const depAirportCode = tmpLeg.departureAirportCode;
  const depTime = tmpLeg.departureTime;

  const arrAirportCode = tmpLeg.arrivalAirportCode;

  const matches = tmpLeg.id.match(new RegExp(`^${depAirportCode}-${arrAirportCode}:(.+)`))[1];
  const flights = matches.split(':').map(str => ({ carrier: str.substr(0,2), number: str.substr(2) }))

  const dateTimes = Utils.calculateDateTimeForSegs({ depAirportCode, depDate, depTime }, tmpLeg.segments.map(seg => {
    return {
      depAirportCode: seg.departureAirportCode,
      arrAirportCode: seg.arrivalAirportCode,
      durationMinutes: seg.durationMinutes,
      layoverMinutes: seg.stopoverDurationMinutes,
    }
  }));

  const layovers =[];
  const segments = tmpLeg.segments.map((seg,i) => {
    const { depDate, depTime, arrDate, arrTime, durationMinutes, layoverMinutes } = dateTimes[i];
    const carrier = flights[i].carrier;
    const flightNumber = flights[i].number;
    const depAirportCode = seg.departureAirportCode;
    const arrAirportCode = seg.arrivalAirportCode;
    if (layoverMinutes) layovers.push({ durationMinutes: layoverMinutes });

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
