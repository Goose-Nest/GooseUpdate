const express = require('express');
const app = express();
const port = 80;

const axios = require('axios');

const discordBase = `https://discord.com/api`;

const baseRPCVersion = 68;
const moddedRPCVersion = 2;
const RPCVersion = `${moddedRPCVersion}${baseRPCVersion}`;

const basicProxy = async (req, res, options = {}) => {
  console.log(`${discordBase}${req.originalUrl}`);

  let prox = await axios.get(`${discordBase}${req.originalUrl}`, options);

  res.status(prox.status);

  return prox;
};

app.get('/', (req, res) => {
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

  json['discord_rpc'] = RPCVersion;

  res.send(JSON.stringify(json));
});

app.get('/modules/:channel/:module/:version', async (req, res) => {
  console.log({type: 'download_module', channel: req.params.channel, module: req.params.module, version: req.params.version, hostVersion: req.query.host_version, platform: req.query.platform});

  if (req.params.version === RPCVersion) {
    console.log('sending custom zip');

    res.sendFile(`${__dirname}/moddedRPC/module.zip`);

    return;
  }

  const prox = await basicProxy(req, res, {
    responseType: 'arraybuffer'
  });

  //console.log(prox);

  res.send(prox.data);
});

app.listen(port, () => {
  console.log(`Listening at http://localhost:${port}`)
});
