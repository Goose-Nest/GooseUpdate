import express from 'express';

const app = express();
global.app = app;

global.startTime = Date.now();
global.version = '3.0.0';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

global.app.all('*', (req, res, next) => {
  console.log('[req]', req.originalUrl);

  res.set('Server', `GooseUpdate v${version}`);
  next();
});

console.log('Loading API v1...');
await import('./apiV1/index.js');

console.log('Loading API v2...');
import('./apiV2/index.js');

//import { } from './apiV1/index.js';

global.app.listen(port, () => {
  console.log(`\n\nListening on port ${port}`);
});
