#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const moment = require('moment');

const filepath = path.resolve(__dirname, '../html/CXR-WN-ATL-PHL-2018-05-26-2018-05-30');
const PluginBase = require('../lib/Plugins');

async function run() {
  const [ pluginType, pluginId, depApt, arrApt, depDate, retDate ] = filepath.match(/([^-]{3})-([^-]+)-([A-Z]{3})-([A-Z]{3})-(\d{4}-\d{2}-\d{2})-?(\d{4}-\d{2}-\d{2})?$/).slice(1)
  const Parse = require(`../plugins/${pluginType.toLowerCase()}/${pluginId}.parse`);
  const req = {
    data: await PluginBase.fetchDataFromFiles(filepath),
    depApt,
    arrApt,
    depDate: moment(depDate, 'YYYY-MM-DD'),
    retDate: retDate ? moment(retDate, 'YYYY-MM-DD') : null,
  }
  const flights = Parse(req);

  flights.slice(0).forEach(flight => {
    console.log('------------------------------------');
    // console.log(flight.legs[0].carriers.join('-'), (flight.price + 0) / 100);
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
