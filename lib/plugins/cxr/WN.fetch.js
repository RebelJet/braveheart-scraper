const Utils = require('../../Utils');

const UrlHome = 'https://www.southwest.com/';
const UrlResults = [
  'https://www.southwest.com/flight/select-flight.html',
  'https://www.southwest.com/flight/search-flight.html?error'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser) {
  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    await page.waitFor('#trip-type-one-way');
    await page.click('#trip-type-one-way');

    await page.click('#air-city-departure');
    await page.type('#air-city-departure', '');
    await page.type('#air-city-departure', req.depApt);

    await page.click('#air-city-arrival');
    await page.type('#air-city-arrival', '');
    await page.type('#air-city-arrival', req.arrApt);

    while (true) {
      const dateInput = '#air-date-departure';
      const depDate = req.depDate.format('MM/DD');
      await page.click(dateInput);
      await page.$eval(dateInput, elem => elem.value = '')
      await page.type(dateInput, depDate);
      const curValue = await page.evaluate(dateInput => {
        return document.querySelector(dateInput).value;
      }, dateInput);
      if (curValue === depDate) break;
    }

    await page.blockImages();
    await page.click('#jb-booking-form-submit-button');
    await page.resultsPageIsLoaded(false);

    const html = await page.content()

    return { html, filesByName: {} };

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}
