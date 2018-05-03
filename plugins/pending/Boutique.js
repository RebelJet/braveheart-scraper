// 'use strict';
//
// const cheerio = require('cheerio');
// const moment = require('moment');
// const fs = require('fs');
//
// const Website = require('../Website');
// const Browser = require('../Browser');
// const Utils = require('../Utils');
//
// const CXR = '4B'
// const URL = 'https://www.boutiqueair.com/flight_search/new';
//
// ////////////////////////////////////////////////////////////////////////////////
//
// function activatePlugins() {
//   nightmare.action('selectApt', function(selector, aptCode, done) {
//     this.evaluate_now(function(selector, aptCode, callback) {
//       setTimeout(function() {
//         try {
//           var elems = document.querySelectorAll(selector);
//           for (var i = 0; i < elems.length; ++i) {
//             var elem = elems[i];
//             var label = elem.nextElementSibling.innerText.trim();
//             var regex = new RegExp(`\(${aptCode}\)`);
//             if (label.match(regex)) {
//               elem.click()
//               break;
//             }
//           }
//           callback()
//         } catch(err) {
//           callback(err)
//         }
//       }, 1000)
//     }, done, selector, aptCode)
//   });
// }
//
// ////////////////////////////////////////////////////////////////////////////////
//
// module.exports = class Boutique extends Website {
//
//   async fetchHtml() {
//     activatePlugins();
//     const browser = new Browser(this.log.bind(this), URL);
//     this.html = await browser.activate(page => {
//       page = page
//         .wait(1000)
//         .select('#flight_search_finder_reservation_type', 'one_way').wait(100)
//         .selectApt('input[name="flight_search_finder[origin_id]"]', this.depApt).wait(500)
//         .selectApt('input[name="flight_search_finder[destination_id]"]', this.arrApt).wait(500)
//         .type('#flight_search_finder_outbound_date', null).wait(100)
//         .type('#flight_search_finder_outbound_date', this.depDate.format('MM/DD/YYYY')).wait(500)
//         .click('#flight_search_finder_submit_action input[type="submit"]').wait(5000)
//         .scrollTo(Math.floor(Math.random() * 500) + 200, 0).wait(1000);
//       return page;
//     }).fetch(remoteExtraction);
//   }
//
//   extractFlights() {
//     this.log('extracting flights from html');
//     const $ = cheerio.load(this.html);
//     const rows = $('table.flight-search-results tbody tr')
//
//     rows.each((i,row) => {
//       this.log(`extracting flight #${i}`);
//       const $row = $(row);
//       const depTimes = $row.find('td').eq(0).find('strong').text().match(/(\d+:\d+)(a|p)/).slice(1);
//       const arrTimes = $row.find('td').eq(1).find('strong').text().match(/(\d+:\d+)(a|p)/).slice(1);
//       const depTime = Utils.extractTime(depTimes[0], depTimes[1]);
//       const arrTime = Utils.extractTime(arrTimes[0], arrTimes[1]);
//       const flightNumbers = extractFlightNumbers($row.find('td.flight-numbers ul li'));
//       const flight = {
//         cxr: CXR,
//         depApt: this.depApt,
//         depTime: depTime,
//         depDate: this.depDate.format('YYYY-MM-DD'),
//         arrApt: this.arrApt,
//         arrTime: arrTime,
//         arrDate: Utils.calculateArrDate(this.depDate.format('YYYY-MM-DD'), depTime, arrTime),
//         flightNumbers: flightNumbers,
//         flightIds: flightNumbers, // ToDo: remove this
//         numStops: extractNumStops($row.find('td').eq(4).text().trim()),
//         segments: [],
//       }
//
//       // extract segments
//       flight.flightNumbers.forEach(flightNumber => {
//         const segment = {
//           cxr: CXR,
//           flightNumber: flightNumber,
//           flightId: flightNumber, // ToDo: remove this
//           // depApt: extractDepApt($segment),
//           // depTime: Utils.extractTime($segment.find('.flightTime.departDetails').text().trim().replace(/[^0-9a-z:]/gi,'')),
//           // depDate: this.depDate.format('YYYY-MM-DD'),
//         };
//         flight.segments.push(segment);
//       });
//
//       // extract price
//       $row.find('td.fare').each((i,elem) => {
//         const matches = $(elem).text().trim().match(/[0-9\.]+/);
//         if (!matches) return;
//         const price = parseInt(matches[0]) * 100;
//         if (!flight.price || flight.price > price) {
//           flight.price = price;
//         }
//       });
//
//       // add to flights array
//       this.flights.push(flight);
//     })
//   }
// }
//
// function extractPrice(text) {
//   const matches = text.trim().match(/[0-9\.]+/);
//   return matches ? matches[0] * 100 : null
// }
//
// function remoteExtraction(doneCb) {
//   setTimeout(function() {
//     try {
//       doneCb(null, document.documentElement.innerHTML)
//     }catch(err) {
//       remoteExtraction(doneCb)
//     }
//   }, 5000)
// }
//
// ///////////////
//
// function extractFlightNumbers(elems) {
//   const flightNumbers = [];
//   elems.each((i,elem) => {
//     elem = cheerio.load(elem);
//     const flightNumber = parseInt(elem.text().trim());
//     flightNumbers.push(flightNumber);
//   })
//   return flightNumbers;
// }
//
// function extractNumStops(text) {
//   const match = text.match(/(Nonstop|\d+\s+stop)/i)[0];
//   if (!match || match.toLowerCase() === 'nonstop') {
//     return 0
//   } else {
//     return parseInt(match)
//   }
// }
