const Browser = require('../../lib/Browser');
const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.flyfrontier.com/plan-and-book/flight-finder/';
const UrlResults = 'https://booking.flyfrontier.com/Flight/Select';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req) {
  try {
    const browser = await new Browser();
    const page = await browser.loadPage(UrlHome, UrlResults);

    await page.waitFor('#rboneway');
    await page.click('#rboneway');

    await page.click('#fromCityDiv input');
    await page.type('#fromCityDiv input', '');
    await Utils.sleep(1000);
    await injectAptCode(page, req.depApt)

    await page.click('#toCityDiv input');
    await page.type('#toCityDiv input', '');
    await Utils.sleep(1000);
    await injectAptCode(page, req.arrApt)

    await page.$eval('#departureDate', (el, depDate) => { el.value = depDate }, req.depDate.format('MMM DD, YYYY'))
    await Utils.sleep(500);

    await page.blockImages();
    await page.click('a#btnSearch');
    await page.resultsPageIsLoaded(false);

    console.log('WAITING FOR RESULTS PAGE TO LOAD');
    await page.waitForFunction(function() {
      if (document.querySelector('.ibe-flight-info-container .ibe-flight-info')) return true;
      const naElem = document.querySelector('.ibe-flight-info-container .ibe-flight-na-container');
      return (naElem && naElem.offsetParent)
    }, { polling: 50, timeout: 10000 });

    const html = await page.content()
    page.close();
    return html;

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

function injectAptCode(page, aptCode) {
  return page.evaluate(aptCode => {
    var elems = document.querySelectorAll(".k-animation-container[style*='display: block'] ul.k-list li.k-item")
    for (var i = 0; i < elems.length; ++i) {
      var elem = elems[i].querySelector('.state');
      var state = elem.innerText;
      var regex = new RegExp(`\(${aptCode}\)`);
      if (!state) continue;
      if (state && state.match(regex)) elem.click()
    }
  }, aptCode);
}
