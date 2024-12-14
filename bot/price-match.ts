import { Liquidity, LiquidityPoolKeysV4, Percent, TokenAmount } from "@raydium-io/raydium-sdk";
import { BotConfig } from "../models";
import BN from "bn.js";
import { logger, sleep } from "../helpers";
import { Connection } from "@solana/web3.js";

export class PriceMatch{
    public static async priceMatch(amountIn: TokenAmount, poolKeys: LiquidityPoolKeysV4,connection:Connection,config:BotConfig): Promise<boolean> {
      if (config.priceCheckDuration === 0 || config.priceCheckInterval === 0) {
          return false;
        }
    
        const timesToCheck = config.priceCheckDuration / config.priceCheckInterval;
        let shouldSell = false;
        const profitFraction = config.quoteAmount.mul(config.takeProfit).numerator.div(new BN(100));
        const profitAmount = new TokenAmount(config.quoteToken, profitFraction, true);
        const takeProfit = config.quoteAmount.add(profitAmount);
    
        const lossFraction = config.quoteAmount.mul(config.stopLoss).numerator.div(new BN(100));
        const lossAmount = new TokenAmount(config.quoteToken, lossFraction, true);
        const stopLoss = config.quoteAmount.subtract(lossAmount);
        const slippage = new Percent(config.sellSlippage, 100);
        let timesChecked = 0;
        do {
          try {
            const poolInfo = await Liquidity.fetchInfo({
              connection: connection,
              poolKeys,
            });
            const amountOut = Liquidity.computeAmountOut({
              poolKeys,
              poolInfo,
              amountIn: amountIn,
              currencyOut: config.quoteToken,
              slippage,
            }).amountOut;
        
            logger.debug(
              { mint: poolKeys.baseMint.toString() },
              `Take profit: ${takeProfit.toFixed()} | Stop loss: ${stopLoss.toFixed()} | Current: ${amountOut.toFixed()}`,
            );
            if (amountOut.lt(stopLoss)) {
              return true;
            }
    
            if (amountOut.gt(takeProfit)) {
              return true;
            }
           await sleep(config.priceCheckInterval);
          } catch (e) {
            logger.trace({ mint: poolKeys.baseMint.toString(), e }, `Failed to check token price`);
          } finally {
            timesChecked++;
          }
        
        } while (timesChecked < timesToCheck);
        return shouldSell;
      }
}