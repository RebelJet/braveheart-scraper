const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.spirit.com/Default.aspx';
const UrlResults = 'https://www.spirit.com/DPPCalendarMarket.aspx';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: false }

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    try {
      await page.click('#mobile-book-tab a');
    } catch(err) { /* ignore */ }


    const tripTypeSel = req.retDate ? '#journeyRoundTrip' : '#journeyOneWay'
    await page.waitFor(tripTypeSel, { visible: true })
    await page.click(tripTypeSel);

    await page.select('#departCityCodeSelect', req.depApt);
    await page.select('#destCityCodeSelect', req.arrApt);

    await page.type('#departDate', req.depDate.format('MM/DD/YYYY'));
    if (req.retDate) {
      await page.type('#returnDate', req.retDate.format('MM/DD/YYYY'));
    }

    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.click('button.button.primary.flightSearch');
    await page.resultsPageIsLoaded(false);

    return await page.content()

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw new Error(err);
  }
}
