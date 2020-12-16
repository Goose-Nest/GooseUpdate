import { getProxyURL } from './lib.js';

export default async (req, res) => {
  proxyVsRedirect.push('redirect');

  const proxyUrl = `${discordBase}${getProxyURL(req.originalUrl)}`;

  console.log(proxyUrl);
  res.redirect(proxyUrl);
};