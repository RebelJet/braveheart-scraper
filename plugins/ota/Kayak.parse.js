const moment = require('moment-timezone');
const cheerio = require('cheerio');

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
    files.forEach((file, i) => {
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
  const itineraries = [];
  const $ = cheerio.load(file.content);
  const $tmpItineraries = $('#searchResultsList .Flights-Results-FlightResultItem .resultWrapper');

  $tmpItineraries.each((i, tmpItinerary) => {
    console.log(`PARSING ITINERARY ${i}`)
    const $tmpItin = cheerio(tmpItinerary);
    const priceSelector = '.resultInner .col-price .multibook-dropdown .above-button .price.option-text';
    const price = Math.ceil(parseInt($tmpItin.find(priceSelector).text().trim().replace(/[^0-9.]+/, '')) * 100);
    if (!price) return;

    const legs = extractLegsFromTmpItinerary($tmpItin);
    if (legs.length) itineraries.push(new Itinerary(legs, price));
  })

  return itineraries;
}

function extractLegsFromTmpItinerary($tmpItin) {
  const legs = [];

  $tmpItin.find('.Flights-Results-LegInfo').each((legId, legInfo) => {
    const segments = [];
    const layovers = [];
    const $legInfo = cheerio(legInfo);
    const depAirportCode = extractAirportCode($legInfo.find('.col-field.depart .bottom').text(), $legInfo);
    const arrAirportCode = extractAirportCode($legInfo.find('.col-field.return .bottom').text(), $legInfo);
    const stopAirportCodes = extractStops($legInfo.find('.col-field.stops .bottom').text());
    const airportCodes = [depAirportCode, ...stopAirportCodes, arrAirportCode];
    const $segmentRows = $tmpItin.find('.detailsContainer .Flights-Results-FlightLegDetails').eq(legId);
    $segmentRows.find('.segment-row').each((i, segmentRow) => {
      const $segmentRow = cheerio(segmentRow);
      const carrier = $segmentRow.find('.segment-details .icon-column img').attr('src').match(/airlines\/v\/([A-Z0-9]{2})/)[1];
      const flightNumber = $segmentRow.attr('data-flightnumber')

      const depAirportCode = airportCodes[i];
      const depDate = extractDate($segmentRow.find('.segment-dates .date').text());
      const depTime = moment($segmentRow.find('.segmentTimes .time').eq(0).text().trim(), 'h:mm a').format('HH:mm');
      const arrAirportCode = airportCodes[i+1];
      const arrDate = extractDate($segmentRow.find('.segment-dates .arrival-date-warning').text() || $segmentRow.find('.segment-dates .date').text());
      const arrTime = moment($segmentRow.find('.segmentTimes .time').eq(1).text().trim(), 'h:mm a').format('HH:mm');
      const durationMinutes = extractDuration($segmentRow.find('.segmentDuration').text())

      if (i > 0) {
        const { arrAirportCode, arrDate, arrTime } = segments[i-1];
        const layoverMinutes = Utils.calculateDuration([arrAirportCode, arrDate, arrTime], [depAirportCode, depDate, depTime])
        layovers.push(new Layover({ durationMinutes: layoverMinutes }))
      }

      segments.push(new Segment({
        carrier,
        flightNumber,
        depAirportCode,
        depDate,
        depTime,
        arrAirportCode,
        arrDate,
        arrTime,
        durationMinutes,
      }));
    });
    if (segments.length) legs.push(new Leg(segments, layovers));
  })

  return legs;
}

function extractAirportCode(str, $legInfo) {
  const matches = str.match(/^[A-Z]{3}/);
  return matches[0]
}

function extractStops(str) {
  return str.split(',').reduce((stops, v) => {
    const stop = v.trim();
    if (stop !== 'nonstop') stops.push(stop);
    return stops;
  }, []);
}

function extractDate(str) {
  const date = moment(str.replace('Lands','').trim(), 'ddd, MMM D')
  return (moment().month() > date.month() ? date.add(1, 'year') : date).format('YYYY-MM-DD');
}

function extractDuration(str) {
  return str.trim().split(' ').reduce((duration, s) => {
    const [length, type] = s.match(/(\d+)(h|m)/).slice(1)
    return duration + (type === 'h' ? parseInt(length) * 60 : parseInt(length));
  }, 0)
}
