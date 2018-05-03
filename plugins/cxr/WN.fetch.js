const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.southwest.com/';
const UrlResults = [
  'https://www.southwest.com/air/booking/select.html',
  'https://www.southwest.com/flight/select-flight.html',
  'https://www.southwest.com/flight/search-flight.html?error'
];

////////////////////////////////////////////////////////////////////////////////

let isOnResultsPage = false;
let hasSavedFiles = false;

module.exports = async function fetch(req, browser, addFile) {
  browser.config({
    async onResponse(res) { await processFiles(res, addFile) },
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? '#trip-type-round-trip' : '#trip-type-one-way'
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);

    await page.click('#air-city-departure');
    await page.type('#air-city-departure', '');
    await page.type('#air-city-departure', req.depApt);

    await page.click('#air-city-arrival');
    await page.type('#air-city-arrival', '');
    await page.type('#air-city-arrival', req.arrApt);

    await insertDate(page, '#air-date-departure', req.depDate);
    if (req.retDate) {
      await insertDate(page, '#air-date-return', req.retDate);
    }

    await page.blockImages();

    isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.click('#jb-booking-form-submit-button');
    await page.resultsPageIsLoaded(false);
    while (!hasSavedFiles) {
      await Utils.sleep(100);
    }

    console.log('FINISHED!')
    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [];

const usableResponse = [
  'https://www.southwest.com/api/air-booking/v1/air-booking/page/air/booking/shopping'
];

async function processFiles(response, addFile) {
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
    addFile(prefix, content);
    hasSavedFiles = true;
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile && isOnResultsPage) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  //   const content = JSON.parse(body);
  //   addFile(prefix, content)
    //   console.log(body);
  }
}

async function insertDate(page, inputSel, inputValue) {
  inputValue = inputValue.format('MM/DD');
  while (true) {
    await page.click(inputSel);
    await page.$eval(inputSel, elem => elem.value = '')
    await page.type(inputSel, inputValue);
    const curValue = await page.evaluate(inputSel => {
      return document.querySelector(inputSel).value;
    }, inputSel);
    if (curValue === inputValue) break;
  }
}
