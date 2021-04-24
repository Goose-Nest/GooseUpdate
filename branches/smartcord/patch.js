/*META
{
  "version": 1
}
*/

process.env.injDir = require('path').join(__dirname, 'smartcord');
require(`${process.env.injDir}/injection.js`);