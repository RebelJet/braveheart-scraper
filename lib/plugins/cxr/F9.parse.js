const cheerio = require('cheerio');
const moment = require('moment');

const Utils = require('../../Utils');

////////////////////////////////////////////////////////////////////////////////

module.exports = function parse(req) {
  const flights = [];
  const $ = cheerio.load(req.html);
  const rows = $('.ibe-flight-info-container .ibe-flight-info');

  req.log('extracting flights from html');

  rows.each((i, row) => {
    req.log(`extracting flight #${i}`);
    const $row = $(row);
    const rawData = $row.find('.ibe-flight-duration-flightslink .ibe-link.flight-number').attr('data-det-json');
    const segments = JSON.parse(rawData).map(record => {
      const flightNumber = parseInt(record.flightNumber.trim());
      const segment = {
        cxr: record.carrierCode,
        flightNumber: flightNumber,
        flightId: flightNumber, // ToDo: remove
        depApt: record.departureStation,
        depDate: record.departureDate,
        depTime: Utils.extractTime(record.departureTime),
        arrApt: record.arrivalStation,
        arrDate: moment(record.arrivalDate.replace(/^[^,]+, /, ''), 'MMMM DD, YYYY'),
        arrTime: Utils.extractTime(record.arrivalTime),
      }
      return segment;
    });
    const firstSeg = segments[0];
    const lastSeg = segments[segments.length-1];
    const flightNumbers = segments.map(s => s.flightNumber);
    const flight = {
      cxr: firstSeg.cxr,
      depApt: firstSeg.depApt,
      depDate: firstSeg.depDate,
      depTime: firstSeg.depTime,
      arrApt: lastSeg.arrApt,
      arrDate: lastSeg.arrDate,
      arrTime: lastSeg.arrTime,
      flightNumbers: flightNumbers,
      flightIds: flightNumbers, // ToDo: remove
      numStops: flightNumbers.length - 1,
      segments: segments,
    }

    // extract price
    flight.price = extractPrice($row.find('.ibe-farebox-fare'), $)

    // add to flights array
    flights.push(flight);
  });
  return flights;
}

function extractPrice(elems, $) {
  let finalPrice;
  elems.each((i,elem) => {
    const $elem = $(elem);
    $elem.find('.ibe-radio-btn').remove()
    const matches = $elem.text().trim().match(/\d+/);
    if (!matches) return;
    const price = parseInt(matches[0]) * 100;
    if (!finalPrice || finalPrice > price) {
      finalPrice = price;
    }
  });
  return finalPrice;
}
