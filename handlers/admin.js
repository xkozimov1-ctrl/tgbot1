import { InlineKeyboard } from 'grammy';
import { supabase } from '../config/supabase.js';

const ADMINS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',').map(id => parseInt(id.trim())) : [];

function isAdmin(ctx) {
  return ADMINS.includes(ctx.from.id);
}

export function setupAdminHandlers(bot) {
  // 1. Admin Panel Asosiy Menyusi
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await showAdminMenu(ctx);
  });

  async function showAdminMenu(ctx) {
    const keyboard = new InlineKeyboard()
      .text("➕ Anime Qo'shish", "admin_add_anime")
      .text("🗑 Anime O'chirish", "admin_delete_anime")
      .row()
      .text("📊 Statistika", "admin_stats")
      .text("📢 Xabar Tarqatish (Broadcast)", "admin_broadcast")
      .row()
      .text("⭐ Foydalanuvchiga Premium Berish", "admin_give_premium")
      .row()
      .text("❌ Menyuni Yopish", "admin_close");

    const text = "👨‍💻 **ADMIN PANEL**\n\nBarcha boshqaruv tugmalari:";
    
    if (ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', reply_markup: keyboard });
    }
  }

  // Back / Menu tugmasi
  bot.callbackQuery('admin_menu', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await showAdminMenu(ctx);
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery('admin_close', async (ctx) => {
    if (!isAdmin(ctx)) return;
    await ctx.deleteMessage();
  });

  // 2. STATISTIKA BO'LIMI
  bot.callbackQuery('admin_stats', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const { count: usersCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: premiumUsersCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_premium', true);
    const { count: animesCount } = await supabase.from('animes').select('*', { count: 'exact', head: true });
    const { count: reviewsCount } = await supabase.from('reviews').select('*', { count: 'exact', head: true });

    const statsMsg = 
      `📊 **BOT STATISTIKASI**\n\n` +
      `👥 Jami foydalanuvchilar: **${usersCount || 0}** ta\n` +
      `⭐ Premium obunachilar: **${premiumUsersCount || 0}** ta\n` +
      `🎬 Baza mavjud animelar: **${animesCount || 0}** ta\n` +
      `💬 Qoldirilgan sharhlar: **${reviewsCount || 0}** ta`;

    const keyboard = new InlineKeyboard().text("⬅️ Ortga", "admin_menu");
    await ctx.editMessageText(statsMsg, { parse_mode: 'Markdown', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  // 3. ANIME QO'SHISH VA KANALGA POST QILISH Yo'riqnomasi
  bot.callbackQuery('admin_add_anime', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const msg = 
      "➕ **YANGI ANIME QO'SHISH**\n\n" +
      "Animeni bazaga qo'shish va avtomatik kanalga post qilish uchun buyruqni quyidagi formatda yuboring:\n\n" +
      "`/add [KOD] | [UZ_NOMI] | [RU_NOMI] | [EN_NOMI] | [FILE_ID]`\n\n" +
      "📌 **Misol:**\n" +
      "`/add 101 | Naruto | Наруто | Naruto | BAACAgIAAxkBAA...`\n\n" +
      "*(File ID ni olish uchun botga ixtiyoriy video/fayl yuborsangiz bot sizga file_id bera oladi)*";

    const keyboard = new InlineKeyboard().text("⬅️ Ortga", "admin_menu");
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  // 4. ANIME O'CHIRISH
  bot.callbackQuery('admin_delete_anime', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const msg = 
      "🗑 **ANIME O'CHIRISH**\n\n" +
      "Animeni o'chirish uchun uning kodini ushbu formatda yuboring:\n\n" +
      "`/del [ANIME_KODI]`\n\n" +
      "📌 **Misol:** `/del 101`";

    const keyboard = new InlineKeyboard().text("⬅️ Ortga", "admin_menu");
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.command('del', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const code = ctx.match.trim();
    if (!code || isNaN(code)) {
      return ctx.reply("❌ Kodi noto'g'ri. Misol: `/del 101`", { parse_mode: 'Markdown' });
    }

    const { data, error } = await supabase.from('animes').delete().eq('code', parseInt(code)).select();

    if (error || !data.length) {
      return ctx.reply(`❌ Kodi ${code} bo'lgan anime topilmadi yoki o'chirishda xatolik.`);
    }

    await ctx.reply(`✅ Kodi **${code}** bo'lgan anime bazadan muvaffaqiyatli o'chirildi!`, { parse_mode: 'Markdown' });
  });

  // 5. REKLAMA / XABAR TARQATISH (BROADCAST)
  bot.callbackQuery('admin_broadcast', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const msg = 
      "📢 **XABAR TARQATISH (BROADCAST)**\n\n" +
      "Barcha foydalanuvchilarga xabar yuborish uchun quyidagi buyruqdan foydalaning:\n\n" +
      "`/send [Sizning xabaringiz]`\n\n" +
      "📌 **Misol:** `/send Bugun yangi anime joylandi! Tomosha qiling.`";

    const keyboard = new InlineKeyboard().text("⬅️ Ortga", "admin_menu");
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.command('send', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const broadcastMsg = ctx.match;
    if (!broadcastMsg) {
      return ctx.reply("❌ Xabar matnini kiriting. Misol: `/send Salom barchaga`", { parse_mode: 'Markdown' });
    }

    const { data: users } = await supabase.from('users').select('id');
    if (!users || users.length === 0) return ctx.reply("Foydalanuvchilar topilmadi.");

    let count = 0;
    await ctx.reply(`🚀 Xabar tarqatish boshlandi... Total: ${users.length}`);

    for (const u of users) {
      try {
        await ctx.api.sendMessage(u.id, broadcastMsg, { parse_mode: 'Markdown' });
        count++;
      } catch (e) {
        // Bloklagan foydalanuvchilarni o'tkazib yuboradi
      }
    }

    await ctx.reply(`✅ Xabar **${count}** ta foydalanuvchiga muvaffaqiyatli yetkazildi!`);
  });

  // 6. QO'LDA PREMIUM BERISH
  bot.callbackQuery('admin_give_premium', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const msg = 
      "⭐ **PREMIUM BERISH**\n\n" +
      "Foydalanuvchiga qo'lda Premium obuna berish uchun:\n\n" +
      "`/givepremium [USER_ID] [KUN_SANI]`\n\n" +
      "📌 **Misol (7 kun berish):** `/givepremium 123456789 7`";

    const keyboard = new InlineKeyboard().text("⬅️ Ortga", "admin_menu");
    await ctx.editMessageText(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.command('givepremium', async (ctx) => {
    if (!isAdmin(ctx)) return;

    const args = ctx.match.split(' ').map(a => a.trim());
    if (args.length < 2) {
      return ctx.reply("❌ Format xato! Misol: `/givepremium 123456789 7`", { parse_mode: 'Markdown' });
    }

    const targetUserId = parseInt(args[0]);
    const days = parseInt(args[1]);

    const until = new Date();
    until.setDate(until.getDate() + days);

    const { error } = await supabase.from('users').update({
      is_premium: true,
      premium_until: until.toISOString()
    }).eq('id', targetUserId);

    if (error) {
      return ctx.reply("❌ Xatolik: Foydalanuvchi bazada topilmadi.");
    }

    await ctx.reply(`✅ **${targetUserId}** IDli foydalanuvchiga **${days}** kunga Premium berildi!`);
    
    try {
      await ctx.api.sendMessage(targetUserId, `🎉 Admin tomonidan sizga **${days}** kunlik Premium obuna taqdim etildi!`);
    } catch (e) {}
  });
}