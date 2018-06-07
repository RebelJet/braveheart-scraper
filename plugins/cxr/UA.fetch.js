const moment = require('moment');
const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.united.com/ual/en/us/';
const UrlResults = [
  'https://www.united.com/ual/en/us/flight-search/book-a-flight/results/'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: false, hasSavedFiles: false, flightDetailsLoaded: 0 }
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? '#SearchTypeMain_roundTrip' : '#SearchTypeMain_oneWay';
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);
    await Utils.sleep(100);

    console.log('INSERTING depApt')
    await insertApt(page, 'input#Origin', req.depApt);

    console.log('INSERTING arrApt')
    await insertApt(page, 'input#Destination', req.arrApt);

    console.log('INSERTING depDate');
    await insertDate(page, 'input#DepartDate', req.depDate)

    if (req.retDate) {
      console.log('INSERTING retDate');
      await insertDate(page, 'input#ReturnDate', req.retDate)
    }

    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.$eval('button#flightBookingSubmit', button => button.click());
    await page.resultsPageIsLoaded(false);
    await page.waitFor(function() {
      const loaderElem = document.querySelector('.page-loader');
      if (!loaderElem || loaderElem.offsetParent !== null) return false;
      const countElem = document.querySelector('.pagerShowAll #resultnotext');
      if (!countElem || countElem.offsetParent === null) return false;
      return true;
    });

    while (!status.hasSavedFiles) {
      await Utils.sleep(100);
    }

    // load details
    // const flightCount = await page.evaluate(function() {
    //   const elems = document.querySelectorAll('a.toggle-flight-block-details');
    //   for (var i = 0; i < elems.length; i++) {
    //     elems[i].click();
    //   }
    //   return elems.length;
    // });
    // while (status.flightDetailsLoaded < flightCount) {
    //   await Utils.sleep(100);
    // }

    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

async function insertDate(page, inputSel, date) {
  const inputVal = date.format('MMM D, YYYY')
  while (true) {
    await page.click(inputSel);
    await page.$eval(inputSel, inputSel => inputSel.value = '');
    await page.type(inputSel, inputVal);
    const value = await page.$eval(inputSel, inputSel => inputSel.value);
    if (value === inputVal) break;
    await Utils.sleep(100);
  }
}

async function insertApt(page, inputSel, inputVal) {
  while (true) {
    await page.click(inputSel);
    await page.$eval(inputSel, inputSel => inputSel.value = '');
    await page.type(inputSel, inputVal);
    const value = await page.$eval(inputSel, inputSel => inputSel.value);
    if (value === inputVal) break;
    await Utils.sleep(100);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [];

// const detailsUrl = 'https://www.united.com/ual/en/us/flight-search/book-a-flight/flightshopping/getlmxquote/rev';
const usableResponse = [
  'https://www.united.com/ual/en/us/flight-search/book-a-flight/flightshopping/getflightresults/rev',
  // detailsUrl
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
    // if (url === detailsUrl) status.flightDetailsLoaded++;
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
