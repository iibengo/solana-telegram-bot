import { Token, TokenAmount } from "@raydium-io/raydium-sdk";
import { Keypair, PublicKey } from "@solana/web3.js";

export  interface BotConfig {
  wallet: Keypair;
  checkMutable: boolean;
  checkRenounced: boolean;
  checkFreezable: boolean;
  checkBurned: boolean;
  minPoolSize: TokenAmount;
  maxPoolSize: TokenAmount;
  quoteToken: Token;
  quoteAmount: TokenAmount;
  quoteAta: PublicKey;
  oneTokenAtATime: boolean;
  useSnipeList: boolean;
  autoSell: boolean;
  autoBuyDelay: number;
  telegramChatId: string;
  autoSellDelay: number;
  maxBuyRetries: number;
  maxSellRetries: number;
  unitLimit: number;
  unitPrice: number;
  takeProfit: number;
  stopLoss: number;
  buySlippage: number;
  sellSlippage: number;
  priceCheckInterval: number;
  priceCheckDuration: number;
  filterCheckInterval: number;
  filterCheckDuration: number;
  consecutiveMatchCount: number;
}