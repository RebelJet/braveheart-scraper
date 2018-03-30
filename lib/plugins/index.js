const moment = require('moment');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const Browser = require('../Browser');

const idsByLowercase = {};
const isDebugMode = process.env.IS_DEBUG_MODE === 'true';

////////////////////////////////////////////////////////////////////////////////////////////////////

exports.loadCXRs = function(...cxrIds) {
  loadPlugins('CXR', cxrIds);
}

exports.loadOTAs = function(...otaIds) {
  loadPlugins('OTA', otaIds);
}

exports.formatId = function formatId(id) {
  return idsByLowercase[id.toLowerCase()] || id;
}

exports.fetchDataFromFiles = fetchDataFromFiles;

////////////////////////////////////////////////////////////////////////////////////////////////////

function loadPlugins(pluginType, pluginIds) {
  for (let pluginId of pluginIds) {
    idsByLowercase[pluginId.toLowerCase()] = pluginId;
    exports[pluginType] = exports[pluginType] || {};
    exports[pluginType][pluginId] = exports[pluginType][pluginId] || loadPlugin(pluginType, pluginId);
  }
}

function loadPlugin(pluginType, pluginId) {
  const fetchDataFromSite = require(`./${pluginType.toLowerCase()}/${pluginId}.fetch`);
  const parseData = require(`./${pluginType.toLowerCase()}/${pluginId}.parse`);
  return function Plugin(req) {
    let browser;
    const self = {
      logs: [],
      itineraries: []
    }

    req.depDate = moment(req.depDate, 'YYYYMMDD');
    req.log = function(msg) {
      self.logs.push([new Date(), msg]);
      console.log(req.jobId ? `${req.jobId}: ${msg}` : msg);
    }

    self.run = async function run() {
      req.log(`STARTING request for ${pluginType} ${pluginId} ${req.depApt}->${req.arrApt} on ${req.depDate.format('YYYY-MM-DD')}`);
      const filepath = path.resolve(__dirname, '../../', `html/${pluginType}-${pluginId}-${req.depApt}-${req.arrApt}-${req.depDate.format('YYYY-MM-DD')}`)

      if (isDebugMode && recentFileExists(`${filepath}/results.json`)) {
        req.data = fetchDataFromFiles(filepath)
        self.html = req.data.html;
        self.filesByName = req.data.filesByName;
        self.itineraries = req.data.results;
        req.log(`FOUND IN CACHE`);
        return self;
      } else {
        browser = await new Browser();
        req.data = await fetchDataFromSite(req, browser);
        if (isDebugMode) saveDataToFiles(filepath, req.data)
        await self.cleanup();
        self.html = req.data.html;
        self.filesByName = req.data.filesByName;
      }

      self.itineraries = await parseData(req);
      if (isDebugMode) saveItinerariesToFile(filepath, self.itineraries)
      req.log(`FINISHED`);
    }

    self.cleanup = async function() {
      if (browser) await browser.closePage();
    }

    return self;
  }
}

function recentFileExists(filepath) {
  if (!doesFileExist(filepath)) return false;
  const currentMillis = new Date().getTime()
  const lastModifiedMillis = new Date(fs.statSync(filepath).mtime).getTime();
  const diffSecs = (currentMillis - lastModifiedMillis) / 1000;
  return (diffSecs <= 3600 * 24);
}

function doesFileExist(filepath) {
  return fs.existsSync(filepath)
}

function saveDataToFiles(filepath, data, results) {
  if (doesFileExist(filepath)) rimraf.sync(filepath);
  fs.mkdirSync(filepath);

  for (let name of Object.keys(data.filesByName)) {
    const contents = data.filesByName[name];
    name = name.replace(/[^a-z0-9]+/ig, '-');
    for (let i in contents) {
      saveToFile(`${filepath}/${name}-${i}.json`, JSON.stringify(contents[i], null, 2));
    }
  }
  saveToFile(`${filepath}/results.html`, data.html);
}

function saveItinerariesToFile(filepath, itineraries) {
  saveToFile(`${filepath}/results.json`, JSON.stringify(itineraries, null, 2));
}

function saveToFile(filename, content) {
  console.log(`- SAVING ${filename}`);
  fs.writeFileSync(filename, content);
}

function fetchDataFromFiles(filepath) {
  filepath = path.resolve(__dirname, filepath);
  const data = { filesByName: {} };

  fs.readdirSync(filepath).forEach((filename) => {
    const content = fs.readFileSync(`${filepath}/${filename}`, 'utf8');
    if (filename === 'results.html') {
      data.html = content;
    } else if (filename === 'results.json') {
      data.results = JSON.parse(content);
    } else {
      const name = filename.match(/^(.+)-[0-9]+\.json/)[1];
      const file = JSON.parse(content);
      data.filesByName[name] = data.filesByName[name] || [];
      data.filesByName[name].push(file);
    }
  });

  return data;
}
