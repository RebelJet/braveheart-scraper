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
// const CXR = 'DL'
// const URL = 'https://www.delta.com/';
//
// ////////////////////////////////////////////////////////////////////////////////
//
// function activatePlugins() {
//   nightmare.action('ensureFormIsFilled', function(fieldsData, done) {
//     this.evaluate_now(function(fieldsData) {
//       fieldsData.forEach(fieldData => {
//         if (!document.querySelector(fieldData.selector).value) {
//           document.querySelector(fieldData.selector).value = fieldData.value;
//         }
//       });
//     }, done, fieldsData)
//   });
//
//   nightmare.action('clickShowAllFlights', function(done) {
//     this.evaluate_now(function(callback) {
//       const showAllFooter = document.querySelector('#showAll-footer');
//       if (!showAllFooter) return callback();
//       showAllFooter.click();
//       (function waitUntilFinished() {
//         setTimeout(function(){
//           document.querySelector('.blockUI.blockOverlay') ? waitUntilFinished() : callback()
//         }, 1000)
//       })();
//     }, done);
//   });
// }
//
// ////////////////////////////////////////////////////////////////////////////////
//
// module.exports = class Delta extends Website {
//
//   async fetchHtml() {
//     activatePlugins();
//     const browser = new Browser(this.log.bind(this), URL);
//     this.html = await browser.activate(page => {
//       page = page
//         .wait(1000)
//         .click('#oneWayBtn').wait(100)
//         .type('#originCity', '').wait(300)
//         .type('#originCity', this.depApt).wait(200)
//         .type('#destinationCity', '').wait(300)
//         .type('#destinationCity', this.arrApt).wait(200)
//         .type('#departureDate', false).wait(200)
//         .type('#departureDate', this.depDate.format('MM/DD/YYYY')).wait(100)
//         .ensureFormIsFilled([
//           {selector: '#originCity', value: this.depApt},
//           {selector: '#destinationCity', value: this.arrApt}
//         ]).wait(100)
//         .click('#findFlightsSubmit')
//         .wait('.paginationContainer #paginglabelBot')
//         .clickShowAllFlights().wait(500)
//         .scrollTo(Math.floor(Math.random() * 2000) + 200, 0).wait(500);
//       return page;
//     }).fetch(remoteExtraction);
//   }
//
//   extractFlights() {
//     this.log('extracting flights from html');
//     const $ = cheerio.load(this.html);
//     const rows = $('#container ul#_fareDisplayContainer_tmplHolder table.fareDetails');
//
//     rows.each((i,row) => {
//       this.log(`extracting flight #${i}`);
//       const $row = $(row);
//       const tripTimes = $row.find('.tripLocation').text().trim().match(/^([0-9]+:[0-9]+)(AM|PM)\s+to\s+([0-9]+:[0-9]+)(AM|PM)/i);
//       const depTime = Utils.extractTime(tripTimes[1], tripTimes[2]);
//       const arrTime = Utils.extractTime(tripTimes[3], tripTimes[4]);
//       const flightNumbers = extractFlightNumbers($row.find('.fareSectionFlightNumber .itinaryFlightNumber a.flightSecFocus'));
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
//         numStops: extractNumStops($row.find('.fareRowContainer .stopInfoWrapper a').text()),
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
//       $row.find('td.fourFareDisplayCol').each((i,elem) => {
//         let $price_column = $(elem);
//         let dollars = $price_column.find('.priceHolder .priceBfrDec').text().trim().replace(/[^0-9]+/g, '');
//         let cents = $price_column.find('.priceHolder sub').text().trim().replace(/\.[^0-9]+/g, '');
//         let rbdMatches = $price_column.find('.flightCabinClass').text().trim().match(/\(([^)]+)\)/)
//         if (!dollars) return;
//         let price = Math.ceil(parseFloat(dollars+cents)) * 100;
//         if (!flight.price || flight.price > price) {
//           flight.price = price
//           if (rbdMatches) flight.rbds = rbdMatches[1].split(',').map(rbd => rbd.trim())
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
// function extractNumStops(text) {
//   text = text.trim().toLowerCase();
//   if (text.match('nonstop')) {
//     return 0
//   }else {
//     let matches = text.match(/([0-9])+\s+stop/);
//     return parseInt(matches[1])
//   }
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
//   return elems.map((i, el) => {
//     return parseInt(cheerio.load(el).text().replace(/[^0-9]+/g, ''))
//   }).get()
// }
