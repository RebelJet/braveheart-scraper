const fs = require('fs');
const cheerio = require('cheerio');
const moment = require('moment-timezone');

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
  const rows = $('ul.search-results-normal > li')

  rows.each((i,row) => {
    i = parseInt(i);
    console.log(`extracting itinerary #${i}`);
    const $row = $(row);
    const price = extractCheapestPrice($row);
    const legs = extractLegsFromRow($row, i, req);
    if (price) itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractLegsFromRow($row, i, req) {
  const legs = [];
  const segments = [];
  const layovers = [];
  const details = cheerio(req.data.filesByName['https-www-aa-com-booking-flights-choose-flights-ajax-flightDetails'][i].trim());
  const tabs = details.find('li.flight-details-tab')
  tabs.find('.flight-stops-index').remove()
  tabs.each((i,tab) => {
    i = parseInt(i);
    const [ depAirportCode, arrAirportCode ] = cheerio(tab).text().trim().split('-').map(s => s.trim());
    const flightNumber = details.find('.flight-numbers').eq(i).text().match(/AA\s+(\d+)/)[1];
    const depDate = moment(details.find('.flight-date-info').eq(i).text().replace(/\s+/g,' ').trim(), 'dddd, MMMM D, YYYY').format('YYYY-MM-DD');
    const [ depTime, arrTime ] = details.find(`#flight-details-${i}_0 .flight-time`).toArray().map(elem => {
      const parts = cheerio(elem).text().replace(/\s+/g,' ').trim().match(/(\d+):(\d+)\s+(AM|PM)/).slice(1);
      return [ parseInt(parts[0]) + (parts[2] === 'PM' ? 12 : 0), (parseInt(parts[1]) + '00').substr(0,2) ].join(':');
    });
    const durationMinutes = details.find(`#flight-details-${i}_0 .flight-travel-details span.title-desc`).eq(0).text().split(' ').reduce((total,s) => {
      const matches = s.match(/(\d+)(\w+)/);
      if (!matches) return total;
      return total + (parseInt(matches[1]) * (matches[2] === 'h' ? 60 : 0))
    }, 0);

    segments.push(new Segment({
      carrier: 'AA',
      flightNumber: flightNumber,
      depAirportCode: depAirportCode,
      depDate: depDate,
      depTime: depTime,
      arrAirportCode: arrAirportCode,
      arrDate: depDate, // TODO
      arrTime: arrTime,
      durationMinutes: durationMinutes, // TODO
    }));
    if (segments.length > 1) {
      layovers.push(new Layover({ durationMinutes: 0 })) // TODO
    }
  });

  legs.push(new Leg(segments, layovers));

  return legs;
}

function extractCheapestPrice($row) {
  let price;
  $row.find('.fare-selector-row .fareselector .amount .price').each((i,row) => {
    const p = parseInt(cheerio(row).text().trim());
    if (!price || price > p) price = p;
  });
  return Math.round(price * 100);
}
