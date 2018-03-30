const Utils = require('../../Utils');

const UrlHome = 'https://www.kayak.com/';
const UrlResults = 'https://www.kayak.com/flights/';

////////////////////////////////////////////////////////////////////////////////

let isOnResultsPage = false;

module.exports = async function fetch(req, browser) {
  const filesByName = {};
  browser.config({
    async onResponse(res) { await addToFiles(res, filesByName) },
    waitUntil: 'domcontentloaded'
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    await page.waitFor('.Base-Search-SearchForm');
    await Utils.sleep(500);

    const formId = await page.$eval('.Base-Search-SearchForm', e => e.id);
    const switchId = await page.$eval('.Base-Search-SearchForm .col-switch > div', e => e.id);

    await page.click(`#${switchId}-switch-display`);
    const switchOption2 = `#${switchId}-switch-option-2`
    await page.waitForSelector(switchOption2, { visible: true })
    await page.click(switchOption2);

    // depAirportCode
    console.log('INSERTING depAirportCode');
    const depBox = `#${formId}-origin-airport-display`;
    const depInput = `#${formId}-origin-airport`;
    await Utils.sleep(500);
    await page.click(depBox);
    await page.waitForSelector(depInput, { visible: true })
    await page.click(depInput);
    await page.evaluate(function(selector, value) {
      document.querySelector(selector).value = value;
    }, depInput, req.depApt)
    await page.click(`#${formId}-origin-airport`);
    await Utils.sleep(500);
    await page.evaluate((formId, aptCode) => {
      return new Promise((resolve, reject) => {
        (function selectNode() {
          const elem = document.querySelector(`#${formId}-origin-airport-smartbox-dropdown > ul li[data-apicode='${aptCode}']`)
          if (!elem) return setTimeout(selectNode, 100);
          elem.click();
          resolve();
        })();
      })
    }, formId, req.depApt);

    // arrAirportCode
    console.log('INSERTING arrAirportCode');
    const arrBox = `#${formId}-destination-airport-display`;
    const arrInput = `#${formId}-destination-airport`;
    await page.waitForSelector(arrInput, { visible: true })
    await page.click(arrInput);
    await page.evaluate(function(selector, value) {
      document.querySelector(selector).value = value;
    }, arrInput, req.arrApt)
    await Utils.sleep(500);
    const clickElem = `#${formId}-destination-airport-smartbox-dropdown > ul li[data-apicode='${req.arrApt}']`;
    await page.waitForSelector(clickElem, { visible: true })
    await page.click(clickElem)

    // depDate
    const dateBox = `#${formId}-dateRangeInput-display-start`
    const dateInput = `#${formId}-depart-input`;
    await Utils.sleep(500);
    await page.click(dateBox);
    await page.waitForSelector(dateInput, { visible: true })
    await page.click(dateInput);

    while (true) {
      const depDate = req.depDate.format('MM/DD/YYYY');
      await page.type(dateInput, depDate)
      const curValue = await page.evaluate(dateInput => {
        return document.querySelector(dateInput).innerText;
      }, dateInput);
      await Utils.sleep(500);
      await page.click(dateInput);
      await page.keyboard.press('Enter');
      await Utils.sleep(500);
      if (curValue === depDate) break;
      console.log(`RETRYING ${dateInput}: `, depDate, curValue);
    }

    // do not open comparison windows
    await page.click(`button#${formId}-compareTo-noneLink`)

    isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.blockImages();
    await page.click(`button#${formId}-submit`);
    await page.resultsPageIsLoaded(true);

    await page.waitForFunction(function() {
      const overlayElem = document.querySelector('.Flights-Results-FlightPriceAlertDriveBy');
      if (overlayElem && overlayElem.offsetParent) {
        document.querySelector(`#${overlayElem.getAttribute('id')}-dialog-close`).click()
      }
      const progressElem = document.querySelector('.Common-Results-ProgressBar');
      if (progressElem && !progressElem.className.includes('Hidden')) return false;

      const resultsElem = document.querySelector('.Flights-Results-BestFlights');
      return (resultsElem && resultsElem.offsetParent);
    }, { polling: 50, timeout: 60000 });

    const html = await page.content()

    return { html, filesByName };

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}


////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [
  'https://www.kayak.com/s/horizon/common/personalization/TopDestinations',
  'https://www.kayak.com/s/horizon/common/personalization/SearchHistory',
  'https://www.kayak.com/s/horizon/common/personalization/RecommendedDestinations',
  'https://www.kayak.com/s/horizon/common/personalization/HistoryRecommendations',
  'https://www.kayak.com/s/horizon/common/layout/StyleJamNavMenu',
  'https://www.kayak.com/s/horizon/common/layout/AjaxFooterLinks',
  'https://www.kayak.com/vs/page/main/frontdoor/',
  'https://www.kayak.com/vs/main/frontdoor',
  'https://www.kayak.com/s/horizon/common/layout/StyleJamMoreNavLink',
  'https://www.kayak.com/s/horizon/common/privacy/AjaxStyleJamHeaderCookiesMessage',
  'https://www.kayak.com/g/horizon/common/layout/CountryAndCurrencyPickers',
  'https://www.kayak.com/ads/dfp/banner300x250/ads.js',
  'https://www.kayak.com/res/js/horizon/combined-',
  'https://www.kayak.com/px/xhr/api/v1/collector',
  'https://www.kayak.com/mv/marvel',

  'https://www.kayak.com/s/horizon/common/compareto',
  'https://www.kayak.com/s/horizon/flights/results/FlightPriceAlertDriveBy',
  'https://www.kayak.com/s/cmp2chk/open',
  'https://www.kayak.com/vs/flights/results/unknown/Drive-By/show',
  'https://www.kayak.com/s/horizon/corporate/pages/formatPageLinks',
  'https://securepubads.g.doubleclick.net',
  'https://www.kayak.com/vs/flights/results/unknown/sra/adcollapse',
  'https://www.kayak.com/s/horizon/flights/results/FlightPricePredictionAction'

]

const usableResponse = [
  // 'https://www.kayak.com/api/search/buzzCalendar',
  'https://www.kayak.com/s/horizon/flights/results/FlightResultsPage',
  'https://www.kayak.com/s/horizon/flights/results/FlightSearchPoll'
]

async function addToFiles(response, filesByName) {
  const request = response.request();
  const type = request.resourceType();
  const url = response.url();
  const prefix = url.match(/[^?]+/)[0];

  if (!['xhr'].includes(type)) return;
  const isThrowawayFile = throwawayResponse.some(prefix => url.includes(prefix));
  if (isThrowawayFile) return;

  const isUsableFile = usableResponse.some(prefix => url.includes(prefix));
  let body;
  try {
    body = await response.text();
  } catch(err) {}
  if (isUsableFile && body && isOnResultsPage) {
    const content = JSON.parse(body);
    filesByName[prefix] = filesByName[prefix] || [];
    filesByName[prefix].push(content);
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile && isOnResultsPage) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  //   console.log(body);
  }
}
