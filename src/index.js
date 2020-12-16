import express from 'express';
import { existsSync, rmdirSync, mkdirSync } from 'fs';

const app = express();

global.startTime = Date.now();
global.version = '3.0.0';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

/*const axios = require('axios');

const path = require('path');

const glob = require('glob');

const stream = require('stream');
const unzipper = require('unzipper');
const archiver = require('archiver');*/

global.discordBase = `https://discord.com/api`;

console.log(`Using proxy base: ${discordBase}`);
// console.log(`Modded version: ${moddedVersion}`);

/*let proxyStats = {
  'cached': 0,
  'not-cached': 0
};*/

global.proxyCacheHitArr = [];
global.proxyVsRedirect = [];
global.uniqueUsers = {};
global.requestCounts = {
  'host_squirrel': 0,
  'host_notsquirrel': 0,
  'modules': 0,
  'module_download': 0
};

app.all('*', (req, res, next) => {
  console.log('[req]', req.originalUrl);

  res.set('Server', `GooseUpdate v${version}`);
  next();
});

const initCache = () => {
  if (existsSync(`../cache`)) {
    rmdirSync(`../cache`, { recursive: true });
    //return;
  }

  mkdirSync(`../cache`);
};

initCache();

import * as BranchesLoader from './branchesLoader.js';
BranchesLoader.init();

import initRequests from './requests/index.js';
initRequests(app);

import initDashboard from './dashboard/index.js';
initDashboard(app);

// Temporary migration / fix for v1.x to v2.x users
import {} from './v2Migration.js';

app.listen(port, () => {
  console.log(`\n\nListening on port ${port}`);
});