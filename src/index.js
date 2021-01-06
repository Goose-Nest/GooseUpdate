import express from 'express';
import http from 'http';
import { readFileSync } from 'fs';

import config from '../config.js';
global.config = config;

console.log(config);

import spdy from 'spdy';

const app = express();
global.app = app;

global.startTime = Date.now();
global.version = '4.2.0';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

global.app.all('*', (req, res, next) => {
  console.log('[req]', req.originalUrl);

  console.log(req.headers);

  res.set('Server', `GooseUpdate v${version}`);
  next();
});

import('./webhook.js');

(async function() {
  console.log('Loading API v1...');
  await import('./apiV1/index.js');

  if (config.experimental?.apiV2Enabled) {
    console.log('Loading API v2...');
    await import('./apiV2/index.js');
  }

  const options = !config.webserver?.https ? {} : {
    key: readFileSync(config.webserver.https.key),
    cert: readFileSync(config.webserver.https.cert)
  };

  (config.experimental?.webserver?.http2 ? spdy : http).createServer(options, app)
    .listen(port, (err) => {
      console.log('done', err);
    });
})();
