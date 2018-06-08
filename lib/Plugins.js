const moment = require('moment');
const path = require('path');
const fs = require('fs');
const rimraf = require('rimraf');

const Browser = require('../lib/Browser');

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
    exports[pluginId] = exports[pluginId] || loadPlugin(pluginType, pluginId);
  }
}

function loadPlugin(pluginType, pluginId) {
  const fetchDataFromSite = require(`../plugins/${pluginType.toLowerCase()}/${pluginId}.fetch`);
  const parseData = require(`../plugins/${pluginType.toLowerCase()}/${pluginId}.parse`);
  return function Plugin(req) {
    let browser;
    const self = {
      logs: [],
      itineraries: []
    }

    req.depDate = moment(req.depDate, 'YYYYMMDD');
    req.retDate = req.retDate ? moment(req.retDate, 'YYYYMMDD') : null;
    req.log = function(msg) {
      self.logs.push([new Date(), msg]);
      console.log(req.jobId ? `${req.jobId}: ${msg}` : msg);
    }

    self.run = async function run() {
      const dates = [ req.depDate, req.retDate ].filter(d => d).map(d => d.format('YYYY-MM-DD'));
      const filepath = path.resolve(__dirname, '../', `html/${pluginType}-${pluginId}-${req.depApt}-${req.arrApt}-${dates.join('-')}`)
      req.log(`STARTING request for ${pluginType} ${pluginId} ${req.depApt}->${req.arrApt} on ${dates.join('-')}`);

      if (isDebugMode && recentFileExists(`${filepath}/results.json`)) {
        req.data = fetchDataFromFiles(filepath)
        self.html = req.data.html;
        self.filesByName = req.data.filesByName;
        self.itineraries = req.data.results;
        req.log(`FOUND IN CACHE`);
        return self;
      } else {
        browser = await new Browser();
        req.data = await runFetchDataFromSite(req, browser, fetchDataFromSite, filepath);
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

function runFetchDataFromSite(req, browser, fetchDataFromSite, filepath) {
  const onError = fetchDataFromSite.onError;
  const data = { filesByName: {} };
  return new Promise(async (resolve, reject) => {
    browser.onError(err => {
      err = (onError ? onError(err): null) || err;
      reject(err)
    });

    try {
      if (isDebugMode) {
        if (doesFileExist(filepath)) rimraf.sync(filepath);
        fs.mkdirSync(filepath);
      }

      const addFile = function(name, content, type='json') {
        data.filesByName[name] = data.filesByName[name] || [];
        data.filesByName[name].push(content);
        if (isDebugMode) {
          const i = data.filesByName[name].length-1;
          name = name.replace(/[^a-z0-9]+/ig, '-');
          if (type === 'json') content = JSON.stringify(content, null, 2);
          saveToFile(`${filepath}/${name}-${i}.${type}`, content);
        }
      };

      data.html = await fetchDataFromSite(req, browser, { addFile });

      if (isDebugMode) saveToFile(`${filepath}/results.html`, data.html);

      resolve(data);
    } catch(err) {
      err = (onError ? onError(err): null) || err;
      reject(err)
    }
  })
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
      const [ name, type ] = filename.match(/^(.+)-[0-9]+\.(.+)$/).slice(1);
      const file = (type === 'json') ? JSON.parse(content) : content;
      data.filesByName[name] = data.filesByName[name] || [];
      data.filesByName[name].push(file);
    }
  });

  return data;
}
