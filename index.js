const express = require('express');
const app = express();

const version = '2.0.0-beta';

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

const axios = require('axios');

const fs = require('fs');
const path = require('path');

const glob = require('glob');

const stream = require('stream');
const unzipper = require('unzipper');
const archiver = require('archiver');

const discordBase = `https://discord.com/api`;

console.log(`Using proxy base: ${discordBase}`);
// console.log(`Modded version: ${moddedVersion}`);

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
let proxyVsRedirect = [];

const getProxyURL = (url) => `/${url.split('/').slice(2).join('/')}`;

const basicRedirect = async (req, res) => {
  proxyVsRedirect.push('redirect');

  const proxyUrl = `${discordBase}${getProxyURL(req.originalUrl)}`;

  console.log(proxyUrl);
  res.redirect(proxyUrl);
};

const basicProxy = async (req, res, options = {}, rpl = undefined) => {
  proxyVsRedirect.push('proxy');

  console.log(`${discordBase}${req.originalUrl}`);

  console.log(options, rpl);

  let url = rpl !== undefined ? req.originalUrl.replace(rpl[0], rpl[1]) : req.originalUrl;
  url = getProxyURL(url);
  console.log(url);

  const cacheUrl = url.replace(/&_=[0-9]+$/, '');
  console.log(cacheUrl);
  const cached = cacheStore[cacheUrl];

  const now = Date.now();

  if (cached && (now - cached.cachedOn) / 1000 / 60 < 30) {
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
  const usersHostChannels = usersValues.map((x) => x.channel);

  let temp = indexTemplate.slice();
  temp = temp.replace('TEMPLATE_TOTAL_USERS', `${usersValues.length}`);

  temp = temp.replace(`TEMPLATE_PIE_OS`, generatePie(usersPlatforms));
  temp = temp.replace(`TEMPLATE_PIE_HOST_VERSIONS`, generatePie(usersHostVersions));
  temp = temp.replace(`TEMPLATE_PIE_HOST_CHANNELS`, generatePie(usersHostChannels));

  temp = temp.replace(`TEMPLATE_PIE_CACHE`, generatePie(proxyCacheHitArr));
  temp = temp.replace(`TEMPLATE_PIE_VS`, generatePie(proxyVsRedirect));

  for (let k in requestCounts) {
    temp = temp.replace(`TEMPLATE_COUNT_${k.toUpperCase()}`, requestCounts[k]);
  }

  res.send(temp);

  //res.sendFile(`${__dirname}/index.html`);
});

app.get('/:branch/updates/:channel/releases', async (req, res) => { // Squirrel (non-Linux)
  if (!branches[req.params.branch]) {
    res.status(404);

    res.send('Invalid GooseUpdate branch');
  }

  requestCounts.host_squirrel++;

  console.log({type: 'host_squirrel', id: req.query.id, localVersion: req.query.localVersion, arch: req.query.arch});

  /*let prox = (await basicProxy(req, res)).data;

  console.log(prox);

  res.send(prox);*/

  basicRedirect(req, res);

  //res.send(typeof prox === 'string' ? prox : JSON.stringify(json));
});

app.get('/:branch/updates/:channel', async (req, res) => { // Non-Squirrel (Linux)
  if (!branches[req.params.branch]) {
    res.status(404);

    res.send('Invalid GooseUpdate branch');
  }

  requestCounts.host_notsquirrel++;

  console.log({type: 'host_nonsquirrel', channel: req.params.channel, version: req.query.version, platform: req.query.platform});
  // console.log(`${discordBase}${req.originalUrl}`);

  basicRedirect(req, res);
});

app.get('/:branch/modules/:channel/versions.json', async (req, res) => {
  if (!branches[req.params.branch]) {
    res.status(404);

    res.send('Invalid GooseUpdate branch');
  }

  requestCounts.modules++;

  console.log({type: 'check_for_module_updates', channel: req.params.channel});

  if (req.query.platform === 'linux' || req.query.platform === 'win' || req.query.platform === 'osx') {
    const ip = req.headers['cf-connecting-ip']; // Cloudflare IP

    uniqueUsers[ip] = {
      platform: req.query.platform,
      host_version: req.query.host_version,
      channel: req.params.channel
    };
  }

  let json = Object.assign({}, (await basicProxy(req, res)).data);

  json['discord_desktop_core'] = parseInt(`${branches[req.params.branch].meta.version}${json['discord_desktop_core'].toString()}`);

  res.send(JSON.stringify(json));
});

