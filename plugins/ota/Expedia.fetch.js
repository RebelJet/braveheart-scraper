const Utils = require('../../lib/Utils');

const UrlHome = 'https://www.expedia.com/';
const UrlResults = 'https://www.expedia.com/Flights-Search';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: false };
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
    waitUntil: 'domcontentloaded'
  });

  try {
    const page = await browser.loadPage(UrlHome, UrlResults);

    await page.waitFor('button#tab-flight-tab-hp');
    await page.click('button#tab-flight-tab-hp');

    const tripTypeSel = `label#flight-type-${req.retDate ? 'roundtrip' : 'one-way'}-label-hp-flight`;
    await page.waitFor(tripTypeSel);
    await page.click(tripTypeSel);

    // depAirportCode
    console.log('INSERTING depAirportCode')
    let inputSel = '.gcw-section-flights-tab input[data-gcw-field-type="origin"]';
    let optionsSel = '.gcw-section-flights-tab .autocomplete-dropdown ul.results a[data-type]';
    await insertAptCode(page, req.depApt, inputSel, optionsSel);

    // arrAirportCode
    console.log('INSERTING arrAirportCode')
    inputSel = '.gcw-section-flights-tab input[data-gcw-field-type="destination"]';
    optionsSel = '.gcw-section-flights-tab .autocomplete-dropdown ul.results a[data-type]';
    await insertAptCode(page, req.arrApt, inputSel, optionsSel);

    // depDate/retDate
    const dateDetails = [];
    if (req.retDate) {
      console.log('INSERTING depDate and retDate')
      dateDetails.push([ 'input#flight-returning-hp-flight', req.retDate ]);
      dateDetails.push([ 'input#flight-departing-hp-flight', req.depDate ]);
    } else {
      console.log('INSERTING depDate')
      dateDetails.push([ 'input#flight-departing-single-hp-flight', req.depDate ]);
    }
    for (let dateDetail of dateDetails) {
      const [ dateInput, dateValue ] = dateDetail;
      console.log(dateInput, dateValue)
      await page.$eval(dateInput, (elem) => elem.value = '');
      await page.click(dateInput);
      await page.type(dateInput, dateValue.format('MM/DD/YYYY'))
      await Utils.sleep(100);
    }

    await page.blockImages();

    status.isOnResultsPage = true;
    console.log('IS LOADING RESULTS PAGE !!!!!!!!!!!')
    await page.keyboard.press('Enter');
    await page.resultsPageIsLoaded(true);
    await Utils.sleep(5000);

    await page.waitForFunction(function() {
      const progressElem = document.querySelector('.progress-bar');
      return (progressElem && !progressElem.offsetParent);
    }, { polling: 50, timeout: 30000 });

    return await page.content();

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [
  'https://collector.prod.expedia.com/omniture',
  'https://www.expedia.com/api/datacapture/track',
  'https://a.intentmedia.net/adServer',
  'https://a.cdn.intentmedia.net',
  'https://suggest.expedia.com/api/v4/ping',
  'https://maps.googleapis.com',
  'https://www.uciservice.com/adinfo',
  'https://www.expedia.com/api/bucketing/v1/evaluateExperiments',
  'https://www.expedia.com/static/tealeafTarget2.html',
  'https://www.expedia.com/loyalty/holdout/isEnabled',
  'https://securepubads.g.doubleclick.net',
  'https://www.expedia.com/api/bucketing/v1/evaluateExperimentsAndLog',
  'https://www.expedia.com/userHistory/count',
  'https://www.expedia.com/api/userhistory/options',
  'https://performance.intentmedia.net/prod/perf',
  'https://pixel.mtrcs.samba.tv/',
  'https://collector.prod.expedia.com/omgpixel.json',
  'https://www.expedia.com/cl/data/epcairofferimpression.json',
  'https://collector.prod.expedia.com/omg-udo.json',
  'https://6ytvy2ekla.execute-api.us-east-1.amazonaws.com/prod/info',
  'https://siteintercept.qualtrics.com'
];

const usableResponse = [
  'https://www.expedia.com/Flight-Search-Paging',
  'https://www.expedia.com/flight/search',
  // 'https://www.expedia.com/flights/getrichcontent/v4'
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
    addFile(prefix, content)
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
    // } else if (!isUsableFile && status.isOnResultsPage) {
    //   console.log('--------------------------------------------')
    //   console.log(`  - ${type} : ${url}`)
    // const content = JSON.parse(body);
    // addFile(prefix, content)
    //   console.log(body);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

async function insertAptCode(page, aptCode, inputSel, optionsSel) {
  await page.waitFor(inputSel);
  await page.click(inputSel);
  await Utils.sleep(500);
  await page.keyboard.type(aptCode, {delay: 100})
  await page.waitFor(optionsSel);

  page.$$eval(optionsSel, (elems, aptCode, inputSel) => {
    function decode(str) {
      return str.replace(/&#(\d+);/g, function(match, dec) {
				return String.fromCharCode(dec);
			});
    }
    for (var i = 0; i < elems.length; ++i) {
      var elem = elems[i];
      var type = decode(elem.getAttribute('data-type'));
      if (!['AIRPORT','METROCODE'].includes(type)) continue;

      var value = decode(elem.getAttribute('data-value'));
      var regex = new RegExp(`\\(${aptCode}`);
      if (value.match(regex)) {
        return document.querySelector(inputSel).value = value;
      }
    }
  }, aptCode, inputSel);
  await page.keyboard.press('Escape')
}
