import { getProxyURL } from '../lib.js';
import * as Cache from './cache.js';

import axios from 'axios';

export default async (req, res, options = {}, rpl = undefined, base = global.discordBase) => {
  proxyVsRedirect.push('proxy');

  console.log(`${base}${req.originalUrl}`);

  console.log(options, rpl);

  let url = rpl !== undefined ? req.originalUrl.replace(rpl[0], rpl[1]) : req.originalUrl;
  url = getProxyURL(url);
  console.log(url);

  const cacheUrl = url.replace(/&_=[0-9]+$/, '');
  console.log(cacheUrl);
  const cached = Cache.get(cacheUrl);

  const now = Date.now();

  if (cached && (now - cached.cachedOn) / 1000 / 60 < 30) {
    console.log('cached');

    cached.lastUsed = now;

    proxyCacheHitArr.push('cached');

    return cached.resp;
  }

  proxyCacheHitArr.push('not cached');

  console.log('not cached');

  let prox = await axios.get(`${base}${url}`, options);

  res.status(prox.status);

  Cache.set(cacheUrl, {
    resp: prox,

    cachedOn: now,
    lastUsed: now
  });

  return prox;
};