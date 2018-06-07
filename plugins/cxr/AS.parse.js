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
  const rows = $('table.MatrixTable tbody tr.Option')

  rows.each((i,row) => {
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

  const segs = $row.find('li .SegmentDiv');
  segs.each((i,seg) => {
    seg = cheerio(seg);

    const flightNumber = parseInt(seg.find('.FlightNumber span').eq(0).text().trim());

    const depAirportCode = seg.find('.FlightNumber acronym').eq(0).text().trim();
    const depDate = req.depDate.format('YYYY-MM-DD');
    const depTime = seg.find('.FlightTime').eq(0).text().trim();

    const arrAirportCode = seg.find('.FlightNumber acronym').eq(1).text().trim();
    const arrDate = req.depDate.format('YYYY-MM-DD');
    const arrTime = seg.find('.FlightTime').eq(1).text().trim();

    segments.push(new Segment({
      carrier: 'AS',
      flightNumber: flightNumber,
      depAirportCode: depAirportCode,
      depDate: depDate,
      depTime: depTime,
      arrAirportCode: arrAirportCode,
      arrDate: depDate, // TODO
      arrTime: arrTime,
      durationMinutes: 0, // TODO
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
  $row.find('td.Hidden').remove();
  $row.find('td.has-price .PriceCell .Price').each((i,row) => {
    const p = parseInt(cheerio(row).text().trim().replace(/\D+/g, ''));
    if (!price || price > p) price = p;
  });
  return Math.round(price * 100);
}
