/**
 * Economy Module
 * Multi-Agent Economy Engine for AgentOS
 */

export { BudgetLedger } from './budget-ledger';
export { AgentCredits } from './agent-credits';
export { BiddingEngine } from './bidding-engine';
export { MarketMaker } from './market-maker';

// Re-export types
export type {
  LedgerAccount,
  LedgerTransaction,
  Budget,
  AllocationRule,
  LedgerReport,
} from './budget-ledger';

export type {
  AgentCreditAccount,
  CreditEvent,
  RewardRule,
  PenaltyRule,
  CreditLeaderboard,
} from './agent-credits';

export type {
  Auction,
  AuctionItem,
  Bid,
  BidderProfile,
  Market,
  AuctionType,
  AuctionStatus,
} from './bidding-engine';

export type {
  Order,
  Trade,
  OrderBook,
  MarketQuote,
  LiquidityPool,
  PriceHistory,
} from './market-maker';
