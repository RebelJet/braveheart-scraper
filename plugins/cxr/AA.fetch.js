const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.aa.com/homePage.do';
const UrlResults = [
  'https://www.aa.com/booking/flights/choose-flights/flight'
];

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: false, hasSavedFiles: false }
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    const tripTypeSel = `label[for="flightSearchForm.tripType.${req.retDate ? 'roundTrip' : 'oneWay'}"]`;
    await page.evaluate(function(tripTypeSel, depApt, arrApt, depDate, retDate) {
      jQuery(tripTypeSel).click()
      jQuery('input[name="originAirport"]').val(depApt);
      jQuery('input[name="destinationAirport"]').val(arrApt);
      jQuery('input[name="departDate"]').val(depDate);
      if (retDate) jQuery('input[name="departDate"]').val(depDate);
    }, tripTypeSel, req.depApt, req.arrApt, req.depDate.format('MM/DD/YYYY'), req.retDate ? req.retDate.format('MM/DD/YYYY') : null);

    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.evaluate(function() {
      jQuery('input#flightSearchForm\\.button\\.reSubmit').click();
    });
    await page.resultsPageIsLoaded(false);

    await page.evaluate(function() {
      return new Promise((resolve, reject) => {
        (function showMore() {
          const elem = document.querySelector('a#showMoreLink');
          if (elem && !elem.offsetParent) return resolve();
          if (elem) elem.click();
          setTimeout(showMore, 50);
        })();
      });
    });

    await page.evaluate(function() {
      return new Promise((resolve, reject) => {
        const elems = document.querySelectorAll('a.flight-details-dialog');
        function openDetails(i) {
          if (i >= elems.length) {
            return resolve();
          }
          const elem = elems[i];
          if (elem) elem.click();
          setTimeout(function() { closeDetails(i) }, 10);
        }
        function closeDetails(i) {
          const detailsElem = document.querySelector('#flightDetailsDialog');
          const busyElem = document.querySelector('.flightDetailsContainer .aa-busy-module');
          if (detailsElem && detailsElem.offsetParent && !busyElem) {
            document.querySelector('.flightDetailsContainer .ui-dialog-buttonset button.btn').click();
            return setTimeout(function() { openDetails(i+1) }, 10);
          } else {
            return setTimeout(function() { closeDetails(i) }, 10);
          }
        }
        openDetails(0);
      });
    });

    return await page.content();

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

async function insertIntoInput(page, inputSel, inputVal) {
  await page.$eval(inputSel, (elem) => elem.value = '');
  await Utils.sleep(100);
  await page.type(inputSel, inputVal, {delay: 100});
}

////////////////////////////////////////////////////////////////////////////////////////////////

const detailsUrl = 'https://www.aa.com/booking/flights/choose-flights/ajax/flightDetails';
const throwawayResponse = [];
const usableResponse = [ detailsUrl ];

async function processFiles(response, addFile, status) {
  const request = response.request();
  const type = request.resourceType();
  const url = response.url();
  const prefix = url.match(/[^?]+/)[0];

  if (!['xhr'].includes(type)) return;
  const isThrowawayFile = throwawayResponse.some(prefix => url.includes(prefix));
  if (isThrowawayFile) return;

  const isUsableFile = usableResponse.some(prefix => url.includes(prefix));
  const isDetailsFile = url.includes(detailsUrl);
  let body;
  try {
    body = await response.text();
  } catch(err) {}
  if (isUsableFile && body && status.isOnResultsPage) {
    if (isDetailsFile) {
      console.log(url)
      addFile(prefix, body, 'html');
    }
    status.hasSavedFiles = true;
  // } else if (status.isOnResultsPage) {
  //   console.log(url)
  }
}
