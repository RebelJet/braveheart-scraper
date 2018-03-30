const moment = require('moment-timezone');
const cheerio = require('cheerio');

const Utils = require('../../Utils');
const Airports = require('../../common/Airports');

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
    files.forEach((file, i) => {
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
  const $ = cheerio.load(file.content);
  const $tmpItineraries = $('#searchResultsList .Flights-Results-FlightResultItem .resultWrapper');

  $tmpItineraries.each((i, tmpItinerary) => {
    const $tmpItinerary = cheerio(tmpItinerary);
    const priceSelector = '.resultInner .col-price .multibook-dropdown .above-button .price.option-text';
    const price = Math.round(parseInt($tmpItinerary.find(priceSelector).text().trim().replace(/[^0-9.]+/, '')) * 100);
    if (!price) return;

    const leg = extractLegFromTmpLeg($tmpItinerary);
    if (leg) itineraries.push(new Itinerary([leg], price));
  })

  return itineraries;
}

function extractLegFromTmpLeg($tmpLeg) {
  const segments = [];
  const layovers = [];
  const $legInfo = cheerio($tmpLeg.find('.Flights-Results-LegInfo'));
  const depAirportCode = extractAirportCode($legInfo.find('.col-field.depart .bottom').text(), $legInfo);
  const arrAirportCode = extractAirportCode($legInfo.find('.col-field.return .bottom').text(), $legInfo);
  const stopAirportCodes = extractStops($legInfo.find('.col-field.stops .bottom').text());
  const airportCodes = [depAirportCode, ...stopAirportCodes, arrAirportCode];

  $tmpLeg.find('.detailsContainer .segment-row').each((i, tmpRoute) => {
    console.log(`PARSING ROUTE ${i}`)
    $tmpRoute = cheerio(tmpRoute);

    const carrier = $tmpLeg.find('.segment-details .icon-column img').attr('src').match(/airlines\/v\/([A-Z0-9]{2})/)[1];
    const flightNumber = $tmpRoute.attr('data-flightnumber')

    const depAirportCode = airportCodes[i];
    const depDate = extractDate($tmpRoute.find('.segment-dates .date').text());
    const depTime = moment($tmpRoute.find('.segmentTimes .time').eq(0).text().trim(), 'h:mm a').format('HH:mm');
    const arrAirportCode = airportCodes[i+1];
    const arrDate = extractDate($tmpRoute.find('.segment-dates .arrival-date-warning').text() || $tmpRoute.find('.segment-dates .date').text());
    const arrTime = moment($tmpRoute.find('.segmentTimes .time').eq(1).text().trim(), 'h:mm a').format('HH:mm');
    const durationMinutes = extractDuration($tmpRoute.find('.segmentDuration').text())

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
  })

  return segments.length ? new Leg(segments, layovers) : null;
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
