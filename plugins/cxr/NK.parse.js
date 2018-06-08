const cheerio = require('cheerio');
const moment = require('moment');

const Utils = require('../../lib/Utils');

const Itinerary = require('../../lib/models/Itinerary');
const Leg = require('../../lib/models/Leg');
const Segment = require('../../lib/models/Segment');
const Layover = require('../../lib/models/Layover');

////////////////////////////////////////////////////////////////////////////////

module.exports = function parse(req) {
  const itineraries = [];
  const depDate = req.depDate.format('YYYY-MM-DD');

  extractItinerariesFromHtml(req.data.html, req).forEach(itinerary => {
    if (itinerary.legs[0].depDate !== depDate) return;
    if (itinerary.legs[0].depAirportCode !== req.depApt) return;
    if (itinerary.legs[0].arrAirportCode !== req.arrApt) return;
    itineraries.push(itinerary)
  });

  return itineraries.sort((a,b) => a.price - b.price);
}

function extractItinerariesFromHtml(html, req) {
  const itineraries = [];
  const $ = cheerio.load(req.data.html);
  const rows = $('.sortThisTable .row.rowsMarket1')

  console.log('extracting itineraries from html');
  if (rows.eq(0) && rows.eq(0).find('div.no-seats').length) return;

  rows.each((i,row) => {
    console.log(`extracting itinerary #${i}`);
    const $row = $(row);
    const price = extractCheapestPrice($row);
    const legs = extractLegsFromRow($row, req);
    if (price) itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegsFromRow($row, req) {
  const legs = [];
  const segments = [];
  const layovers = [];

  // extract segments
  const airports = $row.find('.standardFare input.standardFareInput').attr('data-market').split(',').map(s => s.split('|'))
  $row.find('.stops .popUpContent .flight-info-header').each((i,elem) => {
    const $header = cheerio(elem);
    const $details = $header.parent().parent().next();
    const lastSeg = segments.length ? segments[segments.length-1] : null;

    const depAirportCode = airports[i][0];
    const depTime = Utils.extractTime($details.find('.flight-info-body div').eq(1).text().trim());
    const depDate = lastSeg ? Utils.calculateArrDate(lastSeg.arrDate, lastSeg.arrTime, depTime) : req.depDate.format('YYYY-MM-DD');

    const arrAirportCode = airports[i][1];
    const arrTime = Utils.extractTime($details.find('.flight-info-body div').eq(4).text().trim());
    const arrDate = Utils.calculateArrDate(depDate, depTime, arrTime);

    const flightNumber = parseInt($header.find('.fi-header-text.text-right').text().trim().match(/(\d+)/)[1]);

    segments.push(new Segment({
      carrier: 'NK',
      flightNumber: flightNumber,
      depAirportCode: depAirportCode,
      depDate: depDate,
      depTime: depTime,
      arrAirportCode: arrAirportCode,
      arrDate: arrDate,
      arrTime: arrTime,
      // durationMinutes: stop.legDuration, // TODO
    }));
    if (segments.length > 1) {
      layovers.push(new Layover({ durationMinutes: 0 })) // TODO
    }
  });

  legs.push(new Leg(segments, layovers));

  return legs;
}

////////////////////////////////////////////////////////////////////////////////////////////////////

function extractNumStops(text) {
  text = text.trim()
  if (text.match('Nonstop')) {
    return 0
  }else {
    let matches = text.match(/([0-9])+\s+stop/i)
    return parseInt(matches[1])
  }
}

function extractCheapestPrice($row) {
  return Math.ceil($row.find('.bareFare .standardFare .emPrice').first().text().trim().match(/[0-9\.]+/)[0] * 100);
}
