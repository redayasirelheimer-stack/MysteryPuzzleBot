const { Client, GatewayIntentBits, Partials, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});

let currentPuzzle = null;
let puzzleTimeout = null;

client.on('ready', () => {
    console.log(`🤖 البوت جاهز ومتصل باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // 1. أمر بدء لغز جديد (في السيرفر)
    if (command === '!startpuzzle') {
        if (!message.guild || !message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر مخصص للإدارة داخل السيرفر فقط!');
        }

        const rawContent = message.content.slice('!startpuzzle'.length).trim();
        const parts = rawContent.split('|').map(p => p.trim());

        if (parts.length < 4) {
            return message.reply('⚠️ الصيغة خاطئة!\nالاستخدام:\n`!startpuzzle عدد الأيام | السؤال | الإجابة الصحيحة | العقوبة`');
        }

        const days = parseInt(parts[0]);
        const question = parts[1];
        const answer = parts[2].toLowerCase();
        const penalty = parts[3];

        if (isNaN(days) || days <= 0) {
            return message.reply('❌ يرجى تحديد عدد أيام صحيح.');
        }

        currentPuzzle = {
            question,
            answer,
            penalty,
            channelId: message.channel.id,
            solved: false
        };

        const embed = new EmbedBuilder()
            .setTitle('🧩 لغز جديد وصل!')
            .setDescription(`**اللغز:**\n${question}`)
            .addFields(
                { name: '⏳ المهلة الزمنية', value: `${days} أيام`, inline: true },
                { name: '⚠️ العقوبة في حال عدم الحل', value: penalty, inline: true }
            )
            .setColor('#F1C40F')
            .setFooter({ text: 'استخدم الأمر !solve <إجابتك> للمحاولة' });

        message.channel.send({ embeds: [embed] });

        if (puzzleTimeout) clearTimeout(puzzleTimeout);
        puzzleTimeout = setTimeout(() => {
            if (currentPuzzle && !currentPuzzle.solved) {
                const failEmbed = new EmbedBuilder()
                    .setTitle('⏰ انتهت المهلة ولم يتم حل اللغز!')
                    .setDescription(`للأسف لم يستطع أحد حل اللغز في الوقت المحدد.\n\n**الإجابة الصحيحة كانت:** ${currentPuzzle.answer}\n**العقوبة المطبقة:** ${currentPuzzle.penalty}`)
                    .setColor('#E74C3C');
                
                message.channel.send({ embeds: [failEmbed] });
                currentPuzzle = null;
            }
        }, days * 24 * 60 * 60 * 1000);

        return;
    }

    // 2. أمر إرسال التلميح (في الخاص أو في السيرفر)
    if (command === '!clue') {
        if (!currentPuzzle) {
            return message.reply('❌ لا يوجد لغز نشط حالياً لإرسال تلميح له!');
        }

        const clueText = args.slice(1).join(' ');
        if (!clueText) return message.reply('❌ يرجى كتابة نص التلميح.');

        const clueEmbed = new EmbedBuilder()
            .setTitle('🕵️ تلميح جديد للجميع!')
            .setDescription(`**الدليل:**\n"${clueText}"`)
            .setColor('#3498DB')
            .setFooter({ text: 'ركزوا جيداً للوصول إلى الحل الصحيح!' });

        try {
            const puzzleChannel = await client.channels.fetch(currentPuzzle.channelId);
            await puzzleChannel.send({ embeds: [clueEmbed] });

            if (!message.guild) {
                message.reply('✅ تم نشر التلميح بنجاح في السيرفر دون أن يعلم أحد مصدره!');
            } else {
                message.delete().catch(() => {});
            }
        } catch (err) {
            message.reply('❌ تعذر إرسال التلميح إلى الروم.');
        }
        return;
    }

    // 3. أمر حل اللغز (للأعضاء)
    if (command === '!solve') {
        if (!currentPuzzle) {
            return message.reply('❌ لا يوجد لغز نشط حالياً!');
        }

        if (currentPuzzle.solved) {
            return message.reply('❌ تم حل هذا اللغز بالفعل!');
        }

        const userAnswer = args.slice(1).join(' ').trim().toLowerCase();
        if (!userAnswer) return message.reply('❌ يرجى كتابة إجابتك.');

        if (userAnswer === currentPuzzle.answer) {
            currentPuzzle.solved = true;
            if (puzzleTimeout) clearTimeout(puzzleTimeout);

            const winEmbed = new EmbedBuilder()
                .setTitle('🎉 مبروك! تم حل اللغز بنجاح!')
                .setDescription(`قام البطل ${message.author} بالتوصل للحل الصحيح!\n\n**الإجابة:** ${currentPuzzle.answer}\n🏆 **تستحقون الجائزة!**`)
                .setColor('#2ECC71');

            message.channel.send({ embeds: [winEmbed] });
            currentPuzzle = null;
        } else {
            message.reply('❌ إجابة خاطئة! حاول مجدداً.');
        }
        return;
    }
});

client.login(process.env.DISCORD_TOKEN);
