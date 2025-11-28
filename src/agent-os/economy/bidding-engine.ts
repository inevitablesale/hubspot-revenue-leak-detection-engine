/**
 * Bidding Engine Module
 * Enables agents to bid for actions and compete for optimal task allocation
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Bidding Engine Types
// ============================================================

export type AuctionType = 'first_price' | 'second_price' | 'dutch' | 'sealed_bid';
export type AuctionStatus = 'pending' | 'open' | 'closed' | 'cancelled' | 'settled';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'withdrawn' | 'won' | 'lost';

export interface Auction {
  id: string;
  type: AuctionType;
  status: AuctionStatus;
  item: AuctionItem;
  config: AuctionConfig;
  bids: Bid[];
  winner?: AuctionWinner;
  metrics: AuctionMetrics;
  createdAt: Date;
  openedAt?: Date;
  closedAt?: Date;
}

export interface AuctionItem {
  id: string;
  type: 'task' | 'resource' | 'signal' | 'priority' | 'capability';
  name: string;
  description: string;
  value: number;
  properties: Record<string, unknown>;
  requirements: ItemRequirement[];
}

export interface ItemRequirement {
  capability: string;
  minLevel: number;
  mandatory: boolean;
}

export interface AuctionConfig {
  startTime: Date;
  endTime: Date;
  reservePrice: number;
  minBidIncrement: number;
  maxBids: number;
  allowedBidders: string[];
  autoExtend: boolean;
  extensionDuration: number;
  settlementPeriod: number;
}

export interface Bid {
  id: string;
  auctionId: string;
  bidderId: string;
  bidderName: string;
  amount: number;
  status: BidStatus;
  qualifications: BidQualification[];
  strategy?: BidStrategy;
  metadata: BidMetadata;
  submittedAt: Date;
  processedAt?: Date;
}

export interface BidQualification {
  capability: string;
  level: number;
  verified: boolean;
}

export interface BidStrategy {
  type: 'aggressive' | 'conservative' | 'roi_optimized' | 'market_share';
  maxBid: number;
  increments: number;
  riskTolerance: number;
}

export interface BidMetadata {
  estimatedValue: number;
  expectedROI: number;
  confidence: number;
  competitorAnalysis?: CompetitorAnalysis;
}

export interface CompetitorAnalysis {
  expectedBidders: number;
  avgHistoricalBid: number;
  myWinRate: number;
}

export interface AuctionWinner {
  bidderId: string;
  bidderName: string;
  winningBid: number;
  pricePaid: number;
  settledAt?: Date;
}

export interface AuctionMetrics {
  totalBids: number;
  uniqueBidders: number;
  highestBid: number;
  lowestBid: number;
  avgBid: number;
  bidVelocity: number;
  competitionLevel: number;
}

export interface Market {
  id: string;
  name: string;
  type: 'task' | 'resource' | 'signal';
  status: 'active' | 'paused' | 'closed';
  auctions: string[];
  stats: MarketStats;
  config: MarketConfig;
}

export interface MarketStats {
  totalAuctions: number;
  completedAuctions: number;
  totalVolume: number;
  avgClearingPrice: number;
  participationRate: number;
  liquidity: number;
}

export interface MarketConfig {
  minAuctionDuration: number;
  maxAuctionDuration: number;
  feePercentage: number;
  defaultAuctionType: AuctionType;
}

export interface BidderProfile {
  id: string;
  agentId: string;
  name: string;
  capabilities: BidQualification[];
  creditBalance: number;
  bidHistory: BidHistoryEntry[];
  stats: BidderStats;
  strategy: BidderStrategy;
}

export interface BidHistoryEntry {
  auctionId: string;
  bidAmount: number;
  won: boolean;
  pricePaid?: number;
  roi?: number;
  timestamp: Date;
}

export interface BidderStats {
  totalBids: number;
  totalWins: number;
  winRate: number;
  avgBid: number;
  avgROI: number;
  totalSpent: number;
  totalValue: number;
}

export interface BidderStrategy {
  preferredAuctionTypes: AuctionType[];
  maxBidPercentOfValue: number;
  minROIThreshold: number;
  riskProfile: 'low' | 'medium' | 'high';
}

// ============================================================
// Bidding Engine Implementation
// ============================================================

export class BiddingEngine {
  private auctions: Map<string, Auction> = new Map();
  private markets: Map<string, Market> = new Map();
  private bidders: Map<string, BidderProfile> = new Map();
  private processingInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeMarkets();
  }

  /**
   * Initialize default markets
   */
  private initializeMarkets(): void {
    // Task market
    this.createMarket({
      name: 'Task Allocation',
      type: 'task',
      config: {
        minAuctionDuration: 10000,
        maxAuctionDuration: 3600000,
        feePercentage: 1,
        defaultAuctionType: 'second_price',
      },
    });

    // Resource market
    this.createMarket({
      name: 'Resource Allocation',
      type: 'resource',
      config: {
        minAuctionDuration: 5000,
        maxAuctionDuration: 1800000,
        feePercentage: 0.5,
        defaultAuctionType: 'first_price',
      },
    });

    // Signal market
    this.createMarket({
      name: 'Signal Priority',
      type: 'signal',
      config: {
        minAuctionDuration: 1000,
        maxAuctionDuration: 60000,
        feePercentage: 2,
        defaultAuctionType: 'dutch',
      },
    });
  }

  /**
   * Create a new market
   */
  createMarket(params: {
    name: string;
    type: Market['type'];
    config: MarketConfig;
  }): Market {
    const market: Market = {
      id: generateId(),
      name: params.name,
      type: params.type,
      status: 'active',
      auctions: [],
      stats: {
        totalAuctions: 0,
        completedAuctions: 0,
        totalVolume: 0,
        avgClearingPrice: 0,
        participationRate: 0,
        liquidity: 0.5,
      },
      config: params.config,
    };

    this.markets.set(market.id, market);
    return market;
  }

  /**
   * Create an auction
   */
  createAuction(params: {
    marketId: string;
    item: Omit<AuctionItem, 'id'>;
    config?: Partial<AuctionConfig>;
    type?: AuctionType;
  }): Auction {
    const market = this.markets.get(params.marketId);
    if (!market) {
      throw new Error(`Market '${params.marketId}' not found`);
    }

    const now = new Date();
    const defaultDuration = (market.config.minAuctionDuration + market.config.maxAuctionDuration) / 2;

    const auction: Auction = {
      id: generateId(),
      type: params.type || market.config.defaultAuctionType,
      status: 'pending',
      item: {
        id: generateId(),
        ...params.item,
      },
      config: {
        startTime: now,
        endTime: new Date(now.getTime() + defaultDuration),
        reservePrice: params.item.value * 0.5,
        minBidIncrement: params.item.value * 0.01,
        maxBids: 100,
        allowedBidders: [],
        autoExtend: true,
        extensionDuration: 30000,
        settlementPeriod: 60000,
        ...params.config,
      },
      bids: [],
      metrics: {
        totalBids: 0,
        uniqueBidders: 0,
        highestBid: 0,
        lowestBid: Infinity,
        avgBid: 0,
        bidVelocity: 0,
        competitionLevel: 0,
      },
      createdAt: now,
    };

    this.auctions.set(auction.id, auction);
    market.auctions.push(auction.id);
    market.stats.totalAuctions++;

    return auction;
  }

  /**
   * Open an auction for bidding
   */
  openAuction(auctionId: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) {
      throw new Error(`Auction '${auctionId}' not found`);
    }

    if (auction.status !== 'pending') {
      throw new Error(`Auction is not in pending status`);
    }

    auction.status = 'open';
    auction.openedAt = new Date();
    auction.config.startTime = new Date();
    auction.config.endTime = new Date(Date.now() + (auction.config.endTime.getTime() - auction.config.startTime.getTime()));

    return auction;
  }

  /**
   * Submit a bid
   */
  submitBid(params: {
    auctionId: string;
    bidderId: string;
    amount: number;
    qualifications?: BidQualification[];
    strategy?: BidStrategy;
    metadata?: Partial<BidMetadata>;
  }): Bid {
    const auction = this.auctions.get(params.auctionId);
    if (!auction) {
      throw new Error(`Auction '${params.auctionId}' not found`);
    }

    if (auction.status !== 'open') {
      throw new Error('Auction is not open for bidding');
    }

    // Check if auction has ended
    if (new Date() > auction.config.endTime) {
      throw new Error('Auction has ended');
    }

    // Check bid constraints
    if (params.amount < auction.config.reservePrice) {
      throw new Error(`Bid must be at least ${auction.config.reservePrice}`);
    }

    const currentHighest = auction.metrics.highestBid;
    if (currentHighest > 0 && params.amount < currentHighest + auction.config.minBidIncrement) {
      throw new Error(`Bid must be at least ${currentHighest + auction.config.minBidIncrement}`);
    }

    // Check allowed bidders
    if (auction.config.allowedBidders.length > 0 && 
        !auction.config.allowedBidders.includes(params.bidderId)) {
      throw new Error('Bidder not allowed for this auction');
    }

    // Get bidder profile
    let bidder = this.bidders.get(params.bidderId);
    if (!bidder) {
      bidder = this.createBidderProfile(params.bidderId, `Agent ${params.bidderId.slice(0, 8)}`);
    }

    const bid: Bid = {
      id: generateId(),
      auctionId: params.auctionId,
      bidderId: params.bidderId,
      bidderName: bidder.name,
      amount: params.amount,
      status: 'pending',
      qualifications: params.qualifications || bidder.capabilities,
      strategy: params.strategy,
      metadata: {
        estimatedValue: auction.item.value,
        expectedROI: (auction.item.value - params.amount) / params.amount,
        confidence: 0.7,
        ...params.metadata,
      },
      submittedAt: new Date(),
    };

    // Validate qualifications
    const qualified = this.validateQualifications(bid.qualifications, auction.item.requirements);
    if (!qualified) {
      bid.status = 'rejected';
      bid.processedAt = new Date();
      this.auctions.get(params.auctionId)!.bids.push(bid);
      return bid;
    }

    // Process bid based on auction type
    this.processBid(auction, bid);

    // Update metrics
    this.updateAuctionMetrics(auction);

    // Auto-extend if needed
    if (auction.config.autoExtend) {
      const timeRemaining = auction.config.endTime.getTime() - Date.now();
      if (timeRemaining < auction.config.extensionDuration) {
        auction.config.endTime = new Date(Date.now() + auction.config.extensionDuration);
      }
    }

    return bid;
  }

  /**
   * Process a bid based on auction type
   */
  private processBid(auction: Auction, bid: Bid): void {
    switch (auction.type) {
      case 'first_price':
      case 'sealed_bid':
        bid.status = 'pending';
        break;
      case 'second_price':
        bid.status = 'pending';
        break;
      case 'dutch':
        // In Dutch auction, first valid bid wins immediately
        bid.status = 'won';
        auction.status = 'closed';
        auction.closedAt = new Date();
        auction.winner = {
          bidderId: bid.bidderId,
          bidderName: bid.bidderName,
          winningBid: bid.amount,
          pricePaid: bid.amount,
        };
        break;
    }

    auction.bids.push(bid);
    bid.processedAt = new Date();

    // Update bidder history
    const bidder = this.bidders.get(bid.bidderId);
    if (bidder) {
      bidder.bidHistory.push({
        auctionId: auction.id,
        bidAmount: bid.amount,
        won: bid.status === 'won',
        pricePaid: bid.status === 'won' ? bid.amount : undefined,
        timestamp: new Date(),
      });
      this.updateBidderStats(bidder);
    }
  }

  /**
   * Close an auction and determine winner
   */
  closeAuction(auctionId: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) {
      throw new Error(`Auction '${auctionId}' not found`);
    }

    if (auction.status === 'closed' || auction.status === 'settled') {
      return auction;
    }

    auction.status = 'closed';
    auction.closedAt = new Date();

    // Determine winner based on auction type
    if (auction.bids.length === 0) {
      auction.status = 'cancelled';
      return auction;
    }

    const validBids = auction.bids.filter(b => b.status === 'pending');
    if (validBids.length === 0) {
      auction.status = 'cancelled';
      return auction;
    }

    // Sort by amount descending
    validBids.sort((a, b) => b.amount - a.amount);
    const highestBid = validBids[0];
    const secondHighestBid = validBids[1];

    let pricePaid: number;
    switch (auction.type) {
      case 'second_price':
        pricePaid = secondHighestBid ? secondHighestBid.amount : highestBid.amount;
        break;
      case 'first_price':
      case 'sealed_bid':
      default:
        pricePaid = highestBid.amount;
    }

    auction.winner = {
      bidderId: highestBid.bidderId,
      bidderName: highestBid.bidderName,
      winningBid: highestBid.amount,
      pricePaid,
    };

    // Update bid statuses
    for (const bid of auction.bids) {
      if (bid.id === highestBid.id) {
        bid.status = 'won';
      } else if (bid.status === 'pending') {
        bid.status = 'lost';
      }
    }

    // Update bidder histories
    for (const bid of auction.bids) {
      const bidder = this.bidders.get(bid.bidderId);
      if (bidder) {
        const historyEntry = bidder.bidHistory.find(h => h.auctionId === auctionId);
        if (historyEntry) {
          historyEntry.won = bid.status === 'won';
          historyEntry.pricePaid = bid.status === 'won' ? pricePaid : undefined;
          historyEntry.roi = bid.status === 'won' 
            ? (auction.item.value - pricePaid) / pricePaid 
            : undefined;
        }
        this.updateBidderStats(bidder);
      }
    }

    // Update market stats
    this.updateMarketStats(auction);

    return auction;
  }

  /**
   * Settle an auction (transfer credits/items)
   */
  settleAuction(auctionId: string): Auction {
    const auction = this.auctions.get(auctionId);
    if (!auction) {
      throw new Error(`Auction '${auctionId}' not found`);
    }

    if (auction.status !== 'closed' || !auction.winner) {
      throw new Error('Auction must be closed with a winner to settle');
    }

    auction.status = 'settled';
    auction.winner.settledAt = new Date();

    // Update bidder stats
    const winner = this.bidders.get(auction.winner.bidderId);
    if (winner) {
      winner.stats.totalSpent += auction.winner.pricePaid;
      winner.stats.totalValue += auction.item.value;
    }

    return auction;
  }

  /**
   * Generate bid recommendation for an agent
   */
  generateBidRecommendation(
    bidderId: string,
    auctionId: string
  ): {
    recommendedBid: number;
    maxBid: number;
    expectedROI: number;
    confidence: number;
    strategy: string;
  } {
    const auction = this.auctions.get(auctionId);
    const bidder = this.bidders.get(bidderId);

    if (!auction) throw new Error(`Auction '${auctionId}' not found`);

    const itemValue = auction.item.value;
    const currentHigh = auction.metrics.highestBid;
    const avgMarketBid = this.getAverageMarketBid(auction.item.type);
    
    // Calculate based on bidder strategy or defaults
    const maxBidPercent = bidder?.strategy.maxBidPercentOfValue || 0.8;
    const minROI = bidder?.strategy.minROIThreshold || 0.1;
    
    const maxBid = itemValue * maxBidPercent;
    const minBid = currentHigh > 0 
      ? currentHigh + auction.config.minBidIncrement 
      : auction.config.reservePrice;

    // Calculate recommended bid
    let recommendedBid: number;
    const riskProfile = bidder?.strategy.riskProfile || 'medium';

    switch (riskProfile) {
      case 'low':
        recommendedBid = Math.min(avgMarketBid * 0.9, maxBid);
        break;
      case 'high':
        recommendedBid = Math.min(avgMarketBid * 1.1, maxBid);
        break;
      default:
        recommendedBid = Math.min(avgMarketBid, maxBid);
    }

    recommendedBid = Math.max(minBid, recommendedBid);
    
    const expectedROI = (itemValue - recommendedBid) / recommendedBid;
    const confidence = this.calculateBidConfidence(auction, recommendedBid, bidder);

    return {
      recommendedBid: Math.round(recommendedBid * 100) / 100,
      maxBid: Math.round(maxBid * 100) / 100,
      expectedROI: Math.round(expectedROI * 100) / 100,
      confidence: Math.round(confidence * 100) / 100,
      strategy: expectedROI >= minROI ? 'proceed' : 'caution',
    };
  }

  /**
   * Create bidder profile
   */
  createBidderProfile(agentId: string, name: string, capabilities?: BidQualification[]): BidderProfile {
    const profile: BidderProfile = {
      id: generateId(),
      agentId,
      name,
      capabilities: capabilities || [],
      creditBalance: 1000,
      bidHistory: [],
      stats: {
        totalBids: 0,
        totalWins: 0,
        winRate: 0,
        avgBid: 0,
        avgROI: 0,
        totalSpent: 0,
        totalValue: 0,
      },
      strategy: {
        preferredAuctionTypes: ['second_price'],
        maxBidPercentOfValue: 0.75,
        minROIThreshold: 0.15,
        riskProfile: 'medium',
      },
    };

    this.bidders.set(agentId, profile);
    return profile;
  }

  /**
   * Get auction by ID
   */
  getAuction(auctionId: string): Auction | undefined {
    return this.auctions.get(auctionId);
  }

  /**
   * Get all auctions
   */
  getAuctions(): Auction[] {
    return Array.from(this.auctions.values());
  }

  /**
   * Get auctions by status
   */
  getAuctionsByStatus(status: AuctionStatus): Auction[] {
    return this.getAuctions().filter(a => a.status === status);
  }

  /**
   * Get market by ID
   */
  getMarket(marketId: string): Market | undefined {
    return this.markets.get(marketId);
  }

  /**
   * Get all markets
   */
  getMarkets(): Market[] {
    return Array.from(this.markets.values());
  }

  /**
   * Get bidder profile
   */
  getBidder(bidderId: string): BidderProfile | undefined {
    return this.bidders.get(bidderId);
  }

  /**
   * Get all bidders
   */
  getBidders(): BidderProfile[] {
    return Array.from(this.bidders.values());
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalAuctions: number;
    openAuctions: number;
    closedAuctions: number;
    totalVolume: number;
    avgClearingPrice: number;
    totalBidders: number;
    totalBids: number;
    avgCompetition: number;
  } {
    const auctions = this.getAuctions();
    const closedAuctions = auctions.filter(a => a.status === 'closed' || a.status === 'settled');

    const totalVolume = closedAuctions
      .filter(a => a.winner)
      .reduce((sum, a) => sum + (a.winner?.pricePaid || 0), 0);

    const avgClearingPrice = closedAuctions.length > 0
      ? closedAuctions
          .filter(a => a.winner)
          .reduce((sum, a) => sum + (a.winner?.pricePaid || 0), 0) / closedAuctions.filter(a => a.winner).length
      : 0;

    const totalBids = auctions.reduce((sum, a) => sum + a.bids.length, 0);
    const avgCompetition = auctions.length > 0
      ? auctions.reduce((sum, a) => sum + a.metrics.uniqueBidders, 0) / auctions.length
      : 0;

    return {
      totalAuctions: auctions.length,
      openAuctions: auctions.filter(a => a.status === 'open').length,
      closedAuctions: closedAuctions.length,
      totalVolume,
      avgClearingPrice,
      totalBidders: this.bidders.size,
      totalBids,
      avgCompetition,
    };
  }

  // Private helper methods

  private validateQualifications(qualifications: BidQualification[], requirements: ItemRequirement[]): boolean {
    for (const req of requirements) {
      if (!req.mandatory) continue;
      
      const qual = qualifications.find(q => q.capability === req.capability);
      if (!qual || qual.level < req.minLevel) {
        return false;
      }
    }
    return true;
  }

  private updateAuctionMetrics(auction: Auction): void {
    const validBids = auction.bids.filter(b => b.status !== 'rejected');
    
    auction.metrics.totalBids = validBids.length;
    auction.metrics.uniqueBidders = new Set(validBids.map(b => b.bidderId)).size;
    
    if (validBids.length > 0) {
      const amounts = validBids.map(b => b.amount);
      auction.metrics.highestBid = Math.max(...amounts);
      auction.metrics.lowestBid = Math.min(...amounts);
      auction.metrics.avgBid = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    }

    // Calculate bid velocity (bids per minute)
    if (auction.openedAt) {
      const elapsed = (Date.now() - auction.openedAt.getTime()) / 60000;
      auction.metrics.bidVelocity = elapsed > 0 ? validBids.length / elapsed : 0;
    }

    auction.metrics.competitionLevel = Math.min(1, auction.metrics.uniqueBidders / 5);
  }

  private updateBidderStats(bidder: BidderProfile): void {
    const history = bidder.bidHistory;
    if (history.length === 0) return;

    bidder.stats.totalBids = history.length;
    bidder.stats.totalWins = history.filter(h => h.won).length;
    bidder.stats.winRate = bidder.stats.totalWins / bidder.stats.totalBids;
    bidder.stats.avgBid = history.reduce((sum, h) => sum + h.bidAmount, 0) / history.length;
    
    const wins = history.filter(h => h.won && h.roi !== undefined);
    bidder.stats.avgROI = wins.length > 0
      ? wins.reduce((sum, h) => sum + (h.roi || 0), 0) / wins.length
      : 0;
  }

  private updateMarketStats(auction: Auction): void {
    // Find market for this auction
    for (const [_, market] of this.markets) {
      if (market.auctions.includes(auction.id)) {
        market.stats.completedAuctions++;
        if (auction.winner) {
          market.stats.totalVolume += auction.winner.pricePaid;
          market.stats.avgClearingPrice = 
            market.stats.totalVolume / market.stats.completedAuctions;
        }
        market.stats.participationRate = 
          auction.metrics.uniqueBidders / this.bidders.size;
        break;
      }
    }
  }

  private getAverageMarketBid(itemType: string): number {
    const relevantAuctions = this.getAuctions().filter(
      a => a.item.type === itemType && (a.status === 'closed' || a.status === 'settled')
    );

    if (relevantAuctions.length === 0) return 100;

    return relevantAuctions
      .filter(a => a.winner)
      .reduce((sum, a) => sum + (a.winner?.pricePaid || 0), 0) / 
      relevantAuctions.filter(a => a.winner).length;
  }

  private calculateBidConfidence(
    auction: Auction,
    bidAmount: number,
    bidder?: BidderProfile
  ): number {
    let confidence = 0.5;

    // Higher bid increases confidence
    if (auction.metrics.highestBid > 0) {
      const bidRatio = bidAmount / auction.metrics.highestBid;
      confidence += (bidRatio - 1) * 0.2;
    }

    // Bidder win rate affects confidence
    if (bidder && bidder.stats.winRate > 0) {
      confidence += bidder.stats.winRate * 0.2;
    }

    // Competition level decreases confidence
    confidence -= auction.metrics.competitionLevel * 0.1;

    return Math.max(0, Math.min(1, confidence));
  }
}

export default BiddingEngine;
