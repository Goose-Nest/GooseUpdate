import { send } from './patchModule.js';

global.app.get('/:branch/distro/app/:channel/:platform/:arch/:hostVersion/:moduleName/:moduleVersion/full.distro', (req, res) => {
  if (!branches[req.params.branch]) {
    res.status(404);
    
    res.send('Invalid GooseUpdate branch');
    return;
  }

  send(req, res);  
});