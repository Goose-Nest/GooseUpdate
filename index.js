const express = require('express');
const app = express();

const version = '1.1.0';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

const axios = require('axios');
const fs = require('fs');

const stream = require('stream');
const unzipper = require('unzipper');
const archiver = require('archiver');
const { toNamespacedPath } = require('path');

const discordBase = `https://discord.com/api`;

const patchCode = fs.readFileSync(`${__dirname}/patch.js`, 'utf-8');
const moddedVersion = parseInt(patchCode.match(/const version = ([0-9]+)/)[1]);

console.log(`Using proxy base: ${discordBase}`);
console.log(`Modded version: ${moddedVersion}`);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const cacheStore = {};

const basicProxy = async (req, res, options = {}, rpl = undefined) => {
  console.log(`${discordBase}${req.originalUrl}`);

  console.log(options, rpl);

  const url = rpl !== undefined ? req.originalUrl.replace(rpl[0], rpl[1]) : req.originalUrl;

  console.log(url);

  const cached = cacheStore[url];

  if (cached && ((Date.now() - cached.date) / 1000) / 60 < 10) {
    console.log('cached');
    return cached.resp;
  }

  console.log('not cached');

  let prox = await axios.get(`${discordBase}${url}`, options);

  res.status(prox.status);

  cacheStore[url] = {
    resp: prox,
    date: Date.now()
  };

  return prox;
};

let uniqueUsers = {};

app.get('/', (req, res) => {
  console.log('[req]', req.originalUrl);

  res.set('Content-Type', 'text/html');

  let temp = fs.readFileSync('index.html', 'utf8');

  const usersValues = Object.values(uniqueUsers);

  temp = temp.replace('TEMPLATE_TOTAL_USERS', `${usersValues.length}`);

  let counts = {
    linux: usersValues.filter((x) => x === 'linux').length,
    windows: usersValues.filter((x) => x === 'win').length,
    all: usersValues.length
  };

  let percents = {
    linux: counts.linux / counts.all * 100,
    windows: counts.windows / counts.all * 100
  };

  let segment1 = `<div class="pie__segment" style="--offset: 0; --value: ${percents.linux}; --over50: ${percents.linux > 50 ? 1 : 0}; --bg: #db0a5b;">
  <label class="pie__label">Linux: ${percents.linux}%</label>
</div>`;

  let segment2 = `<div class="pie__segment" style="--offset: ${percents.linux}; --value: ${percents.windows}; --over50: ${percents.windows > 50 ? 1 : 0}; --bg: #22a7f0;">
  <label class="pie__label">Windows: ${percents.windows}%</label>
</div>`;

  temp = temp.replace(`TEMPLATE_PIE_SEGMENT_1`, segment1);
  temp = temp.replace(`TEMPLATE_PIE_SEGMENT_2`, segment2);

  res.send(temp);

  //res.sendFile(`${__dirname}/index.html`);
});

app.all('*', (req, res, next) => {
  console.log('[req]', req.originalUrl);

  res.set('Server', `GooseUpdate v${version}`);
  next();
});

app.get('/updates/:channel/releases', async (req, res) => { // Windows Squirrel
  console.log({type: 'host_squirrel', id: req.query.id, localVersion: req.query.localVersion, arch: req.query.arch});

  let prox = (await basicProxy(req, res)).data;

  res.send(prox);

  //res.send(typeof prox === 'string' ? prox : JSON.stringify(json));
});

app.get('/updates/:channel', async (req, res) => { // Non-Squirrel (Linux, MacOS / any not Windows)
  console.log({type: 'host_nonsquirrel', channel: req.params.channel, version: req.query.version, platform: req.query.platform});
  console.log(`${discordBase}${req.originalUrl}`);

  try { // If no response within X (500) ms there is no update (it does not close the response correctly)
    let prox = await axios.get(`${discordBase}${req.originalUrl}`, {
      timeout: 500
    });

    res.status(prox.status);

    res.send(JSON.stringify(prox.data));
  } catch (e) { // Send 204 with empty body (replicating)
    res.status(204);

    res.send();
  }
});

app.get('/modules/:channel/versions.json', async (req, res) => {
  const ip = req.headers['cf-connecting-ip']; // Cloudflare IP
  uniqueUsers[ip] = req.query.platform;

  console.log({type: 'check_for_module_updates', channel: req.params.channel});

  let json = Object.assign({}, (await basicProxy(req, res)).data);

  console.log('desktop_core', json['discord_desktop_core']);

  json['discord_desktop_core'] = parseInt(`${moddedVersion}${json['discord_desktop_core'].toString()}`);

  res.send(JSON.stringify(json));
});

app.get('/modules/:channel/:module/:version', async (req, res) => {
  console.log({type: 'download_module', channel: req.params.channel, module: req.params.module, version: req.params.version, hostVersion: req.query.host_version, platform: req.query.platform});

  if (req.params.module === 'discord_desktop_core') {
    console.log(`[CustomModule] ${req.params.module} - version: ${req.params.version}`);

    console.log('[CustomModule] Checking cache');

    const cacheName = `${req.params.module}-${req.params.version}`;
    const cacheDir = `${__dirname}/cache/${cacheName}`;
    const cacheFinalFile = `${cacheDir}/module.zip`;

    if (fs.existsSync(cacheFinalFile)) {
      console.log('[CustomModule] Found cache dir, sending zip');

      res.sendFile(cacheFinalFile);
      return;
    }

    console.log('[CustomModule] Could not find cache dir, creating custom version');

    const prox = await basicProxy(req, res, {
      responseType: 'arraybuffer'
    }, [req.params.version, req.params.version.substring(moddedVersion.toString().length)]);

    console.time('fromNetwork');

    let s = stream.Readable.from(prox.data);

    const cacheExtractDir = `${cacheDir}/extract`;

    let t = s.pipe(unzipper.Extract({ path: `${cacheExtractDir}` }));

    console.log('waiting');

    await new Promise(res => t.on('finish', res));
    await sleep(100);

    console.log('waited');

    console.log('Extract finished');

    console.time('fromExtract');

    console.log('Patching file');

    let code = fs.readFileSync(`${cacheExtractDir}/index.js`, 'utf-8');

    code = `${patchCode}\n\n${code}`;

    fs.writeFileSync(`${cacheExtractDir}/index.js`, code);

    console.log('Creating new final zip');

    const outputStream = fs.createWriteStream(`${cacheFinalFile}`);

    const archive = archiver('zip');

    archive.pipe(outputStream);

    archive.directory(cacheExtractDir, false);

    archive.finalize();

    console.log('Waiting for archive to finish');

    await new Promise(res => outputStream.on('close', res));

    console.log('Finished - sending file');

    console.timeEnd('fromNetwork');
    console.timeEnd('fromExtract');

    res.sendFile(cacheFinalFile);

    s.destroy();

    outputStream.close();
    outputStream.destroy();

    return;
  }

  const prox = await basicProxy(req, res, {
    responseType: 'arraybuffer'
  });

  //console.log(prox);

  res.send(prox.data);
});

const initCache = () => {
  if (fs.existsSync(`${__dirname}/cache`)) {
    fs.rmdirSync(`${__dirname}/cache`, { recursive: true });
    //return;
  }

  fs.mkdirSync(`${__dirname}/cache`);
};

initCache();

app.listen(port, () => {
  console.log(`\n\nListening on port ${port}`)
});