app.get('/:branch/modules/:channel/:module/:version', async (req, res) => {
  if (!branches[req.params.branch]) {
    res.status(404);

    res.send('Invalid GooseUpdate branch');
  }

  requestCounts.module_download++;

  console.log({type: 'download_module', channel: req.params.channel, module: req.params.module, version: req.params.version, hostVersion: req.query.host_version, platform: req.query.platform});

  if (req.params.module === 'discord_desktop_core') {
    console.log(`[CustomModule] ${req.params.module} - version: ${req.params.version}`);

    console.log('[CustomModule] Checking cache');

    const cacheName = `${req.params.module}-${req.params.branch}-${req.params.version}`;
    const cacheDir = `${__dirname}/cache/${cacheName}`;
    const cacheFinalFile = `${cacheDir}/module.zip`;

    if (fs.existsSync(cacheFinalFile)) {
      console.log('[CustomModule] Found cache dir, sending zip');

      res.sendFile(cacheFinalFile);
      return;
    }

    const branch = branches[req.params.branch];

    console.log('[CustomModule] Could not find cache dir, creating custom version');

    const prox = await basicProxy(req, res, {
      responseType: 'arraybuffer'
    }, [req.params.version, req.params.version.substring(branch.meta.version.toString().length)]);

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

    code = `${branch.patch}\n\n${code}`;

    fs.writeFileSync(`${cacheExtractDir}/index.js`, code);

    console.log('Copying other files');

    function copyFolderSync(from, to) {
      fs.mkdirSync(to);
      fs.readdirSync(from).forEach(element => {
        if (fs.lstatSync(path.join(from, element)).isFile()) {
          fs.copyFileSync(path.join(from, element), path.join(to, element));
        } else {
          copyFolderSync(path.join(from, element), path.join(to, element));
        }
      });
    }

    for (let f of branch.files) {
      console.log(f, f.split('/').pop());

      if (fs.lstatSync(f).isDirectory()) {
        copyFolderSync(f, `${cacheExtractDir}/${f.split('/').pop()}`)
      } else {
        fs.copyFileSync(f, `${cacheExtractDir}/${f.split('/').pop()}`);
      }
    }

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

  /*const prox = await basicProxy(req, res, {
    responseType: 'arraybuffer'
  });

  //console.log(prox);

  res.send(prox.data);*/

  basicRedirect(req, res);
});

const initCache = () => {
  if (fs.existsSync(`${__dirname}/cache`)) {
    fs.rmdirSync(`${__dirname}/cache`, { recursive: true });
    //return;
  }

  fs.mkdirSync(`${__dirname}/cache`);
};

initCache();

let branches = {};

const loadBranches = () => {
  const dirs = glob.sync('branches/*');

  for (let d of dirs) {
    const name = d.split('/').pop();
    //const filePaths = glob.sync(`${d}/**/*`).filter((x) => x.match(/.*\..*$/));
    /*
    console.log(name, filePaths);

    let files = [];

    for (let f of filePaths) {
      files.push({
        path: f,
        content: fs.readFileSync(f)
      });
    }*/

    let files = glob.sync(`${d}/*`);

    let patch = '';
    for (let f of files) {
      const filename = f.split('/').pop();

      if (filename === 'patch.js') {
        patch = fs.readFileSync(f, 'utf8');
        files.splice(files.indexOf(f), 1);
      }
    }

    branches[name] = {
      files,
      patch,
      meta: JSON.parse(patch.match(/\/\*META((.|\n)*)\*\//)[1])
    };
  }

  console.log(branches);
};

loadBranches();

app.listen(port, () => {
  console.log(`\n\nListening on port ${port}`)
});
