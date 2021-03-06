const Utils = require('../../lib/Utils');

const UrlBase = 'https://www.wego.com/flights/searches';

////////////////////////////////////////////////////////////////////////////////

module.exports = async function fetch(req, browser, { addFile }) {
  const status = { isOnResultsPage: true };
  browser.config({
    async onResponse(res) { await processFiles(res, addFile, status) },
  });

  try {
    const dates = [ req.depDate, req.retDate ].filter(d => d).map(d => d.format('YYYY-MM-DD'));
    const url = `${UrlBase}/c${req.depApt}-c${req.arrApt}/${dates.join(':')}/economy/1a:0c:0i?sort=price&order=asc`;
    const page = await browser.loadPage(url, null);

    await page.waitForFunction(function() {
      try {
        if (
          !document.querySelector('makalu-app') ||
          !document.querySelector('makalu-app').shadowRoot.querySelector('#pages wego-flight-results')
        ) return false;
        console.log('CHECKING PROGRESS')
        const progressElem = document.querySelector('makalu-app').shadowRoot.querySelector('#pages wego-flight-results').shadowRoot.querySelector('progress-bar');
        return (progressElem && progressElem.getAttribute('hidden') === '');
      }catch(err) {
        console.log(err)
      }
    }, { polling: 100, timeout: 60000 });

    return await extractFullContent(page);

  } catch(err) {
    if (err.page && err.page.title === 'Access Denied') err.details = 'IP_ACCESS_DENIED'
    throw err;
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

const throwawayResponse = [
  'https://srv.wego.com/flights/payment_methods',
  'https://srv.wego.com/places/search/nearest',
  'https://srv.wego.com/flights/airlines/leaderboard',
  'https://www.leanplum.com/api',
  'https://secure.wego.com/analytics/v2',
  'https://srv.wego.com/places/locations',
  'https://securepubads.g.doubleclick.net',
  'https://tr.brand-display.com/',
  'https://cdn.brand-display.com'
]

const usableResponse = [
  'https://srv.wego.com/v2/metasearch/flights/searches/'
]

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
    try {
      const content = JSON.parse(body);
      addFile(prefix, content);
    } catch(err) { }
    // console.log('--------------------------------------------')
    // console.log(`  - ${type} : ${url}`)
  // } else if (!isUsableFile && status.isOnResultsPage) {
  //   console.log('--------------------------------------------')
  //   console.log(`  - ${type} : ${url}`)
  //   console.log(body);
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////

async function extractFullContent(page) {
  return await page.evaluate(function() {

    function extractHtmlOfShadowRoot(shadowRoot) {
      return '<shadow-root>' + extractHtmlOfNodes(shadowRoot.childNodes) + '</shadow-root>\n'
    }

    function extractHtmlOfTextNode(node) {
      return node.nodeValue;
    }

    function extractHtmlOfNodes(nodes) {
      let compiledHTML = '';
      for (let i = 0; i < nodes.length; ++i) {
        let node = nodes[i];
        if (node.nodeName === 'STYLE') {
          // skip styles
        } else if (node.nodeType === 1) {
          compiledHTML += extractHtmlOfElemNode(node);
        } else if (node.nodeType === 3) {
          compiledHTML += extractHtmlOfTextNode(node);
        } else if (node.nodeType === 8) {
          // skip comment nodes
        } else {
          console.log(`UNKNOWN nodeType: ${node.nodeType}`)
        }
      }
      return compiledHTML;
    }

    function extractHtmlOfElemNode(node) {
      if (!node.shadowRoot && !node.childNodes.length) return node.outerHTML;

      let compiledHTML = ''
      if (node.shadowRoot) {
        compiledHTML += extractHtmlOfShadowRoot(node.shadowRoot);
      }
      if (node.childNodes.length) {
        compiledHTML += extractHtmlOfNodes(node.childNodes)
      }
      const outerHTML = node.outerHTML;
      const innerHTML = node.innerHTML;
      const tag = outerHTML.replace(innerHTML, '');
      const tagParts = tag.match(/(<.+>).*(<.+>)/)
      try {
        const openingTag = tagParts[1];
        const closingTag = tagParts[2];
        return `${openingTag}${compiledHTML}${closingTag}\n`
      } catch(err) {
        console.log(err)
        console.log(tag, tagParts)
      }
    }
    try {
      return extractHtmlOfElemNode(document.documentElement);
    }catch(err) {
      console.log('ERROR PARSING DOM: ', err)
    }
  });
}
