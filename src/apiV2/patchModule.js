import { Readable } from 'stream';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

import { getProxyURL } from '../generic/lib.js';

import * as tar from 'tar';
import axios from 'axios';

import { brotliDecompressSync, brotliCompressSync } from 'zlib';
import { branches } from '../apiV1/branchesLoader.js';

const cacheBase = '../cache';

const desktopCoreBase = `module.exports = require('./core.asar');`;

let cache = {
  patched: {}
};

const sha256 = (data) => createHash('sha256').update(data).digest('hex');

const getCacheName = (moduleName, moduleVersion, branchName) => `${branchName}-${moduleName}-${moduleVersion}`;

const download = async (url) => (await axios.get(url, {
  responseType: 'arraybuffer'
})).data;

const getContentsFromEntry = async (entry) => {
  const chunks = [];
  
  entry.read();
  
  return await new Promise((resolve, reject) => {
    entry.on('data', chunk => chunks.push(chunk))
    entry.on('error', reject)
    entry.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  });
};

const patch = async (m, branchName) => {
  const cacheName = getCacheName('discord_desktop_core', m.module_version, branchName);
  
  console.log('patch', cache, cacheName);

  const cached = cache.patched[cacheName];
  if (cached) return cached.hash;
  
  const branch = branches[branchName];
  
  console.log(m.url);
  
  const data = await download(m.url);
  const brotli = brotliDecompressSync(data);
  
  const stream = Readable.from(brotli);
  
  let deltaManifest = await new Promise((resolve, reject) => {
    stream.pipe(
      tar.t({
        onentry: async (entry) => {
          console.log(entry.path);
          if (entry.path === 'delta_manifest.json') {
            resolve(JSON.parse(await getContentsFromEntry(entry)));
          }
        }
      })
    )
  });

  const moddedIndex = `${branch.patch}
  
${desktopCoreBase}`;

  deltaManifest.files['index.js'].New.Sha256 = sha256(moddedIndex);

  console.log(deltaManifest);

  const eoDir = `${cacheBase}/${cacheName}/extractOverwrite`;
  mkdirSync(eoDir, { recursive: true });
  mkdirSync(`${eoDir}/files`, { recursive: true });

  writeFileSync(`${eoDir}/delta_manifest.json`, JSON.stringify(deltaManifest));
  writeFileSync(`${eoDir}/files/index.js`, moddedIndex);

  writeFileSync(`${cacheBase}/${cacheName}/tar.tar`, brotli);

  await tar.r({
      f: `${cacheBase}/${cacheName}/tar.tar`,
      cwd: eoDir
    }, [
      `delta_manifest.json`,
      `files/index.js`
    ]);

  const final = brotliCompressSync(readFileSync(`${cacheBase}/${cacheName}/tar.tar`));

  console.log(final);

  const finalHash = sha256(final);

  cache.patched[cacheName] = {
    hash: finalHash,
    final
  };

  return sha256(finalHash);

  // const tar2out = stream.pipe(tar2);

  console.log(tar2);//, tar2out);
};

export const getFinal = async (req) => {
  const cached = cache.patched[getCacheName(req.params.moduleName, req.params.moduleVersion, req.params.branch)];
  
  console.log('getFinal', cache, getCacheName(req.params.moduleName, req.params.moduleVersion, req.params.branch));

  if (!cached) { // uhhh it should always be
    return;
  }

  return cached.final;
};

export const getChecksum = async (m, branch) => sha256(await patch(m, branch));