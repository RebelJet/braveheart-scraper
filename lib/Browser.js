const fs = require('fs');
const puppeteer = require('puppeteer');
const Utils = require('./Utils');

async function makePageUndetectable(page) {
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
  });
  await page.setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/64.0.3282.186 Safari/537.36");
}

function load() {
  return new Promise(async (resolve, reject) => {
    const options = { args: ['--disable-dev-shm-usage', '--no-sandbox', '--disable-setuid-sandbox'] }

    if (process.env.IS_DEBUG_MODE === 'true') {
      options.headless = false;
      options.ignoreDefaultArgs = true;
      options.args = puppeteer.defaultArgs().filter(arg => arg !== '--disable-popup-blocking').concat(options.args)
      // options.devtools = true;
      // options.dumpio = true;
    }

    const browser = await puppeteer.launch(options);
    const pages = await browser.pages();
    for (let page of pages) {
      await makePageUndetectable(page);
    }

    resolve(browser)
  })
}

let loadingBrowser = load();
let browser;

async function createPage() {
  if (!browser) browser = await loadingBrowser;
  const page = await browser.newPage();
  await makePageUndetectable(page);
  return page;
}

///////////////////////////////////////////////////////////////////////////////////////////

module.exports = function Browser(options={}) {
  return new Promise(async (resolve, reject) => {
    let resultsPageIsLoaded = false;
    let blockImages = false;
    let urlResults = [];

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
        console.log(err);
        throw new Error(err)
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
        console.log(err);
        throw new Error(err);
      }
    });

    page.on('response', async function onResponse(response) {
      try {
        if (options.onResponse) await options.onResponse(response);
      } catch(err) {
        console.log(err);
        throw new Error(err);
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

    return resolve(self);
  })
}
