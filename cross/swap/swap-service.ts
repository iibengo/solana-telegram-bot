import {
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  RawAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { logger, NETWORK } from '../../helpers';
import { BotConfig } from '../../models';
import { Liquidity, LiquidityPoolKeysV4, Percent, Token, TokenAmount } from '@raydium-io/raydium-sdk';
import { Connection, Keypair, PublicKey, TransactionMessage, VersionedTransaction } from '@solana/web3.js';
import { TransactionExecutor } from '../../transactions';

export class SwapService {
  private static async swap(
    poolKeys: LiquidityPoolKeysV4,
    ataIn: PublicKey,
    ataOut: PublicKey,
    tokenIn: Token,
    tokenOut: Token,
    amountIn: TokenAmount,
    slippage: number,
    wallet: Keypair,
    direction: 'buy' | 'sell',
    connection: Connection,
    txExecutor: TransactionExecutor,
  ) {
    const slippagePercent = new Percent(slippage, 100);
    const poolInfo = await Liquidity.fetchInfo({
      connection: connection,
      poolKeys,
    });

    const computedAmountOut = Liquidity.computeAmountOut({
      poolKeys,
      poolInfo,
      amountIn,
      currencyOut: tokenOut,
      slippage: slippagePercent,
    });

    const latestBlockhash = await connection.getLatestBlockhash();
    const { innerTransaction } = Liquidity.makeSwapFixedInInstruction(
      {
        poolKeys: poolKeys,
        userKeys: {
          tokenAccountIn: ataIn,
          tokenAccountOut: ataOut,
          owner: wallet.publicKey,
        },
        amountIn: amountIn.raw,
        minAmountOut: computedAmountOut.minAmountOut.raw,
      },
      poolKeys.version,
    );

    const messageV0 = new TransactionMessage({
      payerKey: wallet.publicKey,
      recentBlockhash: latestBlockhash.blockhash,
      instructions: [
        ...(direction === 'buy'
          ? [
              createAssociatedTokenAccountIdempotentInstruction(
                wallet.publicKey,
                ataOut,
                wallet.publicKey,
                tokenOut.mint,
              ),
            ]
          : []),
        ...innerTransaction.instructions,
        ...(direction === 'sell' ? [createCloseAccountInstruction(ataIn, wallet.publicKey, wallet.publicKey)] : []),
      ],
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.sign([wallet, ...innerTransaction.signers]);

    return txExecutor.executeAndConfirm(transaction, wallet, latestBlockhash);
  }

  public static async processBuy(
    poolState: any,
    poolKeys: any,
    mintAta: any,
    connection: Connection,
    txExecutor: TransactionExecutor,
    config: BotConfig,
  ) {
    for (let i = 0; i < config.maxBuyRetries; i++) {
      try {
        logger.info(
          { mint: poolState.baseMint.toString() },
          `Send buy transaction attempt: ${i + 1}/${config.maxBuyRetries}`,
        );
        const tokenOut = new Token(TOKEN_PROGRAM_ID, poolKeys.baseMint, poolKeys.baseDecimals);
     
        const result = await this.swap(
          poolKeys,
          config.quoteAta,
          mintAta,
          config.quoteToken,
          tokenOut,
          config.quoteAmount,
          config.buySlippage,
          config.wallet,
          'buy',
          connection,
          txExecutor,
        );

        if (result.confirmed) {
          logger.info(
            {
              mint: poolState.baseMint.toString(),
              signature: result.signature,
              url: `https://solscan.io/tx/${result.signature}?cluster=${NETWORK}`,
            },
            `Confirmed buy tx`,
          );

          break;
        }

        logger.info(
          {
            mint: poolState.baseMint.toString(),
            signature: result.signature,
            error: result.error,
          },
          `Error confirming buy tx`,
        );
      } catch (error) {
        logger.debug({ mint: poolState.baseMint.toString(), error }, `Error confirming buy transaction`);
      }
    }
  }
  public static async processSell(
    rawAccount:RawAccount,
    poolKeys:LiquidityPoolKeysV4,
    accountId:PublicKey,
    tokenIn:Token,
    tokenAmountIn:TokenAmount,
    connection: Connection,
    txExecutor: TransactionExecutor,
    config:BotConfig
  ) {
    logger.info({ mint: rawAccount.mint }, `Send sell transaction attempt `);

    const result = await this.swap(
      poolKeys,
      accountId,
      config.quoteAta,
      tokenIn,
      config.quoteToken,
      tokenAmountIn,
      config.sellSlippage,
      config.wallet,
      'sell',
      connection,
      txExecutor
    );

    if (result.confirmed) {
      logger.info(
        {
          dex: `https://dexscreener.com/solana/${rawAccount.mint.toString()}?maker=${config.wallet.publicKey}`,
          mint: rawAccount.mint.toString(),
          signature: result.signature,
          url: `https://solscan.io/tx/${result.signature}?cluster=${NETWORK}`,
        },
        `Confirmed sell tx`,
      );
    } else {
      logger.info(
        {
          mint: rawAccount.mint.toString(),
          signature: result.signature,
          error: result.error,
        },
        `Error confirming sell tx`,
      );
    }
  }
}
