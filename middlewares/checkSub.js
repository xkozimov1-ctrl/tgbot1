import { supabase } from '../config/supabase.js';

export async function checkSubscription(ctx, next) {
  const userId = ctx.from.id;

  // 1. Foydalanuvchini bazadan tekshirish
  let { data: user } = await supabase.from('users').select('*').eq('id', userId).single();

  if (!user) {
    const lang = ctx.from.language_code === 'ru' ? 'ru' : ctx.from.language_code === 'en' ? 'en' : 'uz';
    const { data: newUser } = await supabase.from('users').insert([{ id: userId, language: lang }]).select().single();
    user = newUser;
  }

  ctx.session = ctx.session || {};
  ctx.session.user = user;

  // 2. Premium tekshiruvi (muddati o'tmagan bo'lsa majburiy obuna o'tkazib yuboriladi)
  if (user && user.is_premium && new Date(user.premium_until) > new Date()) {
    return next();
  }

  // 3. Obuna tekshirish
  const channels = process.env.REQUIRED_CHANNELS ? process.env.REQUIRED_CHANNELS.split(',') : [];
  let unsubscribed = [];

  for (const channel of channels) {
    try {
      const member = await ctx.api.getChatMember(channel.trim(), userId);
      if (['left', 'kicked'].includes(member.status)) {
        unsubscribed.push(channel.trim());
      }
    } catch (err) {
      console.error(`Kanalni tekshirishda xatolik: ${channel}`, err.message);
    }
  }

  if (unsubscribed.length > 0) {
    const keyboard = unsubscribed.map(ch => [{ text: `A'zo bo'lish ➕`, url: `https://t.me/${ch.replace('@', '')}` }]);
    keyboard.push([{ text: "A'zo bo'ldim ✅", callback_data: "check_sub" }]);

    return ctx.reply(" Botdan foydalanish uchun quyidagi kanallarga obuna bo'ling va **'A'zo bo'ldim'** tugmasini bosing:", {
      reply_markup: { inline_keyboard: keyboard }
    });
  }

  return next();
}