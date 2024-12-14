import { TELEGRAM_PK, TELEGRAM_CHAT_ID } from '../helpers';
import telegram from 'node-telegram-bot-api';

export class TelegramService {
  private static _sendMessage(message: string) {
    const tbot = new telegram(TELEGRAM_PK, { polling: true }); //id 5923575999
    tbot.sendMessage(TELEGRAM_CHAT_ID, message);
  }
  public static sendStartMessage() {
    const message = `
        📢 Iniciando bot, buscando nuevos tokens... 
      
          ℹ️ Filtros:
      
            🟢 Check if Freezable: Y
            🟢 Check Mint renounced: Y
            🔴 Check if Mutable: N
            🔴 Check if Burned: N
            🔴 Check Socials: N
            💰 Min pool size: 3.1 
            💰 Max pool size: 75 
              `;

    this._sendMessage(message);
  }
  public static sendMessage(message:string) {
    this._sendMessage(message);
  }
}
