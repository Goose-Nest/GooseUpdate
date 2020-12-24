const proxy = require('http-proxy-middleware');

const proxyFilter = function(pathname, req) {
  return pathname.match('.*') && req.headers.host === 'testing-updates.goosemod.com';
};

const betaProxy = proxy(proxyFilter, {target: 'http://127.0.0.1:9999'});
global.app.use(betaProxy);