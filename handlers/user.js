import { InlineKeyboard } from 'grammy';
import { supabase } from '../config/supabase.js';
import { sendAnimeByCode } from './start.js';

export function setupUserHandlers(bot) {
  // Top 10 Katalogni ko'rish
  bot.command('top10', async (ctx) => {
    const { data: topAnimes } = await supabase
      .from('animes')
      .select('*')
      .order('views_count', { ascending: false })
      .limit(10);

    if (!topAnimes || topAnimes.length === 0) {
      return ctx.reply("Hozircha animelar mavjud emas.");
    }

    let msg = "🔥 **Eng ko'p ko'rilgan TOP-10 Animelar:**\n\n";
    const keyboard = new InlineKeyboard();

    topAnimes.forEach((anime, index) => {
      msg += `${index + 1}. **${anime.title_uz}** — 🔑 kodi: \`${anime.code}\` (${anime.views_count} ko'rish)\n`;
      keyboard.text(`▶️ ${anime.code}`, `get_anime_${anime.code}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
  });

  // Top 10 list ichidagi tugmalar
  bot.callbackQuery(/^get_anime_(\d+)$/, async (ctx) => {
    const code = parseInt(ctx.match[1]);
    await sendAnimeByCode(ctx, code);
    await ctx.answerCallbackQuery();
  });

  // Matn bo'yicha qidiruv (Kod yoki Nomi)
  bot.on('message:text', async (ctx, next) => {
    const text = ctx.message.text.trim();

    if (text.startsWith('/')) return next(); // Boshqa komandalarga xalaqit bermaslik

    // Agarda faqat raqam bo'lsa -> Kod bo'yicha qidirish
    if (!isNaN(text)) {
      return await sendAnimeByCode(ctx, parseInt(text));
    }

    // Nom bo'yicha qidirish (O'zbek, Rus va Ingliz nomlaridan)
    const { data: animes } = await supabase
      .from('animes')
      .select('*')
      .or(`title_uz.ilike.%${text}%,title_ru.ilike.%${text}%,title_en.ilike.%${text}%`)
      .limit(5);

    if (!animes || animes.length === 0) {
      return ctx.reply("🔍 Anime topilmadi. Qayta urinib ko'ring yoki kodini yuboring.");
    }

    const keyboard = new InlineKeyboard();
    animes.forEach(anime => {
      keyboard.text(`🎬 ${anime.title_uz} (${anime.code})`, `get_anime_${anime.code}`).row();
    });

    await ctx.reply(`🔍 **"${text}" bo'yicha topilgan animelar:**`, { reply_markup: keyboard });
  });

  // Yulduz va Sharh qoldirish
  bot.callbackQuery(/^rate_(\d+)$/, async (ctx) => {
    const animeId = ctx.match[1];
    const keyboard = new InlineKeyboard()
      .text('⭐ 1', `set_rate_${animeId}_1`)
      .text('⭐ 2', `set_rate_${animeId}_2`)
      .text('⭐ 3', `set_rate_${animeId}_3`)
      .text('⭐ 4', `set_rate_${animeId}_4`)
      .text('⭐ 5', `set_rate_${animeId}_5`);

    await ctx.reply("Animeni baholang:", { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  // Bahoni qabul qilish va sharhlar kanaliga yuborish
  bot.callbackQuery(/^set_rate_(\d+)_(\d+)$/, async (ctx) => {
    const animeId = ctx.match[1];
    const rating = ctx.match[2];

    const { data: anime } = await supabase.from('animes').select('*').eq('id', animeId).single();

    // Bazaga saqlash
    await supabase.from('reviews').insert([{
      anime_id: animeId,
      user_id: ctx.from.id,
      rating: parseInt(rating)
    }]);

    // Sharhlar kanaliga post qilish
    if (process.env.REVIEWS_CHANNEL_ID) {
      await ctx.api.sendMessage(
        process.env.REVIEWS_CHANNEL_ID,
        `🌟 **Yangi Baho va Sharh!**\n\n🎬 **Anime:** ${anime ? anime.title_uz : 'Noma\'lum'}\n⭐ **Baho:** ${rating}/5\n👤 **Foydalanuvchi:** [${ctx.from.first_name}](tg://user?id=${ctx.from.id})`,
        { parse_mode: 'Markdown' }
      );
    }

    await ctx.answerCallbackQuery("Bahoyingiz saqlandi va kanalga joylandi!");
    await ctx.reply("Rahmat! Bahoyingiz qabul qilindi.");
  });
}