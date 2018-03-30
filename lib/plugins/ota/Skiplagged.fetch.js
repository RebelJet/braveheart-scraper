const Utils = require('../../Utils');

const UrlBase = 'https://skiplagged.com/flights';

////////////////////////////////////////////////////////////////////////////////

let isOnResultsPage = true;

module.exports = async function fetch(req, browser) {
  const filesByName = {};
  browser.config({
    async onResponse(res) { await addToFiles(res, filesByName) },
    waitUntil: 'domcontentloaded'
  });

  try {
    const url = `${UrlBase}/${req.depApt}/${req.arrApt}/${req.depDate.format('YYYY-MM-DD')}`;
    const page = await browser.loadPage(url, null);

    await page.waitForFunction(function () {
      return !document.querySelector('.spinner').offsetParent
    }, { polling: 50, timeout: 60000 });

    // await Utils.sleep(10000);

    console.log('DONE')
    const html = await page.content();

    return { html, filesByName };

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

async function addToFiles(response, filesByName) {
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
  if (isUsableFile && body && isOnResultsPage) {
    const content = JSON.parse(body);
    filesByName[prefix] = filesByName[prefix] || [];
    filesByName[prefix].push(content);
    console.log('--------------------------------------------')
    console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile && isOnResultsPage) {
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
