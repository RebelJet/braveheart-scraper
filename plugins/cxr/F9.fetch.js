const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.flyfrontier.com/';
const UrlResults = 'https://booking.flyfrontier.com/Flight/Select';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: false }

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = req.retDate ? '#rbroundtrip' : '#rboneway'
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);

    console.log('INSERTING depApt')
    await insertAptCode(page, '#fromCityDiv input', req.depApt);

    console.log('INSERTING arrApt')
    await insertAptCode(page, '#toCityDiv input', req.arrApt);

    console.log('INSERTING depDate')
    await page.$eval('#departureDate', (el, date) => { el.value = date }, req.depDate.format('MMM DD, YYYY'))
    if (req.retDate) {
      console.log('INSERTING retDate');
      await page.$eval('#returnDate', (el, date) => { el.value = date }, req.retDate.format('MMM DD, YYYY'))
    }
    await Utils.sleep(500);

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.blockImages();
    await page.click('a#btnSearch');
    await page.resultsPageIsLoaded(false);

    await page.waitForFunction(function() {
      if (document.querySelector('.ibe-flight-info-container .ibe-flight-info')) return true;
      const naElem = document.querySelector('.ibe-flight-info-container .ibe-flight-na-container');
      return (naElem && naElem.offsetParent)
    }, { polling: 50, timeout: 10000 });

    const FlightData = await page.evaluate(() => window.FlightData);
    addFile('FlightData', FlightData);

    console.log('DONE');
    return await page.content();

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

async function insertAptCode(page, inputSel, inputValue) {
  while (true) {
    await page.click(inputSel);
    await page.$eval(inputSel, elem => elem.value = '');
    await page.type(inputSel, inputValue);
    await Utils.sleep(100);
    const curValue = await page.evaluate(inputSel => {
      return document.querySelector(inputSel).value;
    }, inputSel);
    if (curValue === inputValue) break;
  }
  await page.evaluate(inputValue => {
    var elems = document.querySelectorAll(".k-animation-container[style*='display: block'] ul.k-list li.k-item")
    for (var i = 0; i < elems.length; ++i) {
      var elem = elems[i].querySelector('.state');
      var state = elem.innerText;
      var regex = new RegExp(`\(${inputValue}\)`);
      if (!state) continue;
      if (state && state.match(regex)) elem.click()
    }
  }, inputValue);
}
