import { InlineKeyboard, InputFile } from 'grammy';
import { supabase } from '../config/supabase.js';

export function setupStartHandlers(bot) {
  // 1. /start va Deep linking (Kanal tugmasidan kirganda)
  bot.command('start', async (ctx) => {
    const startPayload = ctx.match; // Masalan: /start 101

    if (startPayload && !isNaN(startPayload)) {
      return await sendAnimeByCode(ctx, parseInt(startPayload));
    }

    await sendMainMenu(ctx);
  });

  // Asosiy menyuni yuboruvchi funksiya
  async function sendMainMenu(ctx) {
    const text = 
      "👋 **Anime olamiga xush kelibsiz!**\n\n" +
      "🤖 Botimiz orqali sevimli animelaringizni o'zbek, rus va ingliz tillarida eng yuqori sifatda tomosha qilishingiz mumkin.\n\n" +
      "Quyidagi bo'limlardan birini tanlang:";

    const keyboard = new InlineKeyboard()
      .text("🆔 Kod orqali qidiruv", "btn_search_code")
      .row()
      .text("🇺🇿 O'zbekcha Animelar", "btn_anime_uz")
      .text("🇷🇺 Ruscha Animelar", "btn_anime_ru")
      .row()
      .text("🇬🇧 Inglizcha Animelar", "btn_anime_en")
      .text("🔥 TOP-10 Animelar", "btn_top10")
      .row()
      .text("⭐ Premium Obuna", "btn_premium")
      .text("🌐 Tilni o'zgartirish", "btn_change_lang")
      .row()
      .text("📂 Barcha Ro'yxat", "btn_all_list");

    try {
      // assets/bmt.jpg rasmini yuborish
      await ctx.replyWithPhoto(new InputFile('./assets/bmt.jpg'), {
        caption: text,
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    } catch (error) {
      // Rasm fayli topilmasa text shaklida yuboradi
      await ctx.reply(text, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });
    }
  }

  // 2. Tugmalar hodisalarini (callback query) ushlash
  bot.callbackQuery('btn_search_code', async (ctx) => {
    await ctx.reply("🔑 Anime kodi yoki nomini kiriting:");
    await ctx.answerCallbackQuery();
  });

  // Tillar bo'yicha animelar ro'yxatini chiqarish
  bot.callbackQuery(/^btn_anime_(uz|ru|en)$/, async (ctx) => {
    const lang = ctx.match[1];
    const column = `title_${lang}`;

    const { data: animes } = await supabase
      .from('animes')
      .select(`id, code, ${column}`)
      .not(column, 'is', null)
      .limit(10);

    if (!animes || animes.length === 0) {
      await ctx.reply("Ushbu tilda hozircha animelar mavjud emas.");
      return ctx.answerCallbackQuery();
    }

    let msg = `🎬 **${lang.toUpperCase()} tilidagi animelar:**\n\n`;
    const keyboard = new InlineKeyboard();

    animes.forEach((anime, index) => {
      msg += `${index + 1}. **${anime[column]}** — 🔑 Kodi: \`${anime.code}\`\n`;
      keyboard.text(`▶️ ${anime.code}`, `get_anime_${anime.code}`);
      if ((index + 1) % 2 === 0) keyboard.row();
    });

    await ctx.reply(msg, { parse_mode: 'Markdown', reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  // Barcha ro'yxat
  bot.callbackQuery('btn_all_list', async (ctx) => {
    const { data: animes } = await supabase.from('animes').select('code, title_uz').limit(20);

    if (!animes || animes.length === 0) {
      await ctx.reply("Bazada animelar topilmadi.");
      return ctx.answerCallbackQuery();
    }

    let msg = "📂 **Barcha Animelar Ro'yxati:**\n\n";
    animes.forEach(a => {
      msg += `🔹 ${a.title_uz} — 🔑 Kodi: \`${a.code}\`\n`;
    });

    await ctx.reply(msg, { parse_mode: 'Markdown' });
    await ctx.answerCallbackQuery();
  });

  // Tilni o'zgartirish
  bot.callbackQuery('btn_change_lang', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("🇺🇿 O'zbekcha", "set_lang_uz")
      .text("🇷🇺 Русский", "set_lang_ru")
      .text("🇬🇧 English", "set_lang_en");

    await ctx.reply("Tilni tanlang / Select language:", { reply_markup: keyboard });
    await ctx.answerCallbackQuery();
  });

  bot.callbackQuery(/^set_lang_(uz|ru|en)$/, async (ctx) => {
    const lang = ctx.match[1];
    await supabase.from('users').update({ language: lang }).eq('id', ctx.from.id);
    await ctx.answerCallbackQuery("Til o'zgartirildi!");
    await ctx.reply("✅ Til muvaffaqiyatli saqlandi.");
  });
}

// Deep linking orqali va kod bilan anime yuborish
export async function sendAnimeByCode(ctx, code) {
  const { data: anime } = await supabase.from('animes').select('*').eq('code', code).single();

  if (!anime) {
    return ctx.reply("Ushbu kodga tegishli anime topilmadi.");
  }

  // Ko'rishlar sonini oshirish
  await supabase.from('animes').update({ views_count: (anime.views_count || 0) + 1 }).eq('id', anime.id);

  const caption = 
    `🎬 **${anime.title_uz}**\n\n` +
    `🔑 Kodi: \`${anime.code}\`\n` +
    `⭐ Reyting: ${anime.rating_avg || 0}/5 (${anime.reviews_count || 0} ovoz)\n` +
    `👁 Ko'rishlar: ${anime.views_count + 1}\n\n` +
    `${anime.description || ''}`;

  const keyboard = new InlineKeyboard()
    .text("⭐ Baho & Sharh qoldirish", `rate_${anime.id}`);

  await ctx.replyWithVideo(anime.file_id, {
    caption: caption,
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
}