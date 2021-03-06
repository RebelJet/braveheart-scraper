const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.southwest.com/';
const UrlResults = [
  'https://www.southwest.com/air/booking/select.html',
  'https://www.southwest.com/flight/select-flight.html',
  'https://www.southwest.com/flight/search-flight.html?error'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: false, hasSavedFiles: false }
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? '#trip-type-round-trip' : '#trip-type-one-way'
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);

    console.log('INSERTING depApt')
    await insertAptCode(page, '#air-city-departure', req.depApt);

    console.log('INSERTING arrApt')
    await insertAptCode(page, '#air-city-arrival', req.arrApt);

    console.log('INSERTING depDate');
    await insertDate(page, '#air-date-departure', req.depDate);
    if (req.retDate) {
      console.log('INSERTING retDate');
      await insertDate(page, '#air-date-return', req.retDate);
    }

    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.click('#jb-booking-form-submit-button');
    await page.resultsPageIsLoaded(false);

    while (!status.hasSavedFiles) {
      await Utils.sleep(100);
    }

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
    const content = JSON.parse(body);
    addFile(prefix, content);
    status.hasSavedFiles = true;
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile && status.isOnResultsPage) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  //   console.log(body);
  //   const content = JSON.parse(body);
  //   addFile(prefix, content)
  }
}

async function insertAptCode(page, inputSel, inputValue) {
  await page.click(inputSel);
  await page.type(inputSel, '');
  await page.type(inputSel, inputValue);
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
