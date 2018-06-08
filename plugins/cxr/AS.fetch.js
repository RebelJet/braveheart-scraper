const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.alaskaair.com/';
const UrlResults = [
  'https://www.alaskaair.com/Shopping/Flights/Shop'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: false, hasSavedFiles: false }
  browser.config({
    waitUntil: 'domcontentloaded'
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    await Utils.sleep(5000);

    const tripTypeSel = req.retDate ? 'input#roundTrip' : 'input#oneWay';
    await page.evaluate(function(isOneWay) {
      const elem = document.querySelector('input#oneWay');
      if (isOneWay && elem.checked) return;
      if (!isOneWay && !elem.checked) return;
      elem.click();
    }, !req.retDate)

    console.log('INSERTING depApt')
    await insertIntoInput(page, '#fromCity1', req.depApt);

    console.log('INSERTING arrApt')
    await insertIntoInput(page, '#toCity1', req.arrApt);

    console.log('INSERTING depDate');
    await insertIntoInput(page, '#departureDate1', req.depDate.format('MM/DD/YY'));

    if (req.retDate) {
      console.log('INSERTING retDate');
      await insertIntoInput(page, '#returnDate', req.retDate.format('MM/DD/YY'));
    }

    await Utils.sleep(100);
    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.$eval('#findFlights', button => button.click());
    await page.resultsPageIsLoaded(false);

    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

async function insertIntoInput(page, inputSel, inputVal) {
  await page.$eval(inputSel, (elem) => elem.value = '');
  await Utils.sleep(100);
  await page.type(inputSel, inputVal);
}
