import express from 'express';

const app = express();
global.app = app;

global.startTime = Date.now();
global.version = '4.1.0';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

global.app.all('*', (req, res, next) => {
  console.log('[req]', req.originalUrl);

  res.set('Server', `GooseUpdate v${version}`);
  next();
});

import('./webhook.js');

(async function() {
  console.log('Loading API v1...');
  await import('./apiV1/index.js');

  console.log('Loading API v2...');
  await import('./apiV2/index.js');

  global.app.listen(port, () => {
    console.log(`\n\nListening on port ${port}`);
  });
})();