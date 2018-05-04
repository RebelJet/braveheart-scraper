const Utils = require('../../lib/Utils');

const UrlBase = 'https://www.google.com/flights';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, addFile) {
  const status = { isOnResultsPage: true, hasSavedFiles: false }
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const flts = [ `${req.depApt}.${req.arrApt}.${req.depDate.format('YYYY-MM-DD')}` ]
    if (req.retDate) flts.push(`${req.arrApt}.${req.depApt}.${req.retDate.format('YYYY-MM-DD')}`)
    const url = `${UrlBase}#flt=${flts.join('*')};c:USD;e:1;sd:1;t:f${flts.length===1 ? ';tt:o' : ''}`;

    const page = await browser.loadPage(url, null);
    await Utils.sleep(1000);
    status.hasSavedFiles = false;
    await page.$eval('.gws-flights-results__dominated-toggle.gws-flights-results__collapsed', el => el ? el.click() : null);
    while (!status.hasSavedFiles) {
      await Utils.sleep(100);
    }
    await Utils.sleep(5000);
    return await page.content();;

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////

const usableResponse = [
  'https://www.google.com/async/flights/search',
];

async function processFiles(response, addFile, status) {
  const request = response.request();
  const type = request.resourceType();
  const url = response.url();
  const prefix = url.match(/[^?]+/)[0];

  if (!['script','xhr'].includes(type)) return;
  const isUsableFile = usableResponse.some(prefix => url.includes(prefix));
  const body = await response.text();
  if (isUsableFile && body && status.isOnResultsPage) {
    const content = JSON.parse(body.replace(/^\)]}'/, '').trim());
    addFile(prefix, content);
    status.hasSavedFiles = true;

    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  }
}
