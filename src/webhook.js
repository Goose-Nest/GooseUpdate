import axios from 'axios';

const url = process.env.GU_WEBHOOK;

const responseBase = {
  content: '',
  username: 'GooseUpdate',
  avatar_url: 'https://cdn.discordapp.com/avatars/760559484342501406/5125aff2f446ad7c45cf2dfd6abf92ed.png'
};

const send = async (content, embeds = undefined) => {
  if (!url) return;

  const json = Object.assign(responseBase, { content, embeds });

  try {
    await axios.post(url, json);
  } catch (e) {
    console.log(e.response);
  }
};

const sendStats = async () => {
  await send('', [
    {
      title: 'Stats',
      fields: [
        {
          name: 'Users',
          value: Object.values(global.uniqueUsers).length,
          inline: true
        }
      ]
    }
  ])
};

send('', [
  {
    title: 'Started Up'
  }
]);

setTimeout(sendStats, 60 * 1000);
setInterval(sendStats, 60 * 60 * 1000)