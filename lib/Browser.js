const fs = require('fs');
const puppeteer = require('puppeteer');
const Utils = require('./Utils');
const BrowserEvader = require('./BrowserEvader');

function load() {
  return new Promise(async (resolve, reject) => {
    const options = { args: ['--no-sandbox', '--disable-setuid-sandbox', '--disk-cache-size=0'] }
    // '--disable-dev-shm-usage',

    if (process.env.IS_DEBUG_MODE === 'true') {
      console.log('IS_DEBUG_MODE')
      options.headless = false;
      options.devtools = true;
      // options.dumpio = true;
    }
    options.ignoreDefaultArgs = true;
    options.args = puppeteer.defaultArgs().filter(arg => arg !== '--disable-popup-blocking').concat(options.args)

    console.log(puppeteer.executablePath());
    console.log(options.args.join(' '))

    const browser = await puppeteer.launch(options);
    const pages = await browser.pages();
    for (let page of pages) {
      await BrowserEvader(browser, page);
    }
    // pages[0].goto('http://localhost:8125/?braveheart');

    resolve(browser)
  })
}

let loadingBrowser = load();
let browser;

async function createPage() {
  if (!browser) browser = await loadingBrowser;
  const page = await browser.newPage();
  await BrowserEvader(browser, page);
  return page;
}

///////////////////////////////////////////////////////////////////////////////////////////

module.exports = function Browser(options={}) {
  return new Promise(async (resolve, reject) => {
    let resultsPageIsLoaded = false;
    let blockImages = false;
    let urlResults = [];
    let onError;

    const self = {};
    const page = await createPage();

    function isResultsPage(url) {
      return urlResults.some(u => url.includes(u));
    }

    // page.evaluateOnNewDocument(() => {
    //   window.open = () => null;
    // });

    page.on('load', async function onLoad() {
      try {
        const title = await page.title()
        const url = await page.url()
        if (!isResultsPage(url)) return;
        if (resultsPageIsLoaded.resolve) {
          resultsPageIsLoaded.resolve();
          resultsPageIsLoaded.resolved = true;
        } else {
          resultsPageIsLoaded = true;
        }
      } catch(err) {
        if (onError) onError(err);
        else throw new Error(err);
      }
    })

    await page.setRequestInterception(true);
    page.on('request', async function onRequest(request) {
      try {
        const resourceType = request.resourceType();
        const url = request.url();
        if (resourceType === 'image') {
          blockImages ? request.abort() : request.continue();
        } else {
          // if (resourceType === 'xhr' && url.includes('https://skiplagged.com/api/search.php')) {
          //   await Utils.sleep(999999);
          // }
          request.continue();
        }

        if (options.onRequest) await options.onRequest(request);

      } catch(err) {
        if (onError) onError(err);
        else throw new Error(err);
      }
    });

    page.on('response', async function onResponse(response) {
      try {
        if (options.onResponse) await options.onResponse(response);
      } catch(err) {
        if (onError) onError(err);
        else throw new Error(err);
      }
    });

    // page.setDefaultNavigationTimeout(timeout)

    page.blockImages = async function blockImages() {
      blockImages = true;
    }

    page.resultsPageIsLoaded = function(isSinglePageApp=false) {
      return new Promise((resolve, reject) => {
        if (resultsPageIsLoaded) {
          resolve()
        } else {
          resultsPageIsLoaded = { resolve, reject };
          setTimeout(async function() {
            if (!isSinglePageApp || resultsPageIsLoaded.resolved) return;
            const url = await page.evaluate(() => location.href);
            if (isResultsPage(url)) {
              resultsPageIsLoaded.resolve();
              resultsPageIsLoaded.resolved = true;
            }
          }, 3000);
        }
      })
    }

    self.page = page;

    self.config = function config(_options) {
      options = _options;
    }

    self.loadPage = async function loadPage(urlStart, _urlResults) {
      if (typeof _urlResults === 'string') {
        urlResults.push(_urlResults)
      } else urlResults = _urlResults || [];

      await page.goto(urlStart, { waitUntil: options.waitUntil || 'networkidle2' });
      return page;
    }

    self.closePage = async function closePage() {
      if (self.page) {
        await self.page.close()
        delete self.page;
      }
    }

    self.onError = function(callback) {
      onError = callback;
    }

    return resolve(self);
  })
}

module.exports.reload = async function() {
  await browser.close();
  loadingBrowser = load();
  browser = null;
}
