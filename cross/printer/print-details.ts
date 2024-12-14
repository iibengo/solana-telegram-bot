import { Keypair } from "@solana/web3.js";
import { Bot } from "../../bot";
import { Token } from "@raydium-io/raydium-sdk";
import { AUTO_SELL, CACHE_NEW_MARKETS, CUSTOM_FEE, LOG_LEVEL, logger, PRE_LOAD_EXISTING_MARKETS, SNIPE_LIST_REFRESH_INTERVAL, TRANSACTION_EXECUTOR } from "../../helpers";
import { version } from '../../package.json';

export const printDetails =(wallet: Keypair, quoteToken: Token, bot: Bot) =>{
    logger.info(`  
                                          ..   :-===++++-     
                                  .-==+++++++- =+++++++++-    
              ..:::--===+=.=:     .+++++++++++:=+++++++++:    
      .==+++++++++++++++=:+++:    .+++++++++++.=++++++++-.    
      .-+++++++++++++++=:=++++-   .+++++++++=:.=+++++-::-.    
       -:+++++++++++++=:+++++++-  .++++++++-:- =+++++=-:      
        -:++++++=++++=:++++=++++= .++++++++++- =+++++:        
         -:++++-:=++=:++++=:-+++++:+++++====--:::::::.        
          ::=+-:::==:=+++=::-:--::::::::::---------::.        
           ::-:  .::::::::.  --------:::..                    
            :-    .:.-:::.                                    
  
            WARP DRIVE ACTIVATED 🚀🐟
            Made with ❤️ by humans.
            Version: ${version}                                          
    `);
  
    const botConfig = bot.config;
  
    logger.info('------- CONFIGURATION START -------');
    logger.info(`Wallet: ${wallet.publicKey.toString()}`);
  
    logger.info('- Bot -');
  
    logger.info(
      `Using ${TRANSACTION_EXECUTOR} executer: ${bot.isWarp || bot.isJito || (TRANSACTION_EXECUTOR === 'default' ? true : false)}`,
    );
    if (bot.isWarp || bot.isJito) {
      logger.info(`${TRANSACTION_EXECUTOR} fee: ${CUSTOM_FEE}`);
    } else {
      logger.info(`Compute Unit limit: ${botConfig.unitLimit}`);
      logger.info(`Compute Unit price (micro lamports): ${botConfig.unitPrice}`);
    }
  
    logger.info(`Single token at the time: ${botConfig.oneTokenAtATime}`);
    logger.info(`Pre load existing markets: ${PRE_LOAD_EXISTING_MARKETS}`);
    logger.info(`Cache new markets: ${CACHE_NEW_MARKETS}`);
    logger.info(`Log level: ${LOG_LEVEL}`);
  
    logger.info('- Buy -');
    logger.info(`Buy amount: ${botConfig.quoteAmount.toFixed()} ${botConfig.quoteToken.name}`);
    logger.info(`Auto buy delay: ${botConfig.autoBuyDelay} ms`);
    logger.info(`Max buy retries: ${botConfig.maxBuyRetries}`);
    logger.info(`Buy amount (${quoteToken.symbol}): ${botConfig.quoteAmount.toFixed()}`);
    logger.info(`Buy slippage: ${botConfig.buySlippage}%`);
  
    logger.info('- Sell -');
    logger.info(`Auto sell: ${AUTO_SELL}`);
    logger.info(`Auto sell delay: ${botConfig.autoSellDelay} ms`);
    logger.info(`Max sell retries: ${botConfig.maxSellRetries}`);
    logger.info(`Sell slippage: ${botConfig.sellSlippage}%`);
    logger.info(`Price check interval: ${botConfig.priceCheckInterval} ms`);
    logger.info(`Price check duration: ${botConfig.priceCheckDuration} ms`);
    logger.info(`Take profit: ${botConfig.takeProfit}%`);
    logger.info(`Stop loss: ${botConfig.stopLoss}%`);
  
    logger.info('- Snipe list -');
    logger.info(`Snipe list: ${botConfig.useSnipeList}`);
    logger.info(`Snipe list refresh interval: ${SNIPE_LIST_REFRESH_INTERVAL} ms`);
  
    if (botConfig.useSnipeList) {
      logger.info('- Filters -');
      logger.info(`Filters are disabled when snipe list is on`);
    } else {
      logger.info('- Filters -');
      logger.info(`Filter check interval: ${botConfig.filterCheckInterval} ms`);
      logger.info(`Filter check duration: ${botConfig.filterCheckDuration} ms`);
      logger.info(`Consecutive filter matches: ${botConfig.consecutiveMatchCount}`);
      logger.info(`Check renounced: ${botConfig.checkRenounced}`);
      logger.info(`Check freezable: ${botConfig.checkFreezable}`);
      logger.info(`Check burned: ${botConfig.checkBurned}`);
      logger.info(`Min pool size: ${botConfig.minPoolSize.toFixed()}`);
      logger.info(`Max pool size: ${botConfig.maxPoolSize.toFixed()}`);
    }
  
    logger.info('------- CONFIGURATION END -------');
  
    logger.info('Bot is running! Press CTRL + C to stop it.');
  }