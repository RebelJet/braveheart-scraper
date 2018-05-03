const Browser = require('../../lib/Browser');
const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.spirit.com/Default.aspx';
const UrlResults = 'https://www.spirit.com/DPPCalendarMarket.aspx';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req) {
  try {
    const browser = await new Browser();
    const page = await browser.loadPage(UrlHome, UrlResults);

    try {
      await page.click('#mobile-book-tab a');
    } catch(err) { /* ignore */ }

    await page.waitFor('#journeyOneWay', { visible: true })
    await page.click('#journeyOneWay');

    await page.select('#departCityCodeSelect', req.depApt);
    await page.select('#destCityCodeSelect', req.arrApt);
    await page.type('#departDate', req.depDate.format('MM/DD/YYYY'));

    await page.blockImages();
    await page.click('button.button.primary.flightSearch');
    await page.resultsPageIsLoaded(false);

    const html = await page.content()

    page.close();
    return html;

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw new Error(err);
  }
}
