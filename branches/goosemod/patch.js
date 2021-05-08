/*META
{
  "version": 15
}
*/

(async function() {
  const version = 15;

  const unstrictCSP = () => {
    log('Setting up CSP unstricter...');

    const cspAllowAll = [
      'connect-src',
      'style-src',
      'img-src',
      'font-src'
    ];

    const corsAllowUrls = [
      'https://github.com/GooseMod/GooseMod/releases/download/dev/index.js',
      'https://github-releases.githubusercontent.com/'
    ];

    electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders, url }, done) => {
      let csp = responseHeaders['content-security-policy'];

      if (csp) {
        for (let p of cspAllowAll) {
          csp[0] = csp[0].replace(`${p}`, `${p} * data:`); // * does not include data: URIs
        }

        // Fix Discord's broken CSP which disallows unsafe-inline due to having a nonce (which they don't even use?)
        csp[0] = csp[0].replace(/'nonce-.*?' /, '');
      }

      console.log(url);

      if (corsAllowUrls.some((x) => url.startsWith(x))) {
        responseHeaders['access-control-allow-origin'] = ['*'];
      }

      done({ responseHeaders });
    });
  };

  const rgb = (r, g, b, text) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;

  const log = function() { console.log(`[${rgb(250, 250, 0, 'GooseMod')}]`, ...arguments); }

  const electron = require('electron');

  const otherMods = {
    specific: {
      betterDiscord: electron.app.commandLine.hasSwitch("no-force-async-hooks-checks"), // BetterDiscord adds a command line switch in it's injector
      // powercord: (new electron.BrowserWindow({webContents: {}})).webContents.__powercordPreload !== undefined, // PowerCord adds a property to BrowserWindow's webContent's
    },
    generic: {
      electronProxy: require('util').types.isProxy(electron) // Many modern mods overwrite electron with a proxy with a custom BrowserWindow (copied from PowerCord)
    }
  };

  log(`GooseUpdate Desktop Core Module Patch - Version ${version}`);

  log(otherMods);

  if (!otherMods.generic.electronProxy) unstrictCSP();

  let i = setInterval(() => {
    log('Attempting to get main window');

    if (!global.mainWindowId) return;

    log('Success, adding dom-ready handler');

    clearInterval(i);

    let bw = electron.BrowserWindow.fromId(global.mainWindowId);

    bw.webContents.on('dom-ready', () => {
      log('dom-ready triggered: injecting GooseMod JS');

      bw.webContents.executeJavaScript(require('fs').readFileSync('/home/duck/GooseMod/GooseMod/dist/index.js', 'utf8'));
      // bw.webContents.executeJavaScript(`(async function() { eval(await (await fetch('https://goosemod-api.netlify.app/untethered/untetheredInject.js')).text()); })();`);
    });
  }, 100);

  // Auto migrate for users who were relying on GooseUpdate v1.x to new v2.x endpoint(s)

  try {
    log('Starting GooseUpdate v1.x -> v2.x endpoint auto-migration');

    log('Checking settings.json');

    const path = require('path');

    const settingsPath = path.join(__dirname, '../../../settings.json');

    log(settingsPath);

    let settings = require(settingsPath);
    log(settings);

    const endpoint = settings.UPDATE_ENDPOINT;
    log(endpoint);

    if (endpoint.replace(/[^/]/g, '').length < 3) {
      log('Detected v1.x endpoint - migrating');
      const newEndpoint = `${endpoint}/goosemod`;
      settings.UPDATE_ENDPOINT = newEndpoint;

      log(newEndpoint);

      const fs = require('fs');

      log('Overwriting settings.json with new endpoint');

      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    } else {
      log('Detected v2.x endpoint - skipping');
    }
  } catch (e) {
    log('GooseUpdate v1.x -> v2.x endpoint auto-migration failed', e);
  }
})();