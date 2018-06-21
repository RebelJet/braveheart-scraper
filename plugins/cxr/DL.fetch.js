const moment = require('moment');
const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.delta.com/flight-search/book-a-flight';
const UrlResults = [
  'https://www.delta.com/flight-search/search-results'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: false, hasSavedFiles: false }
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? 'input[value="ROUND_TRIP"]' : 'input[value="ONE_WAY"]';
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);
    await Utils.sleep(100);

    console.log('INSERTING depApt')
    await insertApt(page, '#input_origin_1', req.depApt);

    console.log('INSERTING arrApt')
    await insertApt(page, '#input_destination_1', req.arrApt);

    console.log('INSERTING depDate/retDate');
    await selectDate(page, '#input_departureDate_1', req.depDate, req.retDate)

    await Utils.sleep(500);
    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.$eval('.submitButtonView button', button => button.click());
    await page.resultsPageIsLoaded(true);

    while (!status.hasSavedFiles) {
      await Utils.sleep(100);
    }

    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

async function selectDate(page, inputSel, depDate, retDate) {
  await page.click(inputSel);
  await page.waitFor('.calenderContainer .dl-datepicker-group');
  const months = Array(12).fill(null).map((v,i) => moment().add(i,'month').format('MMMM YYYY'))
  page.evaluate((months, depDate, reqDay) => {
    return new Promise((resolve, reject) => {
      const reqIndex = months.indexOf(depDate);
      (function selMonth() {
        const curMonth = document.querySelector('.calenderContainer .dl-datepicker-month-0').innerText.trim();
        const curYear = document.querySelector('.calenderContainer .dl-datepicker-year-0').innerText.trim();
        const curDate = `${curMonth} ${curYear}`;
        const curIndex = months.indexOf(curDate);
        if (curIndex === reqIndex) return selDay();
        else if (curIndex > reqIndex) document.querySelector('.calenderContainer .dl-datepicker-0').click();
        else if (curIndex < reqIndex) document.querySelector('.calenderContainer .dl-datepicker-1').click();
        setTimeout(selMonth, 100);
      })();
      function selDay() {
        const elems = document.querySelectorAll('.calenderContainer .dl-datepicker-group-0 table.dl-datepicker-calendar tbody td a');
        for (var i = 0; i < elems.length; ++i) {
          const elem = elems[i];
          const curDay = elem.innerText;
          if (reqDay === curDay) {
            elem.click();
            resolve();
            break;
          }
        }
      };
    });
  }, months, depDate.format('MMMM YYYY'), depDate.format('D'))
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
  await page.evaluate((inputVal) => {
    return new Promise((resolve, reject) => {
      (function check() {
        const elems = document.querySelectorAll('.dlAutoSuggest-suggestions ul li');
        if (!elems.length) return setTimeout(function() {
          check();
        }, 100);
        for (var i=0; i < elems.length; ++i) {
          const elem = elems[i];
          const matches = elem.querySelector('span').innerText.trim().match(/\(([A-Z]{3})\)$/);
          const apt = matches ? matches[1] : null;
          if (apt === inputVal) {
            elem.click();
            return resolve();
          }
        }
        setTimeout(function() {
          check();
        }, 100);
      })();
    });
  }, inputVal);
}

////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [];

const usableResponse = [
  'https://www.delta.com/shop/ow/search'
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
