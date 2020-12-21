import basicProxy from '../../generic/proxy/index.js';

global.app.get('/:branch/modules/:channel/versions.json', async (req, res) => {
  if (!branches[req.params.branch]) {
    res.status(404);
    
    res.send('Invalid GooseUpdate branch');
    return;
  }
  
  requestCounts.modules++;
  
  console.log({type: 'check_for_module_updates', channel: req.params.channel});
  
  if (req.query.platform === 'linux' || req.query.platform === 'win' || req.query.platform === 'osx') {
    const ip = req.headers['cf-connecting-ip']; // Cloudflare IP
    
    uniqueUsers[ip] = {
      platform: req.query.platform,
      host_version: req.query.host_version,
      channel: req.params.channel,
      branch: req.params.branch,
      time: Date.now()
    };
  }
  
  let json = Object.assign({}, (await basicProxy(req, res)).data);
  
  json['discord_desktop_core'] = parseInt(`${branches[req.params.branch].meta.version}${json['discord_desktop_core'].toString()}`);
  
  res.send(JSON.stringify(json));
});