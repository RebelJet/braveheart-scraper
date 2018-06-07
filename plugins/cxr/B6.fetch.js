const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.jetblue.com/#/';
const UrlResults = [
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: false, hasSavedFiles: false }
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? '#RT' : '#OW';
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);
    await Utils.sleep(100);

    console.log('INSERTING depApt')
    await insertApt(page, 'input[placeholder="Where from?"]', req.depApt);

    console.log('INSERTING arrApt')
    await insertApt(page, 'input[placeholder="Where to?"]', req.arrApt);

    console.log('INSERTING depDate');
    await insertDate(page, 'input[name^="departure-date_"]', req.depDate);

    if (req.retDate) {
      console.log('INSERTING retDate');
      await insertDate(page, 'input[name^="return-date_"]', req.retDate);
    }
    await Utils.sleep(100);
    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.$eval('button.bg-orange[type="button"]', button => button.click());
    await page.resultsPageIsLoaded(false);

    // while (!status.hasSavedFiles) {
    //   await Utils.sleep(100);
    // }

    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

async function insertApt(page, inputSel, inputVal) {
  await page.$eval(inputSel, (elem) => elem.value = '');
  await Utils.sleep(200);
  await page.click(inputSel);
  await page.type(inputSel, inputVal);
  await page.$eval(inputSel, (elem, inputVal) => {
    const airportElems = elem.parentElement.parentElement.parentElement.querySelectorAll('.suggestion-list ul li.airport-suggestion');
    for (let elem of airportElems) {
      const textElem = elem.querySelector('span span:nth-child(2)');
      if (!textElem || textElem.innerText !== inputVal) continue;
      elem.click();
      break;
    }
  }, inputVal);
}

async function insertDate(page, inputSel, date) {
  const inputVal = date.format('MM/DD/YYYY');
  await page.$eval(inputSel, (elem) => elem.value = '');
  await Utils.sleep(100);
  await page.type(inputSel, inputVal);
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
  } else if (!isUsableFile && status.isOnResultsPage) {
    console.log('--------------------------------------------')
    console.log(`  - ${type} : ${url}`)
    console.log(body);
  //   const content = JSON.parse(body);
  //   addFile(prefix, content)
  }
}
