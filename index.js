const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(` تم تشغيل البوت بنجاح! مسجل باسم: ${client.user.tag}`);
});

// الاتصال بالديسكورد باستخدام التوكن المحفوظ
client.login(process.env.DISCORD_TOKEN);
