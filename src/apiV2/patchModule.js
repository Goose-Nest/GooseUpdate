import { Readable } from 'stream';
import { createHash } from 'crypto';
import { mkdirSync, writeFileSync, readFileSync } from 'fs';

import { getProxyURL } from '../generic/lib.js';

import * as tar from 'tar';
import axios from 'axios';

import { brotliDecompressSync, brotliCompressSync } from 'zlib';

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

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const getBufferFromStream = async (stream) => {
  const chunks = [];
  
  stream.read();
  
  return await new Promise((resolve, reject) => {
    stream.on('data', chunk => chunks.push(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(Buffer.concat(chunks)))
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

  const eDir = `${cacheBase}/${cacheName}/extract`;
  mkdirSync(eDir, { recursive: true });

  const xTar = stream.pipe(
    tar.x({
      cwd: eDir
    })
  );

  console.log('extracting');

  await new Promise((res) => {
    xTar.on('finish', () => res());
  });

  // await sleep(3000);

  console.log('extracted');

  console.log('patching extracted files');

  let deltaManifest = JSON.parse(readFileSync(`${eDir}/delta_manifest.json`));

  const moddedIndex = `${branch.patch}\n\n${desktopCoreBase};
`
  deltaManifest.files['index.js'].New.Sha256 = sha256(moddedIndex);

  writeFileSync(`${eDir}/delta_manifest.json`, JSON.stringify(deltaManifest));

  writeFileSync(`${eDir}/files/index.js`, moddedIndex);

  console.log('creating new tar');

  const tarStream = tar.c(
    {
      cwd: eDir
    },
    [
      'files',
      'delta_manifest.json'
    ]
  );

  const tarBuffer = await getBufferFromStream(tarStream);

  const final = brotliCompressSync(tarBuffer);

  /*let deltaManifest = await new Promise((resolve, reject) => {
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

  const final = brotliCompressSync(readFileSync(`${cacheBase}/${cacheName}/tar.tar`));*/

  console.log(final);

  const finalHash = sha256(final);

  cache.patched[cacheName] = {
    hash: finalHash,
    final
  };

  return sha256(finalHash);
};

export const getFinal = (req) => {
  const cached = cache.patched[getCacheName(req.params.moduleName, req.params.moduleVersion, req.params.branch)];
  
  console.log('getFinal', cache, getCacheName(req.params.moduleName, req.params.moduleVersion, req.params.branch));

  if (!cached) { // uhhh it should always be
    return;
  }

  return cached.final;
};

export const getChecksum = async (m, branch) => sha256(await patch(m, branch));