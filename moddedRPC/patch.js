(async function () {
const fs = require('fs');
const axios = require('axios');

const injectCode = (await axios.get('https://goosemod-api.netlify.app/untethered/untetheredInject.js')).data;

let code = fs.readFileSync(`module/index.js`);
code = injectCode + '\n\n' + code;

fs.writeFileSync(`module/index.js`, code);
})();