(async function() {
  const version = 9;

  function rgb(r, g, b, text) {
    return `\x1b[38;2;${r};${g};${b}m${text}\x1b[0m`;
  }

  function log(msg) {
    console.log(`[${rgb(250, 250, 0, 'GooseMod')}] ${msg}`);
  }

  const electron = require('electron');

  log(`GooseUpdate Desktop Core Module Patch - Version ${version}`);

  log('Setting up CSP disabler...');

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

//      console.log(csp[0]);

      // Fix Discord's broken CSP which disallows unsafe-inline due to having a nonce (which they don't even use?)
      csp[0] = csp[0].replace(/'nonce-.*?' /, '');

//      console.log(csp[0]);
    }

    done({ responseHeaders });
  });

  let i = setInterval(() => {
    log('Attempting to get main window');

    if (!global.mainWindowId) return;

    log('Success, adding dom-ready handler');

    clearInterval(i);

    let bw = electron.BrowserWindow.fromId(global.mainWindowId);

    bw.webContents.on('dom-ready', () => {
      log('dom-ready triggered: injecting GooseMod JS');

      // bw.webContents.executeJavaScript(`(async function() { alert(1); }).bind(window)();`);
      bw.webContents.executeJavaScript(`(async function() { eval(await (await fetch('https://goosemod-api.netlify.app/untethered/untetheredInject.js')).text()); })();`);
    });
  }, 100);
})();
