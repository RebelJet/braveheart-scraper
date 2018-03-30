const Utils = require('../../Utils');

const UrlBase = 'https://www.google.com/flights/beta';

////////////////////////////////////////////////////////////////////////////////

let isOnResultsPage = true;

module.exports = async function fetch(req, browser) {
  const filesByName = {};
  browser.config({
    async onResponse(res) { await addToFiles(res, filesByName) },
  });

  try {
    const url = `${UrlBase}#flt=${req.depApt}.${req.arrApt}.${req.depDate.format('YYYY-MM-DD')};c:USD;e:1;sd:1;t:f;tt:o`;
    const page = await browser.loadPage(url, null);
    const html = await page.content();
    await Utils.sleep(3000);

    return { html, filesByName };

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////

const usableResponse = [
  'https://www.google.com/async/flights/search',
];

async function addToFiles(response, filesByName) {
  const request = response.request();
  const type = request.resourceType();
  const url = response.url();
  const prefix = url.match(/[^?]+/)[0];

  if (!['script','xhr'].includes(type)) return;
  const isUsableFile = usableResponse.some(prefix => url.includes(prefix));
  const body = await response.text();
  if (isUsableFile && body && isOnResultsPage) {
    const content = JSON.parse(body.replace(/^\)]}'/, '').trim());
    filesByName[prefix] = filesByName[prefix] || [];
    filesByName[prefix].push(content);
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  }
}
