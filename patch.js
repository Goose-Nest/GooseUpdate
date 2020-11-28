(async function() {
  const version = 10;

  const unstrictCSP = () => {
    log('Setting up CSP unstricter...');

    const cspAllowAll = [
      'connect-src',
      'style-src',
      'img-src'
    ];

    electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders }, done) => {
      let csp = responseHeaders['content-security-policy'];

      if (csp) {
        for (let p of cspAllowAll) {
          csp[0] = csp[0].replace(`${p}`, `${p} *`);
        }

        // Fix Discord's broken CSP which disallows unsafe-inline due to having a nonce (which they don't even use?)
        csp[0] = csp[0].replace(/'nonce-.*?' /, '');
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

      // bw.webContents.executeJavaScript(require('fs').readFileSync('/home/duck/GooseMod/Injector/dist/index.js', 'utf8'));
      bw.webContents.executeJavaScript(`(async function() { eval(await (await fetch('https://goosemod-api.netlify.app/untethered/untetheredInject.js')).text()); })();`);
    });
  }, 100);
})();
