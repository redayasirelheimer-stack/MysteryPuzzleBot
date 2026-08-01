const { Client, GatewayIntentBits, EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ]
});

// تخزين بيانات اللغز الحالي
let currentPuzzle = null;

client.on('ready', () => {
    console.log(`🤖 البوت متصل الآن باسم: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const args = message.content.split(' ');
    const command = args[0].toLowerCase();

    // 1. أمر بدء لغز جديد (للإدارة فقط)
    // الاستخدام: !startpuzzle <الأيام> | <السؤال> | <الإجابة الصحيحة> | <العقوبة>
    if (command === '!startpuzzle') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر مخصص للإدارة فقط!');
        }

        const rawContent = message.content.slice('!startpuzzle'.length).trim();
        const parts = rawContent.split('|').map(p => p.trim());

        if (parts.length < 4) {
            return message.reply('⚠️ الصيغة خاطئة!\nالاستخدام الصحيح:\n`!startpuzzle <عدد الأيام> | <اللغز> | <الإجابة> | <العقوبة في حال الخسارة>`');
        }

        const days = parseInt(parts[0]);
        const question = parts[1];
        const answer = parts[2].toLowerCase();
        const penalty = parts[3];

        if (isNaN(days) || days <= 0) {
            return message.reply('❌ يرجى تحديد عدد أيام صحيح للمهلة.');
        }

        const endTime = Date.now() + (days * 24 * 60 * 60 * 1000);

        currentPuzzle = {
            question,
            answer,
            penalty,
            endTime,
            solved: false,
            channelId: message.channel.id
        };

        const embed = new EmbedBuilder()
            .setTitle('🧩 بدء لغز الأسبوع الجديد!')
            .setDescription(`**اللغز:**\n${question}`)
            .addFields(
                { name: '⏳ المهلة الزمنية', value: `${days} أيام`, inline: true },
                { name: '⚠️ العقوبة في حال عدم الحل', value: penalty, inline: true }
            )
            .setColor('#F1C40F')
            .setFooter({ text: 'استخدم الأمر !solve <إجابتك> للمحاولة' });

        message.channel.send({ embeds: [embed] });

        // مؤقت ينتهي بانتهاء المهلة
        setTimeout(() => {
            if (currentPuzzle && !currentPuzzle.solved) {
                const failEmbed = new EmbedBuilder()
                    .setTitle('⏰ انتهت المهلة ولم يتم حل اللغز!')
                    .setDescription(`لأسف لم يستطع أحد حل اللغز في الوقت المحدد.\n\n**الإجابة الصحيحة كانت:** ${currentPuzzle.answer}\n**العقوبة المطبقة:** ${currentPuzzle.penalty}`)
                    .setColor('#E74C3C');
                
                message.channel.send({ embeds: [failEmbed] });
                currentPuzzle = null;
            }
        }, days * 24 * 60 * 60 * 1000);

        return;
    }

    // 2. أمر إرسال تلميح/دليل لعضو معين في الخاص (للإدارة فقط)
    // الاستخدام: !clue @User النص
    if (command === '!clue') {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ هذا الأمر مخصص للإدارة فقط!');
        }

        const targetUser = message.mentions.users.first();
        if (!targetUser) return message.reply('❌ يرجى منشن العضو المراد إرسال الدليل له.');

        const clueText = args.slice(2).join(' ');
        if (!clueText) return message.reply('❌ يرجى كتابة نص الدليل.');

        try {
            await targetUser.send(`🕵️ **وصلك جزء من حل لغز الأسبوع:**\n"${clueText}"\n\n*تعاون مع زملائك في السيرفر للوصول للحل الكامل!*`);
            message.reply(`✅ تم إرسال الدليل بنجاح إلى ${targetUser.tag} في الخاص.`);
        } catch (err) {
            message.reply('❌ لم أستطع إرسال رسالة خاصة لهذا العضو (قد تكون رسائله الخاصة مغلقة).');
        }
        return;
    }

    // 3. أمر إجابة اللغز (لجميع الأعضاء)
    // الاستخدام: !solve الإجابة
    if (command === '!solve') {
        if (!currentPuzzle) {
            return message.reply('❌ لا يوجد لغز نشط حالياً!');
        }

        if (currentPuzzle.solved) {
            return message.reply('❌ تم حل هذا اللغز بالفعل!');
        }

        const userAnswer = args.slice(1).join(' ').trim().toLowerCase();
        if (!userAnswer) return message.reply('❌ يرجى كتابة إجابتك بعد الأمر.');

        if (userAnswer === currentPuzzle.answer) {
            currentPuzzle.solved = true;

            const winEmbed = new EmbedBuilder()
                .setTitle('🎉 مبروك! تم حل اللغز بنجاح!')
                .setDescription(`قام البطل ${message.author} بالتوصل للحل الصحيح!\n\n**الإجابة:** ${currentPuzzle.answer}\n🏆 **تستحقون الجائزة الأسبوعية!**`)
                .setColor('#2ECC71');

            message.channel.send({ embeds: [winEmbed] });
            currentPuzzle = null;
        } else {
            message.reply('❌ إجابة خاطئة! حاول مجدداً أو تعاون مع من وصلتهم الأدلة.');
        }
        return;
    }
});

client.login(process.env.DISCORD_TOKEN);
