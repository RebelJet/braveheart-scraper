const cheerio = require('cheerio');
const Utils = require('../../Utils');

const Itinerary = require('../../models/Itinerary');
const Leg = require('../../models/Leg');
const Segment = require('../../models/Segment');
const Layover = require('../../models/Layover');

////////////////////////////////////////////////////////////////////////////////

module.exports = function parse(req) {
  console.log('PARSING')
  const itineraries = extractItinerariesFromHTML(req.data.html, req);
  return itineraries.sort((a,b) => a.price - b.price);
}

function extractItinerariesFromHTML(html, req) {
  const itineraries = [];

  const $ = cheerio.load(html);
  const $rows = $('table#faresOutbound tbody tr.bugTableRow');

  req.log('extracting itineraries from html');
  $rows.each((i, elem) => {
    req.log(`extracting flight #${i}`);
    const $row = cheerio(elem);
    const legs = extractLegsFromRow($row, req);
    const price = extractPriceFromRow($row, req);
    itineraries.push(new Itinerary(legs, price));
  });
  return itineraries;
}

function extractPriceFromRow($row, req) {
  let price = 0;
  $row.find('td.price_column').each((i,elem) => {
    const matches = cheerio(elem).find('.product_price').text().trim().match(/\d+/);
    if (!matches) return;
    const tmpPrice = parseInt(matches[0]) * 100;
    if (!price || price > tmpPrice) {
      price = tmpPrice;
    }
  });
  return price;
}

function extractLegsFromRow($row, req) {
  const segments = [];
  const layovers = [];

  $row.find('td.routing_column table.bugRoutingDetailsContainer tbody tr.flightRow').each((i,elem) => {
    const $departRow = cheerio(elem);
    const $arriveRow = $departRow.next();

    const $flightNumber = cheerio(elem).find('.flightNumber');

    const lastSeg = segments.length ? segments[segments.length-1] : null;
    const flightNumber = parseInt($flightNumber.text().trim().replace('#',''));

    const depAirportCode = extractAirportCode($departRow);
    const depTime = extractFlightTime($departRow);
    const depDate = lastSeg ? Utils.calculateMissingNextDate([lastSeg.arrDate, lastSeg.arrTime], [depTime]) : req.depDate.format('YYYY-MM-DD');

    const arrAirportCode = extractAirportCode($arriveRow);
    const arrTime = extractFlightTime($arriveRow);
    const arrDate = Utils.calculateMissingNextDate([depDate, depTime], [arrTime]);

    const durationMinutes = Utils.calculateDuration([ depAirportCode, depDate, depTime ], [ arrAirportCode, arrDate, arrTime ])

    if (lastSeg) {
      const layoverMinutes = Utils.calculateDuration([ lastSeg.arrAirportCode, lastSeg.arrDate, lastSeg.arrTime ], [ depAirportCode, depDate, depTime ])
      layovers.push(new Layover({ durationMinutes: layoverMinutes }));
    }

    segments.push(new Segment({
      carrier: req.cxr,
      flightNumber: flightNumber,
      depAirportCode: depAirportCode,
      depDate: depDate,
      depTime: depTime,
      arrAirportCode: arrAirportCode,
      arrDate: arrDate,
      arrTime: arrTime,
      durationMinutes: durationMinutes,
      stopoverMinutes: ''
    }));
  });

  return new Leg(segments, layovers);
}

//   rows.each((i,elem) => {
//     req.log(`extracting flight #${i}`);
//     const $row = $(elem);
//
//     const depTime = Utils.extractTime($row.find('td.depart_column .time').text(), $row.find('td.depart_column .indicator').text());
//     const arrTime = Utils.extractTime($row.find('td.arrive_column .time').text(), $row.find('td.arrive_column .indicator').text());
//     const arrDate = Utils.calculateArrDate(req.depDate.format('YYYY-MM-DD'), depTime, arrTime);
//     const flightNumbers = $row.find('td.flight_column .bugText').text().match(new RegExp('([0-9]+)', 'g'));
//     const leg = {
//       cxr: req.cxr,
//       depAirportCode: req.depApt,
//       depDate: req.depDate.format('YYYY-MM-DD'),
//       depTime: depTime,
//       arrAirportCode: req.arrApt,
//       arrDate: arrDate,
//       arrTime: arrTime,
//       flightNumbers: flightNumbers,
//       segments: [],
//     }
//
//     itineraries.push(leg);
//   })
//   return itineraries;
// }

////////////////////////////////////////////////////////////////////////////////////////////////////

function extractAirportCode($node) {
  let foundStopLine = false
  let lines = $node.find('.flightOrigin').text().trim().split("\n").reduce((lines, line) => {
    line = line.trim()
    if (line === 'Stops:') foundStopLine = true
    if (line && !foundStopLine) lines.push(line)
    return lines
  }, []);
  return lines[lines.length-1].match(/\(([A-Z]+)\)$/)[1]
}

function extractFlightTime($node) {
  return Utils.extractTime($node.find('.flightTime').text().trim().replace(/[^0-9a-z:]/gi,''))
}
