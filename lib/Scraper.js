const S3Logger = require('./S3Logger');
const Plugins = require('./plugins')

///////////////////////////////////////////////////////////////////////////////////////////

Plugins.loadCXRs( 'WN', 'NK', 'F9' );
Plugins.loadOTAs( 'Kayak', 'Gflights', 'Wego', 'Expedia', 'Kiwi', 'Skiplagged' );

////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports = async function Scraper(jobId, reqBody) {
  const { depDate, depApt, arrApt, cxr, ota } = reqBody;
  const pluginType = cxr ? 'CXR' : 'OTA';
  const pluginId = Plugins.formatId(cxr || ota);
  if (!Plugins[pluginType][pluginId]) return [500, {error: `Unsupported ${pluginType}: ${pluginId}`}]

  const scrapeKey = `${pluginType}-${pluginId}-${depDate}-${depApt}-${arrApt}-${jobId}`
  const plugin = new Plugins[pluginType][pluginId]({ jobId, depDate, depApt, arrApt, cxr, ota });
  let resStatus, resBody, rawError;

  try {
    await plugin.run()
    resStatus = 200;
    resBody = {
      itineraries: plugin.itineraries,
      logs: plugin.logs,
    };
  } catch(err) {
    await plugin.cleanup()
    console.log('Scraper ERROR: ', err)
    let message = err.message;
    if (err.details === 'ERR_INTERNET_DISCONNECTED') {
      resStatus = 503
      message = 'internet disconnected'
    } else if (err.details === 'ERR_NETWORK_CHANGED') {
      resStatus = 503
      message = 'network changed'
    } else if (err.details === 'IP_ACCESS_DENIED') {
      resStatus = 503
      message = 'ip access denied'
    } else if (err.message === 'navigation error') {
      resStatus = 503
      message = 'page could not load'
    }else {
      resStatus = 500;
    }
    resBody = {
      error: message,
      logs: plugin.logs,
    };
    rawError = err;
  }

    const s3Chunks = S3Logger.prepare(scrapeKey, plugin.html, plugin.itineraries, plugin.logs, rawError);
    resBody.s3LoggerUrls = s3Chunks.map(chunk => chunk.url)
    if (!process.env.IS_DEBUG_MODE) {
      await S3Logger.send(s3Chunks)
    }

  console.log(`${jobId} persisted files to s3:\n${resBody.s3LoggerUrls.join('\n')}`)

  reqBody.history = reqBody.history || []
  if (resStatus == 200 && reqBody.history.length) {
    const s3LogerUrls = [].concat(...reqBody.history.map(h => h.s3LoggerUrls));
    await S3Logger.cleanup(s3LogerUrls);
  }else if (resStatus == 503) {
    resBody.status = resStatus;
    reqBody.history.push(resBody)
    resBody = reqBody
  }

  return [resStatus, resBody]
}
