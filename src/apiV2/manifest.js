import basicProxy from '../generic/proxy/index.js';
import { getChecksum } from './patchModule.js';

const base = 'https://discord.com/api/updates';
const host = `http://localhost:${process.argv[2] || 80}`;

// https://discord.com/api/updates/distributions/app/manifests/latest?channel=canary&platform=win&arch=x86

global.app.get('/:branch/distributions/app/manifests/latest', async (req, res) => {
  if (!branches[req.params.branch]) {
    res.status(404);
    
    res.send('Invalid GooseUpdate branch');
    return;
  }

  let json = Object.assign({}, (await basicProxy(req, res, {}, undefined, base)).data);

  console.log(json.modules.discord_desktop_core);

  delete json.modules.discord_desktop_core.deltas; // Remove deltas

  const oldVersion = json.modules.discord_desktop_core.full.module_version;
  const newVersion = parseInt(`${branches[req.params.branch].meta.version}${oldVersion.toString()}`);

  // Modify version to prefix branch's version
  json.modules.discord_desktop_core.full.module_version = newVersion;

  json.modules.discord_desktop_core.full.package_sha256 = await getChecksum(json.modules.discord_desktop_core.full, req.params.branch);

  // Modify URL to use this host
  json.modules.discord_desktop_core.full.url = `${host}/${req.params.branch}/${json.modules.discord_desktop_core.full.url.split('/').slice(3).join('/').replace(`${oldVersion}/full.distro`, `${newVersion}/full.distro`)}`;

  console.log(json.modules.discord_desktop_core);

  res.set('Content-Type', 'application/json');

  res.send(JSON.stringify(json));
});

/*
  - Similar to branches except this is way more general use
  - Formatted as JSON
  
  - Method:
    - Proxy original request
    - Target: discord_desktop_core:
      - Update module version
      - Pre-patch module:
        - Check if already patched in disk cache
        - If so:
          - We will just send cached file later
        - If not:
          - Download original module
          - Uncompress:
            - Brotli decompress
            - Extract tar
          - Patch:
            - Patch index.js
            - Update checksum in delta manifest
            - UNKNOWN - needs testing:
              - Add files to files/
              - [?] Add files to files/manifest.json
              - [?] Add files to delta manifest
              (- Avoiding those extra steps unless needed)
          - Recompress:
            - Package into tar
            - Brotli compress
        - Overwrite url with new self url
        - Overwrite checksum with new checksum
    - UNKNOWN - needs testing:
      - [?] Remove deltas - so client is forced to use full (it might depend on them?)
      - [?] Generate new deltas - this will require way more work
*/