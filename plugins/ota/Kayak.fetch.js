const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.kayak.com/';
const UrlResults = 'https://www.kayak.com/flights/';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: false };
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
    waitUntil: 'domcontentloaded'
  });

  const page = await browser.loadPage(UrlHome, UrlResults);

  await page.blockImages();
  await page.waitFor('.Base-Search-SearchForm');
  await Utils.sleep(500);

  const formId = await page.$eval('.Base-Search-SearchForm', e => e.id);
  const switchId = await page.$eval('.Base-Search-SearchForm .col-switch > div', e => e.id);

  // one-way or roundtrip
  await page.click(`#${switchId}-switch-display`);
  const switchOption = `#${switchId}-switch-option-${req.retDate ? '1' : '2'}`;
  await page.waitForSelector(switchOption, { visible: true })
  await page.click(switchOption);
  await Utils.sleep(500);

  console.log('INSERTING depApt')
  await insertAptCode(page, 'origin', req.depApt, formId);
  await Utils.sleep(100);

  console.log('INSERTING depApt')
  await insertAptCode(page, 'destination', req.arrApt, formId);
  await Utils.sleep(100);

  console.log('INSERTING depDate');
  await insertDate(page, req.depDate, `#${formId}-dateRangeInput-display-start`, `#${formId}-depart-input`)

  if (req.retDate) {
    console.log('INSERTING retDate');
    await insertDate(page, req.retDate, `#${formId}-dateRangeInput-display-end`, `#${formId}-return-input`)
  }

  // do not open comparison windows
  await page.evaluate(selector => {
    const elem = document.querySelector(selector);
    if (elem) elem.click();
  }, `button#${formId}-compareTo-noneLink`);

  status.isOnResultsPage = true;
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

  return await page.content();
}

////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.onError = function onError(err) {
  if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
  return err;
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

async function processFiles(response, addFile, status) {
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
  if (isUsableFile && body && status.isOnResultsPage) {
    let content;
    try {
      content = JSON.parse(body);
    }catch (err) {
      if (response.status() === 403) {
        console.log('RESPONSE HAS STATUS 403')
        // throw { page: { title: 'Access Denied' } }
      } else {
        throw err
      }
    }
    addFile(prefix, content);
  //   console.log('--------------------------------------------')
  //   console.log(`  - FOUND ${type} : ${url}`)
  // } else if (!isUsableFile && isOnResultsPage) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - MISSED ${type} : ${url}`)
  //   console.log(body);
  }
}

async function insertDate(page, dateValue, dateBox, dateInput) {
  await page.waitForSelector(dateBox, { visible: true })
  await page.click(dateBox);
  await page.waitForSelector(dateInput, { visible: true })
  await page.click(dateInput);

  dateValue = dateValue.format('MM/DD/YYYY');
  while (true) {
    await page.type(dateInput, dateValue);
    const curValue = await page.evaluate(dateInput => {
      return document.querySelector(dateInput).innerText;
    }, dateInput);
    await Utils.sleep(500);
    if (curValue === dateValue) break;
    console.log(`RETRYING ${dateInput}: `, dateValue, curValue);
  }
  await page.click(dateInput);
  await page.keyboard.press('Enter');
}

async function insertAptCode(page, type, aptCode, formId) {
  const box = `#${formId}-${type}-airport-display`;
  const input = `#${formId}-${type}-airport`;
  await page.waitForSelector(box, { visible: true })
  await page.click(box);
  await page.waitForSelector(input, { visible: true })
  await page.click(input);
  await page.evaluate(function(selector, value) {
    document.querySelector(selector).value = value;
  }, input, aptCode)

  const aptSelector = `#${formId}-${type}-airport-smartbox-dropdown > ul li[data-apicode='${aptCode}']`;
  while (true) {
    const isFound = await page.evaluate(selector => {
      const elem = document.querySelector(selector)
      return (elem && elem.offsetParent !== null);
    }, aptSelector);
    if (isFound) break;
    await page.click(input);
    await Utils.sleep(100);
  }
  await page.click(aptSelector)
}
