import { Bot, session } from 'grammy';
import dotenv from 'dotenv';
import { checkSubscription } from './middlewares/checkSub.js';
import { setupStartHandlers } from './handlers/start.js';
import { setupUserHandlers } from './handlers/user.js';
import { setupPaymentHandlers } from './handlers/payment.js';
import { setupAdminHandlers } from './handlers/admin.js';

dotenv.config();

const bot = new Bot(process.env.BOT_TOKEN);

// Session sozlash
bot.use(session({ initial: () => ({}) }));

// Middleware: Obuna va Premium tekshiruvini ulash
bot.use(checkSubscription);

// Handlerlarni ulash
setupStartHandlers(bot);
setupUserHandlers(bot);
setupPaymentHandlers(bot);
setupAdminHandlers(bot);

// Botni ishga tushirish
bot.start({
  onStart: (botInfo) => {
    console.log(`🤖 @${botInfo.username} muvaffaqiyatli ishga tushirildi!`);
  }
});