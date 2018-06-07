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
// const CXR = 'AA'
// // const URL = 'https://www.aa.com/booking/find-flights?tripType=oneWay';
// const URL = 'https://www.aa.com/homePage.do';
//
// ////////////////////////////////////////////////////////////////////////////////
//
// function activatePlugins() {
//   nightmare.action('submitForm', function(depApt, arrApt, depDate, done) {
//     this.evaluate_now(function(depApt, arrApt, depDate, callback) {
//       // function triggerMouseEvent(node, eventType) {
//       //   var clickEvent = document.createEvent('MouseEvents');
//       //   clickEvent.initEvent(eventType, true, true);
//       //   node.dispatchEvent(clickEvent);
//       // }
//       (function submitForm(retries=0) {
//         try {
//           // jQuery("#flightTripType a[href='#oneway']").click();
//           // jQuery('input#segments0\\.origin').val(depApt);
//           // jQuery('input#segments0\\.destination').val(arrApt);
//           // jQuery('input#segments0\\.travelDate').val(depDate);
//
//           // var targetNode = document.querySelector('input#flightSearchForm\\.button\\.reSubmit')
//           // triggerMouseEvent(targetNode, "mouseover");
//           // triggerMouseEvent(targetNode, "mousedown");
//           // triggerMouseEvent(targetNode, "mouseup");
//           // triggerMouseEvent(targetNode, "click");
//
//           jQuery('label[for="flightSearchForm.tripType.oneWay"]').click()
//           jQuery('input[name="originAirport"]').val(depApt);
//           jQuery('input[name="destinationAirport"]').val(arrApt);
//           jQuery('input[name="departDate"]').val(depDate);
//           jQuery('input#flightSearchForm\\.button\\.reSubmit').click();
//           callback()
//         } catch(err) {
//           (retries > 5) ? callback(`submitForm error after ${retries} retries: ${err}:\n${document.documentElement.innerHTML}`) : setTimeout(submitForm, 1000, retries+1);
//         }
//       })();
//     }, done, depApt, arrApt, depDate)
//   });
//   nightmare.action('showMore', function(done) {
//     this.evaluate_now(function(callback) {
//       (function showMore(retries=0) {
//         try {
//           var $elems = jQuery('a.showmorelink:visible');
//           if (!$elems.length) return callback();
//           $elems.click();
//         }catch(err) {
//           return (retries > 5) ? callback(`showMore error after ${retries} retries: ${err}`) : setTimeout(showMore, 1000, retries+1);
//         }
//         setTimeout(showMore, 1000, retries);
//       })();
//     }, done)
//   });
// }
//
// ////////////////////////////////////////////////////////////////////////////////
//
// module.exports = class American extends Website {
//
//   async fetchHtml() {
//     activatePlugins()
//     const browser = new Browser(this.log.bind(this), URL);
//     this.html = await browser.activate(page => {
//       page = page
//         .wait(2000)
//         .submitForm(this.depApt, this.arrApt, this.depDate.format('MM/DD/YYYY')).wait(5000)
//         .showMore().wait(1000);
//       return page;
//     }).fetch(remoteExtraction);
//   }
//
//   extractFlights() {
//     this.log('extracting flights from html');
//     const $ = cheerio.load(this.html);
//     const rows = $('ul.search-results-normal li.flight-search-results')
//
//     rows.each((i,row) => {
//       this.log(`extracting flight #${i}`);
//       const $row = $(row);
//       const $flightTimes = $row.find('.flight-time')
//       const depTime = Utils.extractTime(...$flightTimes.eq(0).text().trim().split(/\s+/g));
//       const arrTime = Utils.extractTime(...$flightTimes.eq(1).text().trim().split(/\s+/g));
//       const flightNumbers = extractFlightNumbers($row.find('.flight-details .flight-info .flight-numbers'));
//       const flight = {
//         cxr: CXR,
//         depApt: this.depApt,
//         depTime: depTime,
//         depDate: this.depDate.format('YYYY-MM-DD'),
//         arrApt: this.arrApt,
//         arrTime: arrTime,
//         arrDate: Utils.calculateArrDate(this.depDate.format('YYYY-MM-DD'), depTime, arrTime),
//         flightNumbers: flightNumbers,
//         numStops: extractNumStops($row.find('.flight-duration-stops')),
//         segments: [],
//       }
//
//       // extract segments
//       flight.flightNumbers.forEach(flightNumber => {
//         const segment = {
//           cxr: CXR,
//           flightNumber: flightNumber,
//           // depApt: extractDepApt($segment),
//           // depTime: Utils.extractTime($segment.find('.flightTime.departDetails').text().trim().replace(/[^0-9a-z:]/gi,'')),
//           // depDate: this.depDate.format('YYYY-MM-DD'),
//         };
//         flight.segments.push(segment);
//       });
//
//       // extract price
//       flight.price = extractPrice($row.find('.fareselector.fareType_MainCabin .content .amount .price').text())
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
//     const flightNumber = parseInt(elem.text().trim().match(new RegExp('([0-9]+)', 'g'))[0]);
//     flightNumbers.push(flightNumber);
//   })
//   return flightNumbers;
// }
//
// function extractNumStops($elem) {
//   let text = $elem.find('.num-stops-tooltip a').text().trim()
//   if (!text) text = $elem.text().trim();
//   const match = text.match(/(Nonstop|\d+\s+stop)/)[0];
//   if (!match || match.toLowerCase() === 'nonstop') {
//     return 0
//   } else {
//     return parseInt(match)
//   }
// }
