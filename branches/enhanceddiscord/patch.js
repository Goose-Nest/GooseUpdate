/*META
{
  "version": 1
}
*/

process.env.injDir = require('path').join(__dirname, 'EnhancedDiscord');
require(`${process.env.injDir}/injection.js`);