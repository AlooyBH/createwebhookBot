const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');

const TOKEN = ''; // توكن البوت
const GUILD_ID = ''; // ايدي السيرفر
const keys = require('./webhooks_keys.json');

const categories = {
  General: ['stash', 'inventory', 'join', 'robbery', 'shop', 'casino', 'drop', 'vehicle', 'chat', 'death'], // كترج عام
  Police: ['police', 'jail', 'cuff', '112', '997', '911', 'impound', 'cop'],// كترج الشرطة
  Admin: ['admin', 'spectate', 'ban', 'kick', 'aclothing', 'announce', 'setjob', 'tpm', 'revive', 'perm'] // كترج الادارة
};

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', async () => {
  const guild = await client.guilds.fetch(GUILD_ID);
  const webhookResults = {};

  function detectCategory(key) {
    for (const [cat, words] of Object.entries(categories)) {
      if (words.some(word => key.toLowerCase().includes(word))) return cat;
    }
    return 'General';
  }

  async function createChannel(name, baseCategoryName) {
    const allChannels = await guild.channels.fetch();

    const matchingCategory = allChannels.find(c =>
      c.type === 4 &&
      c.name.startsWith(`${baseCategoryName} Logs`) &&
      allChannels.find(ch => ch.name === name && ch.parentId === c.id && ch.type === 0)
    );

    if (matchingCategory) {
      const existingChannel = allChannels.find(ch => ch.name === name && ch.parentId === matchingCategory.id && ch.type === 0);
      return existingChannel;
    }

    let count = 1;
    let category;
    while (true) {
      const catName = count === 1 ? `${baseCategoryName} Logs` : `${baseCategoryName} Logs ${count}`;
      category = allChannels.find(c => c.name === catName && c.type === 4);
      if (!category) {
        category = await guild.channels.create({ name: catName, type: 4 });
        break;
      }
      const children = allChannels.filter(c => c.parentId === category.id);
      if (children.size < 50) break;
      count++;
    }

    return await guild.channels.create({ name, type: 0, parent: category.id });
  }

  for (const key of keys) {
    const catName = detectCategory(key);
    const channel = await createChannel(key, catName);

    const webhooksInChannel = await channel.fetchWebhooks();
    const existing = webhooksInChannel.find(wh => wh.name === 'Alooy Logger');
    const webhook = existing || await channel.createWebhook({ name: 'Alooy Logger' });

    await new Promise(resolve => setTimeout(resolve, 500));
    webhookResults[key] = webhook.url;
    console.log(`✔️ ${key} -> ${channel.parent?.name || 'No Category'} -> ${webhook.url}`);
  }


  let luaOutput = "Webhooks = {\n";
  for (const [key, url] of Object.entries(webhookResults)) {
    luaOutput += `    ['${key}'] = '${url}',\n`;
  }
  luaOutput += "}\n";

  const path = './webhooks.lua';
  if (fs.existsSync(path)) {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });

    readline.question('⚠️ webhooks.lua already exists. Do you want to overwrite it? (y/n): ', answer => {
      readline.close();
      if (answer.toLowerCase() === 'y') {
        fs.writeFileSync(path, luaOutput);
        console.log("✅ webhooks.lua overwritten.");
      } else {
        console.log("❌ Operation canceled. No changes made.");
      }
      process.exit();
    });
  } else {
    fs.writeFileSync(path, luaOutput);
    console.log("✅ webhooks.lua created.");
    process.exit();
  }
});

client.login(TOKEN);
