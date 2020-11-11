const express = require('express');
const app = express();

const port = process.argv[2] || 80;
if (!process.argv[2]) console.log(`No port specified in args, using default: ${port}\n`);

const axios = require('axios');
const fs = require('fs');

const stream = require('stream');
const unzipper = require('unzipper');
const archiver = require('archiver');

const discordBase = `https://discord.com/api`;

const moddedVersion = 6;
const patchCode = fs.readFileSync(`${__dirname}/patch.js`, 'utf-8');

console.log(`Using proxy base: ${discordBase}`);
console.log(`Modded version: ${moddedVersion}`);

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const basicProxy = async (req, res, options = {}, rpl = undefined) => {
  console.log(`${discordBase}${req.originalUrl}`);

  console.log(rpl !== undefined ? req.originalUrl.replace(rpl[0], rpl[1]) : req.originalUrl);

  let prox = await axios.get(`${discordBase}${rpl !== undefined ? req.originalUrl.replace(rpl[0], rpl[1]) : req.originalUrl}`, options);

  res.status(prox.status);

  return prox;
};

app.get('/', (req, res) => {
  console.log('[req]', req.originalUrl);

  res.sendFile(`${__dirname}/index.html`);
});

app.all('*', (req, res, next) => {
  console.log('[req]', req.originalUrl);
  next();
});

app.get('/updates/:channel/releases', async (req, res) => { // Windows Squirrel
  console.log({type: 'host_squirrel', id: req.query.id, localVersion: req.query.localVersion, arch: req.query.arch});

  let prox = (await basicProxy(req, res)).data;

  res.send(prox);

  //res.send(typeof prox === 'string' ? prox : JSON.stringify(json));
});

app.get('/updates/:channel', async (req, res) => {
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
  console.log({type: 'check_for_module_updates', channel: req.params.channel});

  let json = (await basicProxy(req, res)).data;

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
    // console.log(t);

    /*while (!fs.existsSync(`${cacheExtractDir}/package.json`)) {
      console.log('Waiting for extract...');
      await sleep(10);
    }*/

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

    /*fs.rmdir(cacheExtractDir, { recursive: true }, (err) => {
      console.log('a', err);
    })*/

    //console.log(prox);
  
    //fs.writeFileSync(`${cacheDir}/original.zip`, prox.data);

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
