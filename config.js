export default {
  /*
    GooseUpdate config

    All these have defaults in the code so if you don't want to see / mess around you can just remove everything you don't change
  */

  'webserver': {
    'https': { // Key and cert to use for HTTPS (remove / set to false if not wanting HTTPS)
      'key': '../server.key',
      'cert': '../server.crt'
    }
  },

  'proxy': {
    'cache': {
      'lastUsedRemoveHours': 1, // Wait how many hours after cache entry was last used before removing it
      'maxMinutesToUseCached': 30 // Use a cache entry for how many minutes after it was made
    },

    'useragent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) discord/0.0.116 Chrome/83.0.4103.122 Electron/9.3.5 Safari/537.36' // User agent to send with proxy requests
  },

  'apiBases': {
    'v1': 'https://discord.com/api', // API v1 base (for redirects + proxy)
    'v2': 'https://discord.com/api/updates' // API v2 base (for proxy)
  },

  'deprecated': {
    'guV2Migration': true // Whether to use the GooseUpdate v1.x -> v2.x migration fix (you probably don't need this unless it's updates.goosemod.com)
  },

  'experimental': { // Experimental - could crash / break server (but mostly are fine)
    'webserver': {
      'http2': true // Whether to use HTTP/2
    },
    'apiV2Enabled': true // Whether to actually enable / load API v2 code on startup
  }
}