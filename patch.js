(async function() {
  const electron = require('electron');

  console.log('[GooseMod] Setting up...');

  const cspAllowAll = [
    'connect-src',
    'style-src',
    'img-src'
  ];

  electron.session.defaultSession.webRequest.onHeadersReceived(({ responseHeaders }, done) => {
    let csp = responseHeaders['content-security-policy'];
    
    if (csp) {
      for (let p of cspAllowAll) {
        // console.log(p);
        csp[0] = csp[0].replace(`${p}`, `${p} *`);
      }

      // console.log(csp);
    }

    done({ responseHeaders });
  });

  let i = setInterval(() => {
    console.log('[GooseMod] Attempting to get main window');

    if (!global.mainWindowId) return;

    console.log('[GooseMod] Success, injecting');

    clearInterval(i);

    let bw = electron.BrowserWindow.fromId(global.mainWindowId);

    bw.webContents.on('dom-ready', () => {
      // bw.webContents.executeJavaScript(`(async function() { alert(1); }).bind(window)();`);
      bw.webContents.executeJavaScript(`(async function() { eval(await (await fetch('https://goosemod-api.netlify.app/untethered/untetheredInject.js')).text()); })();`);
    });
  }, 100);
})();