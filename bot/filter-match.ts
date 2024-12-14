import { LiquidityPoolKeysV4 } from "@raydium-io/raydium-sdk";
import { BotConfig } from "../models";
import { PoolFilters } from "../filters";
import { logger, sleep } from "../helpers";

export class FilterMatch{
    public static async filterMatch(poolKeys: LiquidityPoolKeysV4,poolFilters:PoolFilters,config:BotConfig) {
        if (config.filterCheckInterval === 0 ||config.filterCheckDuration === 0) {
          return true;
        }
    
        const timesToCheck =config.filterCheckDuration /config.filterCheckInterval;
        let timesChecked = 0;
        let matchCount = 0;
    
        do {
          try {
            const shouldBuy = await poolFilters.execute(poolKeys);
    
            if (shouldBuy) {
              matchCount++;
    
              if (config.consecutiveMatchCount <= matchCount) {
                logger.debug(
                  { mint: poolKeys.baseMint.toString() },
                  `Filter match ${matchCount}/${config.consecutiveMatchCount}`,
                );
                return true;
              }
            } else {
              matchCount = 0;
            }
    
            await sleep(config.filterCheckInterval);
          } finally {
            timesChecked++;
          }
        } while (timesChecked < timesToCheck);
    
        return false;
      }
}