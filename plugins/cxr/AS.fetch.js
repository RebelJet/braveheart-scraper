const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.alaskaair.com/planbook';
const UrlResults = [
  'https://www.alaskaair.com/Shopping/Flights/Shop'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: false, hasSavedFiles: false }
  // browser.config({
  //   async onResponse(res) { await processFiles(res, addFile, status) },
  // });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? '#roundTrip' : '#oneWay';
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);
    await Utils.sleep(100);

    console.log('INSERTING depApt')
    await insertIntoInput(page, '#fromCity', req.depApt);

    console.log('INSERTING arrApt')
    await insertIntoInput(page, '#toCity', req.arrApt);

    console.log('INSERTING depDate');
    await insertIntoInput(page, '#departureDate', req.depDate.format('MM/DD/YYYY'));

    if (req.retDate) {
      console.log('INSERTING retDate');
      await insertIntoInput(page, '#returnDate', req.retDate.format('MM/DD/YYYY'));
    }

    await Utils.sleep(100);
    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.$eval('#findFlights', button => button.click());
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

async function insertIntoInput(page, inputSel, inputVal) {
  await page.$eval(inputSel, (elem) => elem.value = '');
  await Utils.sleep(100);
  await page.type(inputSel, inputVal);
}
