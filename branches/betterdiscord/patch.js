/*META
{
  "version": 5
}
*/

const actualPlatform = process.platform;
process.platform = 'linux';

require('./betterdiscord.asar');

process.platform = actualPlatform;