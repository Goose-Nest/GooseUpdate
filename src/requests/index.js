import initModules from './modules.js';
import initModuleDownload from './moduleDownload/index.js';
import initSquirrel from './host/squirrel.js';
import initLinux from './host/linux.js';

export default async (app) => {
  initSquirrel(app);
  initLinux(app);

  initModules(app);

  initModuleDownload(app);
};