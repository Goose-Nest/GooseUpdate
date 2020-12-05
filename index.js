const express = require('express');
const app = express();

const version = '1.3.0';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

const axios = require('axios');
const fs = require('fs');

const stream = require('stream');
const unzipper = require('unzipper');
const archiver = require('archiver');

const discordBase = `https://discord.com/api`;

const patchCode = fs.readFileSync(`${__dirname}/patch.js`, 'utf-8');
const moddedVersion = parseInt(patchCode.match(/const version = ([0-9]+)/)[1]);

console.log(`Using proxy base: ${discordBase}`);
console.log(`Modded version: ${moddedVersion}`);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const cacheStore = {};

const cacheCleaner = () => {
  for (let k in cacheStore) {
    const v = cacheStore[k];

    if ((Date.now() - v.lastUsed) / 1000 / 60 / 60 > 1) { // If anything cached was last used longer than an hour ago, remove it
      delete cacheStore[k];
    }
  }
};

setInterval(cacheCleaner, 1000 * 60 * 60);

/*let proxyStats = {
  'cached': 0,
  'not-cached': 0
};*/

let proxyCacheHitArr = [];

const basicProxy = async (req, res, options = {}, rpl = undefined) => {
  console.log(`${discordBase}${req.originalUrl}`);

  console.log(options, rpl);

  const url = rpl !== undefined ? req.originalUrl.replace(rpl[0], rpl[1]) : req.originalUrl;

  console.log(url);

  const cacheUrl = url.replace(/&_=[0-9]+$/, '');
  console.log(cacheUrl);
  const cached = cacheStore[cacheUrl];

  const now = Date.now();

  if (cached && (now - cached.cachedOn) / 1000 / 60 < 10) {
    console.log('cached');

    cached.lastUsed = now;

    proxyCacheHitArr.push('cached');

    return cached.resp;
  }

  proxyCacheHitArr.push('not cached');

  console.log('not cached');

  let prox = await axios.get(`${discordBase}${url}`, options);

  res.status(prox.status);

  cacheStore[cacheUrl] = {
    resp: prox,

    cachedOn: now,
    lastUsed: now
  };

  return prox;
};

let uniqueUsers = {};
let requestCounts = {
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

const indexTemplate = fs.readFileSync('index.html', 'utf8');

const generatePie = (arr) => {
  const colors = ['#D9434B', '#D9D659', '#2E9BD9', '#8C1D23', '#24678C'];
  const unique = arr.filter((v, i, s) => s.indexOf(v) === i).sort((a, b) => a.localeCompare(b));

  let offset = 0;
  const segments = unique.map((u, i) => {
    const count = arr.filter((x) => x === u).length;

    const percent = Math.round(count / arr.length * 100);

    const ret = `<div class="pie__segment" style="--offset: ${offset}; --value: ${percent}; --over50: ${percent > 50 ? 1 : 0}; --bg: ${colors[i % colors.length]};">
    <label class="pie__label">${u[0].toUpperCase() + u.substring(1)}: ${percent}%</label>
  </div>`;

    offset += percent;

    return ret;
  });

  return segments.join('\n');
};

app.get('/', (req, res) => {
  res.set('Content-Type', 'text/html');

  const usersValues = Object.values(uniqueUsers);
  const usersPlatforms = usersValues.map((x) => x.platform);
  const usersHostVersions = usersValues.map((x) => x.host_version);

  let temp = indexTemplate.slice();
  temp = temp.replace('TEMPLATE_TOTAL_USERS', `${usersValues.length}`);

  temp = temp.replace(`TEMPLATE_PIE_OS`, generatePie(usersPlatforms));
  temp = temp.replace(`TEMPLATE_PIE_HOST_VERSIONS`, generatePie(usersHostVersions));
  temp = temp.replace(`TEMPLATE_PIE_CACHE`, generatePie(proxyCacheHitArr));

  for (let k in requestCounts) {
    temp = temp.replace(`TEMPLATE_COUNT_${k.toUpperCase()}`, requestCounts[k]);
  }

  res.send(temp);

  //res.sendFile(`${__dirname}/index.html`);
});

app.get('/updates/:channel/releases', async (req, res) => { // Squirrel (non-Linux)
  requestCounts.host_squirrel++;

  console.log({type: 'host_squirrel', id: req.query.id, localVersion: req.query.localVersion, arch: req.query.arch});

  let prox = (await basicProxy(req, res)).data;

  console.log(prox);

  res.send(prox);

  //res.send(typeof prox === 'string' ? prox : JSON.stringify(json));
});

app.get('/updates/:channel', async (req, res) => { // Non-Squirrel (Linux)
  requestCounts.host_notsquirrel++;

  console.log({type: 'host_nonsquirrel', channel: req.params.channel, version: req.query.version, platform: req.query.platform});
  console.log(`${discordBase}${req.originalUrl}`);

  /*try { // If no response within X (500) ms there is no update (it does not close the response correctly)
    let prox = await axios.get(`${discordBase}${req.originalUrl}`, {
      timeout: 500
    });

    res.status(prox.status);

    res.send(JSON.stringify(prox.data));
  } catch (e) { // Send 204 with empty body (replicating)
    res.status(204);

    res.send();
  }*/

  /*let prox = await axios.get(`${discordBase}${req.originalUrl}`, {
    // timeout: 500
  });*/

  const prox = await basicProxy(req, res);

  res.send(JSON.stringify(prox.data));
});

app.get('/modules/:channel/versions.json', async (req, res) => {
  requestCounts.modules++;

  console.log({type: 'check_for_module_updates', channel: req.params.channel});

  if (req.query.platform === 'linux' || req.query.platform === 'win' || req.query.platform === 'osx') {
    const ip = req.headers['cf-connecting-ip']; // Cloudflare IP

    uniqueUsers[ip] = {
      platform: req.query.platform,
      host_version: req.query.host_version
    };
  }

  let json = Object.assign({}, (await basicProxy(req, res)).data);

  json['discord_desktop_core'] = parseInt(`${moddedVersion}${json['discord_desktop_core'].toString()}`);

  res.send(JSON.stringify(json));
});

app.get('/modules/:channel/:module/:version', async (req, res) => {
  requestCounts.module_download++;

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
