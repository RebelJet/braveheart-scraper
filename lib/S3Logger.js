const AWS = require('aws-sdk');
const moment = require('moment');

///////////////////////////////////////////////////////////////////////////////////////////

const AWS_ACCESS_KEY = 'AKIAISNMOVJDUDVOFN2A';
const AWS_SECRET_KEY = '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';
const AWS_REGION = 'us-east-1';
const AWS_BUCKET = 'braveheart-data';

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY,
  secretAccessKey: AWS_SECRET_KEY,
  region: AWS_REGION,
  correctClockSkew: true
});

function s3Url(key) {
  return `https://s3.amazonaws.com/${AWS_BUCKET}/${key}`
}

function s3KeyFromUrl(url) {
  return url.replace(new RegExp(`^https://s3.amazonaws.com/${AWS_BUCKET}/`), '')
}

///////////////////////////////////////////////////////////////////////////////////////////

exports.prepare = function(baseKey, html, flights, logs, error) {
  const folder = moment().format('YYYY-MM-DD')
  const chunks = [
    { key: `${folder}/${baseKey}-results.html`, type: 'text/html',        data: html },
    { key: `${folder}/${baseKey}-flights.json`, type: 'application/json', data: JSON.stringify(flights, null, 2) },
    { key: `${folder}/${baseKey}-logs.json`,    type: 'application/json', data: JSON.stringify(logs, null, 2) },
  ];
  if (error) {
    const data = {
      type: error.type,
      source: error.source || 'Unknown',
      message: error.message || error,
      stack: error.stack,
      details: error.details,
      page: error.page,
    };
    if (error.page) {
      chunks.push({ key: `${folder}/errors/${baseKey}-${error.page.name}.html`, type: 'text/html', data: error.page.html });
      delete error.page.html;
    }
    chunks.push({ key: `${folder}/errors/${baseKey}-error.json`, type: 'application/json', data: JSON.stringify(data) });
  }

  chunks.forEach(chunk => chunk.url = s3Url(chunk.key));
  return chunks;
}

exports.send = function(chunks) {
  const promises = chunks.map(chunk => {
    return new Promise((resolve, reject) => {
      new AWS.S3().putObject({
        Bucket: AWS_BUCKET,
        Key: chunk.key,
        Body: chunk.data,
        ContentType: chunk.type,
        ACL:'public-read'
      }, function(err) {
        if (err) {
          console.log('ERROR WRITING TO S3: ', err)
          reject(err);
        } else {
          resolve();
        }
      })
    })
  })
  return Promise.all(promises);
}

exports.cleanup = function(urls) {
  const promises = urls.map(url => {
    return new Promise((resolve, reject) => {
      const params = {
        Bucket: AWS_BUCKET,
        Key: s3KeyFromUrl(url)
      };
      new AWS.S3().deleteObject(params, function(err, data) {
        if (err) { // an error occurred
          console.log(`ERROR CLEANING S3: ${err}`, err.stack);
          reject(err);
        } else {
          resolve();
        }
      });
    })
  })
  return Promise.all(promises);
}
