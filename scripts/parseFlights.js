const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');

const filepath = path.resolve(__dirname, '../html/OTA-Kiwi-ATL-FRA-2018-04-22');
const PluginBase = require('../lib/plugins');

async function run() {
  const [ pluginId, depApt, arrApt, depDate ] = filepath.match(/([^-]+)-([A-Z]{3})-([A-Z]{3})-(\d{4}-\d{2}-\d{2})$/).slice(1)
  const Parse = require(`../lib/plugins/ota/${pluginId}.parse`);

  const req = {
    data: await PluginBase.fetchDataFromFiles(filepath),
    depApt,
    depDate: moment(depDate, 'YYYY-MM-DD'),
    arrApt
  }
  const flights = Parse(req);

  flights.slice(0,1).forEach(flight => {
    console.log('------------------------------------');
    // console.log(flight.price);
    console.log(JSON.stringify(flight, null, 2));
    // process.exit();
  })
  console.log('=======================================');
  console.log(`FOUND ${flights.length} FLIGHTS`);
  process.exit();
}

run().then(() => {
  console.log('DONE')
}).catch(err => {
  console.log(err.stack)
})
