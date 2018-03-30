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
// const CXR = 'UA'
// const URL = 'https://www.united.com/ual/en/us/flight-search/book-a-flight/oneway/rev';
//
// ////////////////////////////////////////////////////////////////////////////////
//
// function activatePlugins() {
//   nightmare.action('showMore', function(done) {
//     this.evaluate_now(function(callback) {
//       (function showMore() {
//         try {
//           if (jQuery('#fl-results-loader-full:visible').length) {
//             return setTimeout(function() { showMore() }, 500);
//           }
//           var elem = document.querySelector('a#fl-results-pagerShowAll');
//           if (!elem) return callback();
//           elem.click();
//           callback();
//         }catch(err) {
//           console.log('ERROR: ', err);
//           callback(err)
//         }
//       })()
//     }, done)
//   });
// }
//
// module.exports = class United extends Website {
//
//   async fetchHtml() {
//     activatePlugins()
//     const browser = new Browser(this.log.bind(this), URL);
//     this.html = await browser.activate(page => {
//       page = page
//         .wait(1000)
//         .type('#Trips_0__Origin', this.depApt).wait(500)
//         .type('#Trips_0__Destination', this.arrApt).wait(500)
//         .type('#Trips_0__DepartDate', this.depDate.format('MMM DD, YYYY')).wait(1000)
//         .click('button#btn-search').wait(5000)
//         .showMore().wait(1000)
//       return page;
//     }).fetch(remoteExtraction);
//   }
//
//   extractFlights() {
//     this.log('extracting flights from html');
//     const $ = cheerio.load(this.html);
//     const rows = $('ul.flight-result-list li.flight-block')
//
//     rows.each((i,elem) => {
//       this.log(`extracting flight #${i}`);
//       const $tr = $(elem);
//       const $flightTimes = $tr.find('.flight-summary-top .flight-time')
//       $flightTimes.find('.visuallyhidden').remove()
//       const depTime = Utils.extractTime(...$flightTimes.eq(0).text().trim().split(/\s+/g));
//       const arrTime = Utils.extractTime(...$flightTimes.eq(1).text().trim().split(/\s+/g));
//       const flightNumbers = extractFlightNumbers($tr.attr('data-flight-hash'));
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
//         numStops: extractNumStops($tr.find('.flight-connection-container .connection-count').text().trim()),
//         segments: [],
//       }
//
//       // extract segments
//       flightNumbers.forEach(flightNumber => {
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
//       $tr.find('.flight-block-fares-container').each((i,elem) => {
//         const matches = $(elem).find('.price-point.price-point-revised').text().trim().match(/\d+/);
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
// function extractFlightNumbers(text) {
//   const matches = text.match(/^\d+-([0-9|]+)-\w{2}$/)
//   return matches[1].split('|')
// }
//
// function extractNumStops(text) {
//   const match = text.match(/(Nonstop|\d+\s+stop)/)[0];
//   if (!match || match.toLowerCase() === 'nonstop') {
//     return 0
//   } else {
//     return parseInt(match)
//   }
// }
