'use strict'

process.env.IS_DEBUG_MODE = "true";

const uuid = require('uuid');
const restify = require('restify');
const Scraper = require('./lib/Scraper');

///////////////////////////////////////////////////////////////////////////////////////////

const server = restify.createServer();

server.use(restify.plugins.acceptParser(server.acceptable));
server.use(restify.plugins.bodyParser());

///////////////////////////////////////////////////////////////////////////////////////////

server.post('/', async (req, res, next) => {
  const [ statusCode, body ] = await Scraper(uuid(), req.body)
  res.send(statusCode, body)
  next();
});

///////////////////////////////////////////////////////////////////////////////////////////

const PUBLIC_PORT = process.env.PUBLIC_PORT || 8080;

server.listen(PUBLIC_PORT, function() {
  const d = Array(121).join('-')+"\n"
  console.log(`${d}This server is listening at ${server.url}\n${d}`);
});

server.pre(function(req, res, next) {
  console.log(`${new Date()} - ${req.method} ${req.url}`)
  next();
});

///////////////////////////////////////////////////////////////////////////////////////////

process.on('unhandledRejection', err => {
  console.log('Caught unhandledRejection:', err);
});
