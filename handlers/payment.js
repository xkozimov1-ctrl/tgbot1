import { InlineKeyboard } from 'grammy';
import { supabase } from '../config/supabase.js';

export function setupPaymentHandlers(bot) {
  bot.command('premium', async (ctx) => {
    const keyboard = new InlineKeyboard()
      .text("💳 Telegram Stars orqali to'lash (100 Stars)", "pay_stars")
      .row()
      .text("💳 Click / Payme orqali to'lov", "pay_card");

    await ctx.reply(
      "⭐ **PREMIUM OBUNA**\n\n" +
      "Narxi: **Haftasiga 5 000 so'm**\n\n" +
      "Imkoniyatlar:\n" +
      "✅ Majburiy obuna va kanallarsiz xizmatdan to'liq foydalanish\n" +
      "✅ Animelarni tekor ko'rish",
      { parse_mode: 'Markdown', reply_markup: keyboard }
    );
  });

  // Telegram In-Invoice (Stars/Invoice shakli)
  bot.callbackQuery('pay_stars', async (ctx) => {
    await ctx.replyWithInvoice(
      "Premium Obuna (1 Hafta)",
      "Botdan majburiy obunasiz foydalanish huquqi",
      "premium_payload",
      "XTR", // Telegram Stars valyutasi
      [{ label: "1 Hafta", amount: 100 }]
    );
    await ctx.answerCallbackQuery();
  });

  bot.on('pre_checkout_query', (ctx) => ctx.answerPreCheckoutQuery(true));

  // To'lov muvaffaqiyatli amalga oshganda
  bot.on('message:successful_payment', async (ctx) => {
    const until = new Date();
    until.setDate(until.getDate() + 7); // +7 kun qo'shish

    await supabase.from('users').update({
      is_premium: true,
      premium_until: until.toISOString()
    }).eq('id', ctx.from.id);

    await ctx.reply("🎉 Tabriklaymiz! Premium obunangiz 1 haftaga faollashtirildi.");
  });
}