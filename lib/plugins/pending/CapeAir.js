// 'use strict';
// // http://localhost:8080/9K/20171117/BOS/ALB
//
// const cheerio = require('cheerio');
// const moment = require('moment');
// const fs = require('fs');
//
// const Website = require('../Website');
// const Browser = require('../Browser');
// const Utils = require('../Utils');
//
// const CXR = '9K'
// const URL = 'https://www.capeair.com/book_flights/ibe-book-flights.html';
//
// ////////////////////////////////////////////////////////////////////////////////
//
// module.exports = class CapeAir extends Website {
//
//   async fetchHtml() {
//     const browser = new Browser(this.log.bind(this), URL);
//     this.html = await browser.activate(page => {
//       page = page
//         .wait(100000000)
//         .click('.one-way label').wait(100)
//         .select('#originAirport_displayed', this.depApt).wait(500)
//         .select('#destinationAirport_displayed', this.arrApt).wait(500)
//         .insert('label[for="departure-date"] input', null).wait(1000)
//         .type('label[for="departure-date"] input', this.depDate.format('MM/DD/YYYY')).wait(1000)
//         // .click('button.btn.btn-default[type="submit"]').wait(5000)
//         .scrollTo(Math.floor(Math.random() * 500) + 200, 0).wait(30000);
//       return page;
//     }).fetch(remoteExtraction);
//   }
//
//   extractFlights() {
//     this.log('extracting flights from html');
//     const $ = cheerio.load(this.html);
//     const rowGroups = extractRowGroups($)
//
//     rowGroups.forEach((rows, i) => {
//       this.log(`extracting flight #${i}`);
//       const depTime = Utils.extractTime(rows[0].find('td').eq(0).find('.flight-details-text').first().text().trim());
//       const arrTime = Utils.extractTime(rows[rows.length-1].find('td').eq(2).find('.flight-details-text').first().text().trim());
//       const flightNumbers = rows.map($tr => parseInt($tr.find('td').eq(4).text()));
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
//         numStops: rows.length - 1,
//         segments: [],
//       }
//
//       // extract segments
//       rows.forEach($tr => {
//         const flightNumber = parseInt($tr.find('td').eq(4).text());
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
//       flight.price = extractPrice(rows[0].find('td').last().text())
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
// function extractRowGroups($) {
//   const rowGroups = [];
//   let currentRowGroup = [];
//   let rowsToCapture = 0;
//   $('table.avail-table tbody tr.avail-table-fare-row').each((i,elem) => {
//     const $tr = $(elem);
//     if (!rowsToCapture) {
//       const rowspan = parseInt($tr.children().last().attr('rowspan') || 1);
//       rowsToCapture = rowspan;
//     }
//     currentRowGroup.push($tr);
//     rowsToCapture -= 1;
//     if (!rowsToCapture) {
//       rowGroups.push(currentRowGroup);
//       currentRowGroup = []
//     }
//   })
//   return rowGroups;
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
