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
// const CXR = 'B6'
// const URL = 'https://www.jetblue.com/#/';
//
// ////////////////////////////////////////////////////////////////////////////////
//
// function activatePlugins() {
//   nightmare.action('insertApt', function(selector, aptCode, done) {
//     this.evaluate_now(function(selector, aptCode, callback) {
//       document.querySelector(selector).click();
//       setTimeout(function() {
//         try {
//           var elems = document.querySelectorAll(".airports-list-container ul.country-list li a")
//           for (var i = 0; i < elems.length; ++i) {
//             var elem = elems[i];
//             var location = elem.innerText;
//             var regex = new RegExp(`\(${aptCode}\)`);
//             if (!location) continue;
//             if (location && location.match(regex)) elem.click()
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
// module.exports = class JetBlue extends Website {
//
//   async fetchHtml() {
//     activatePlugins();
//     const browser = new Browser(this.log.bind(this), URL);
//     this.html = await browser.activate(page => {
//       page = page
//         .wait(1000)
//         .click('#jbBookerItinOW').wait(500)
//         .insertApt('cityselector[attr-labelid="jbBookerDepartLabel"] .flight_button_from_foreground', this.depApt).wait(500)
//         .insertApt('cityselector[attr-labelid="jbBookerArriveLabel"] .flight_button_from_foreground', this.arrApt).wait(500)
//         .insert('#jbBookerCalendarDepart', null).wait(1000)
//         .insert('#jbBookerCalendarDepart', this.depDate.format('MM-DD-YYYY')).wait(1000)
//         .click('input.piejs[type="submit"]').wait(5000)
//         .scrollTo(Math.floor(Math.random() * 500) + 200, 0).wait(1000);
//       return page;
//     }).fetch(remoteExtraction);
//   }
//
//   extractFlights() {
//     this.log('extracting flights from html');
//     const $ = cheerio.load(this.html);
//     const rows = $('table.resultWithFF3 > tbody')
//
//     rows.each((i,elem) => {
//       this.log(`extracting flight #${i}`);
//       const $tr = $(elem);
//       const $depTimes = $tr.find('tr .colDepart .time')
//       const $arrTimes = $tr.find('tr .colArrive .time')
//       const depTime = Utils.extractTime(...$depTimes.eq(0).text().trim().split(/\s+/g));
//       const arrTime = Utils.extractTime(...$depTimes.eq($depTimes.length-1).text().trim().split(/\s+/g));
//       const $flightNumbers = $tr.find('.flightCode a');
//       $flightNumbers.find('.wcag-offscreen').remove()
//       const flightNumbers = extractFlightNumbers($flightNumbers);
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
//         numStops: $tr.children('tr').length,
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
//       let atLastCol = false;
//       $tr.find('td.colCost').each((i,elem) => {
//         if (atLastCol) return;
//         const $elem = $(elem);
//         const matches = $elem.find('tbody .colPrice').text().trim().match(/\d+/);
//         if ($elem.hasClass('colCostLast')) atLastCol = true;
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
//     const flightNumber = parseInt(elem.text().trim().match(new RegExp('([0-9]+)', 'g'))[0]);
//     flightNumbers.push(flightNumber);
//   })
//   return flightNumbers;
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
