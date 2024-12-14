import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import {
  CHECK_IF_MINT_IS_RENOUNCED,
  PRIVATE_KEY,
  CHECK_IF_FREEZABLE,
  CHECK_IF_MUTABLE,
  MIN_POOL_SIZE,
  MAX_POOL_SIZE,
  QUOTE_AMOUNT,
  ONE_TOKEN_AT_A_TIME,
  MAX_SELL_RETRIES,
  AUTO_BUY_DELAY,
  AUTO_SELL,
  AUTO_SELL_DELAY,
  BUY_SLIPPAGE,
  CHECK_IF_BURNED,
  COMPUTE_UNIT_LIMIT,
  COMPUTE_UNIT_PRICE,
  CONSECUTIVE_FILTER_MATCHES,
  FILTER_CHECK_DURATION,
  FILTER_CHECK_INTERVAL,
  getWallet,
  MAX_BUY_RETRIES,
  PRICE_CHECK_DURATION,
  PRICE_CHECK_INTERVAL,
  SELL_SLIPPAGE,
  STOP_LOSS,
  TAKE_PROFIT,
  USE_SNIPE_LIST,
  getToken,
  QUOTE_MINT,
  TELEGRAM_CHAT_ID
} from '../helpers';
import { TokenAmount } from '@raydium-io/raydium-sdk';

export class BotConfigService {
  public static getBotConfig() {
    const wallet = getWallet(PRIVATE_KEY.trim());
    const quoteToken = getToken(QUOTE_MINT);
    return {
      wallet,
      quoteAta: getAssociatedTokenAddressSync(quoteToken.mint, wallet.publicKey),
      checkMutable: CHECK_IF_MUTABLE,
      checkRenounced: CHECK_IF_MINT_IS_RENOUNCED,
      checkFreezable: CHECK_IF_FREEZABLE,
      checkBurned: CHECK_IF_BURNED,
      minPoolSize: new TokenAmount(quoteToken, MIN_POOL_SIZE, false),
      maxPoolSize: new TokenAmount(quoteToken, MAX_POOL_SIZE, false),
      quoteToken,
      quoteAmount: new TokenAmount(quoteToken, QUOTE_AMOUNT, false),
      oneTokenAtATime: ONE_TOKEN_AT_A_TIME,
      useSnipeList: USE_SNIPE_LIST,
      autoSell: AUTO_SELL,
      autoSellDelay: AUTO_SELL_DELAY,
      maxSellRetries: MAX_SELL_RETRIES,
      autoBuyDelay: AUTO_BUY_DELAY,
      maxBuyRetries: MAX_BUY_RETRIES,
      unitLimit: COMPUTE_UNIT_LIMIT,
      unitPrice: COMPUTE_UNIT_PRICE,
      takeProfit: TAKE_PROFIT,
      telegramChatId:TELEGRAM_CHAT_ID,
      stopLoss: STOP_LOSS,
      buySlippage: BUY_SLIPPAGE,
      sellSlippage: SELL_SLIPPAGE,
      priceCheckInterval: PRICE_CHECK_INTERVAL,
      priceCheckDuration: PRICE_CHECK_DURATION,
      filterCheckInterval: FILTER_CHECK_INTERVAL,
      filterCheckDuration: FILTER_CHECK_DURATION,
      consecutiveMatchCount: CONSECUTIVE_FILTER_MATCHES,
    };
  }
}
