const cheerio = require('cheerio');
const moment = require('moment');

const Utils = require('../../lib/Utils');

////////////////////////////////////////////////////////////////////////////////

module.exports = function parse(req) {
  const flights = [];
  const $ = cheerio.load(req.html);
  const rows = $('.sortThisTable .row.rowsMarket1')

  req.log('extracting flights from html');
  if (rows.eq(0) && rows.eq(0).find('div.no-seats').length) return;

  rows.each((i,row) => {
    req.log(`extracting flight #${i}`);
    const $row = $(row);
    $row.find('.depart label').remove()
    $row.find('.depart span').remove()
    $row.find('.arrive span').remove()
    $row.find('.arrive label').remove()
    const depTimeAmPm = $row.find('.depart sup').remove().text().trim();
    const arrTimeAmPm = $row.find('.arrive sup').remove().text().trim();
    const depTime = Utils.extractTime($row.find('.depart').text().trim(), depTimeAmPm);
    const arrTime = Utils.extractTime($row.find('.arrive').text().trim(), arrTimeAmPm);
    const airports = $row.find('.standardFare input.standardFareInput').attr('data-market').split(',').map(s => s.split('|'))
    const flightNumbers = [];
    const flight = {
      cxr: req.cxr,
      depApt: req.depApt,
      depDate: req.depDate.format('YYYY-MM-DD'),
      depTime: depTime,
      arrApt: req.arrApt,
      arrTime: arrTime,
      arrDate: Utils.calculateArrDate(req.depDate.format('YYYY-MM-DD'), depTime, arrTime),
      flightNumbers: flightNumbers,
      flightIds: flightNumbers, // ToDo: remove this
      numStops: extractNumStops($row.find('.stops a.stopsLink').text()),
      stopApts: (airports.length > 1) ? airports.slice(1).map(a => a[0]) : [],
      segments: [],
    }

    // extract segments
    $row.find('.stops .popUpContent .flight-info-header').each((i,elem) => {
      const $header = $(elem);
      const $details = $header.parent().parent().next();
      const lastSeg = flight.segments.length ? flight.segments[flight.segments.length-1] : null;

      const segDepApt = airports[i][0];
      const segDepTime = Utils.extractTime($details.find('.flight-info-body div').eq(1).text().trim());
      const segDepDate = lastSeg ? Utils.calculateArrDate(lastSeg.arrDate, lastSeg.arrTime, segDepTime) : flight.depDate;

      const segArrApt = airports[i][1];
      const segArrTime = Utils.extractTime($details.find('.flight-info-body div').eq(4).text().trim());
      const segArrDate = Utils.calculateArrDate(segDepDate, segDepTime, segArrTime);

      const flightNumber = parseInt($header.find('.fi-header-text.text-right').text().trim().match(/(\d+)/)[1]);
      const segment = {
        cxr: req.cxr,
        flightNumber: flightNumber,
        flightId: flightNumber, // ToDo: remove this
        depApt: segDepApt,
        depDate: segDepDate,
        depTime: segDepTime,
        arrApt: segArrApt,
        arrDate: segArrDate,
        arrTime: segArrTime,
      };
      flightNumbers.push(flightNumber);
      flight.segments.push(segment);
    });
    // extract price
    flight.price = $row.find('.bareFare .standardFare .emPrice').first().text().trim().match(/[0-9\.]+/)[0] * 100

    // add to flights array
    flights.push(flight);
  });
  return flights;
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
