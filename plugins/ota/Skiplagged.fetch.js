const Utils = require('../../lib/Utils');

const UrlBase = 'https://skiplagged.com/flights';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: true, hasSavedFiles: false };
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
    waitUntil: 'domcontentloaded'
  });

  try {
    const dates = [ req.depDate, req.retDate ].filter(d => d).map(d => d.format('YYYY-MM-DD'));
    const url = `${UrlBase}/${req.depApt}/${req.arrApt}/${dates.join('/')}`;
    const page = await browser.loadPage(url, null);

    while (!status.hasSavedFiles) {
      await Utils.sleep(100);
    }
    await page.waitForFunction(function () {
      return !document.querySelector('.spinner').offsetParent
    }, { polling: 50, timeout: 60000 });

    console.log('DONE')

    return await page.content();

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [];

const usableResponse = [
  'https://skiplagged.com/api/search.php'
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
  // } else if (!isUsableFile && status.isOnResultsPage) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  //   console.log(body);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

async function insertAptCode(page, aptCode, inputSel, optionsSel) {
  await page.waitFor(inputSel);
  await page.click(inputSel);
  await Utils.sleep(500);
  await page.keyboard.type(aptCode, {delay: 100})
  await page.waitFor('.gcw-section-flights-tab .autocomplete-dropdown ul.results a[data-type="AIRPORT"]');

  page.$$eval(optionsSel, (elems, aptCode, inputSel) => {
    function decode(str) {
      return str.replace(/&#(\d+);/g, function(match, dec) {
				return String.fromCharCode(dec);
			});
    }
    for (var i = 0; i < elems.length; ++i) {
      var elem = elems[i];
      var value = decode(elem.getAttribute('data-value'));
      var regex = new RegExp(`\\(${aptCode}`);
      if (value.match(regex)) {
        return document.querySelector(inputSel).value = value;
      }
    }
  }, aptCode, inputSel);
  await page.keyboard.press('Escape')
}
