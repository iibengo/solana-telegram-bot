import {
  Connection,
  PublicKey,
} from '@solana/web3.js';
import {
  getAccount,
  getAssociatedTokenAddress,
  RawAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import {  LiquidityPoolKeysV4, LiquidityStateV4, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { MarketCache, PoolCache, SnipeListCache } from './cache';
import { PoolFilters } from './filters';
import { TransactionExecutor } from './transactions';
import { createPoolKeys, logger, sleep } from './helpers';
import { Mutex } from 'async-mutex';
import { WarpTransactionExecutor } from './transactions/warp-transaction-executor';
import { JitoTransactionExecutor } from './transactions/jito-rpc-transaction-executor';
import { TelegramService } from './telegram';
import { BotConfig } from './models';
import { SwapService } from './cross/swap';
import { FilterMatch } from './bot/filter-match';
import { PriceMatch } from './bot/price-match';

export class Bot {
  private readonly poolFilters: PoolFilters;

  // snipe list
  private readonly snipeListCache?: SnipeListCache;

  // one token at the time
  private readonly mutex: Mutex;
  private sellExecutionCount = 0;
  public readonly isWarp: boolean = false;
  public readonly isJito: boolean = false;

  constructor(
    private readonly connection: Connection,
    private readonly marketStorage: MarketCache,
    private readonly poolStorage: PoolCache,
    private readonly txExecutor: TransactionExecutor,
    readonly config: BotConfig,
  ) {
    this.isWarp = txExecutor instanceof WarpTransactionExecutor;
    this.isJito = txExecutor instanceof JitoTransactionExecutor;

    this.mutex = new Mutex();
    this.poolFilters = new PoolFilters(connection, {
      quoteToken: this.config.quoteToken,
      minPoolSize: this.config.minPoolSize,
      maxPoolSize: this.config.maxPoolSize,
    });

    if (this.config.useSnipeList) {
      this.snipeListCache = new SnipeListCache();
      this.snipeListCache.init();
    }
  }

  async validate() {
    try {
      await getAccount(this.connection, this.config.quoteAta, this.connection.commitment);
    } catch (error) {
      logger.error(
        `${this.config.quoteToken.symbol} token account not found in wallet: ${this.config.wallet.publicKey.toString()}`,
      );
      return false;
    }

    return true;
  }

  public async buy(accountId: PublicKey, poolState: LiquidityStateV4) {
    logger.trace({ mint: poolState.baseMint }, `Processing new pool...`);

    if (this.config.useSnipeList && !this.snipeListCache?.isInList(poolState.baseMint.toString())) {
      logger.debug({ mint: poolState.baseMint.toString() }, `Skipping buy because token is not in a snipe list`);
      return;
    }

    if (this.config.autoBuyDelay > 0) {
      logger.debug({ mint: poolState.baseMint }, `Waiting for ${this.config.autoBuyDelay} ms before buy`);
      await sleep(this.config.autoBuyDelay);
    }

    if (this.config.oneTokenAtATime) {
      if (this.mutex.isLocked() || this.sellExecutionCount > 0) {
        logger.debug(
          { mint: poolState.baseMint.toString() },
          `Skipping buy because one token at a time is turned on and token is already being processed`,
        );
        return;
      }

      await this.mutex.acquire();
    }

    try {
      const [market, mintAta] = await Promise.all([
        this.marketStorage.get(poolState.marketId.toString()),
        getAssociatedTokenAddress(poolState.baseMint, this.config.wallet.publicKey),
      ]);
      const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(accountId, poolState, market);

      if (!this.config.useSnipeList) {
        const match = await FilterMatch.filterMatch(poolKeys,this.poolFilters,this.config);

        if (!match) {
          logger.trace({ mint: poolKeys.baseMint.toString() }, `Skipping buy because pool doesn't match filters`);
          return;
        }
      }

      const msgBot = `
          🆕 ${poolKeys.baseMint.toString()} 
          📊  https://www.dextools.io/app/es/solana/pair-explorer/${poolKeys.baseMint.toString()}
          🔄  https://raydium.io/swap/?inputMint=${poolKeys.baseMint.toString()}&outputMint=sol
          🛡️  https://rugcheck.xyz/tokens/${poolKeys.baseMint.toString()}
        `;
      //  TelegramService.sendMessage(msgBot)

      await SwapService.processBuy(poolState,poolKeys,mintAta,this.connection,this.txExecutor,this.config)
    } catch (error) {
      logger.error({ mint: poolState.baseMint.toString(), error }, `Failed to buy token`);
    } finally {
      if (this.config.oneTokenAtATime) {
        this.mutex.release();
      }
    }
  }
  public async sell(accountId: PublicKey, rawAccount: RawAccount) {
    let shouldSell = false;
    let sellExecutionCount = 1;
    do {
      if (this.config.oneTokenAtATime) {
        this.sellExecutionCount++;
      }

      try {
        logger.trace({ mint: rawAccount.mint }, `Processing new token...`);

        const poolData = await this.poolStorage.get(rawAccount.mint.toString());

        if (!poolData) {
          logger.trace({ mint: rawAccount.mint.toString() }, `Token pool data is not found, can't sell`);
          return;
        }

        const tokenIn = new Token(TOKEN_PROGRAM_ID, poolData.state.baseMint, poolData.state.baseDecimal.toNumber());
        const tokenAmountIn = new TokenAmount(tokenIn, rawAccount.amount, true);

        if (tokenAmountIn.isZero()) {
          logger.info({ mint: rawAccount.mint.toString() }, `Empty balance, can't sell`);
          return;
        }

        const market = await this.marketStorage.get(poolData.state.marketId.toString());
        const poolKeys: LiquidityPoolKeysV4 = createPoolKeys(new PublicKey(poolData.id), poolData.state, market);

        shouldSell = await PriceMatch.priceMatch(tokenAmountIn, poolKeys,this.connection,this.config);
       if (shouldSell) {
          try {
            await SwapService.processSell(
              rawAccount,
              poolKeys,
              accountId,
              tokenIn,
              tokenAmountIn,
              this.connection,
              this.txExecutor,
              this.config,
            );
          } catch (error) {
            logger.debug({ mint: rawAccount.mint.toString(), error }, `Error confirming sell transaction`);
          }
        }
      } catch (error) {
        logger.error({ mint: rawAccount.mint.toString(), error }, `Failed to sell token`);
      } finally {
        if (this.config.oneTokenAtATime) {
          this.sellExecutionCount--;
        }
        sellExecutionCount++;
      }
      if (this.config.autoSellDelay > 0) {
        logger.debug({ mint: rawAccount.mint }, `Waiting for ${this.config.autoSellDelay} ms before sell`);
        await sleep(this.config.autoSellDelay);
      }
    } while (!shouldSell || this.config.maxSellRetries > sellExecutionCount);
  }
}
