/**
 * Market Maker Module
 * Manages market dynamics, liquidity, and price discovery for the agent economy
 */

import { generateId } from '../../utils/helpers';

// ============================================================
// Market Maker Types
// ============================================================

export type OrderType = 'buy' | 'sell' | 'market' | 'limit';
export type OrderStatus = 'pending' | 'open' | 'filled' | 'partial' | 'cancelled';
export type AssetType = 'credits' | 'compute' | 'storage' | 'api_calls' | 'priority' | 'signal';

export interface Order {
  id: string;
  type: OrderType;
  side: 'buy' | 'sell';
  assetType: AssetType;
  quantity: number;
  price: number;
  filledQuantity: number;
  avgFillPrice: number;
  agentId: string;
  status: OrderStatus;
  metadata: OrderMetadata;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface OrderMetadata {
  strategy?: string;
  urgency?: 'low' | 'medium' | 'high';
  tags: string[];
  linkedOrders?: string[];
}

export interface Trade {
  id: string;
  buyOrderId: string;
  sellOrderId: string;
  buyerAgentId: string;
  sellerAgentId: string;
  assetType: AssetType;
  quantity: number;
  price: number;
  fee: number;
  timestamp: Date;
}

export interface OrderBook {
  assetType: AssetType;
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  lastPrice: number;
  lastTradeTime?: Date;
  spread: number;
  midPrice: number;
}

export interface OrderBookEntry {
  price: number;
  quantity: number;
  orderCount: number;
}

export interface MarketQuote {
  assetType: AssetType;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  spread: number;
  lastPrice: number;
  volume24h: number;
  change24h: number;
  timestamp: Date;
}

export interface PriceHistory {
  assetType: AssetType;
  interval: 'minute' | 'hour' | 'day';
  candles: OHLCV[];
}

export interface OHLCV {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiquidityPool {
  id: string;
  assetType: AssetType;
  totalLiquidity: number;
  providers: LiquidityProvider[];
  feeRate: number;
  utilizationRate: number;
  apr: number;
}

export interface LiquidityProvider {
  agentId: string;
  amount: number;
  share: number;
  rewardsEarned: number;
  joinedAt: Date;
}

export interface MarketMetrics {
  totalVolume: number;
  totalTrades: number;
  activeOrders: number;
  uniqueTraders: number;
  liquidityDepth: number;
  volatility: number;
  efficiency: number;
}

export interface PriceOracle {
  assetType: AssetType;
  sources: OracleSource[];
  aggregatedPrice: number;
  confidence: number;
  lastUpdate: Date;
}

export interface OracleSource {
  name: string;
  price: number;
  weight: number;
  lastUpdate: Date;
}

export interface MarketMakerConfig {
  defaultSpread: number;
  maxSpread: number;
  minSpread: number;
  inventoryTarget: number;
  riskLimit: number;
  feeRate: number;
  minOrderSize: number;
  maxOrderSize: number;
}

// ============================================================
// Market Maker Implementation
// ============================================================

export class MarketMaker {
  private orders: Map<string, Order> = new Map();
  private trades: Map<string, Trade> = new Map();
  private orderBooks: Map<AssetType, Order[]> = new Map();
  private liquidityPools: Map<string, LiquidityPool> = new Map();
  private priceOracles: Map<AssetType, PriceOracle> = new Map();
  private priceHistory: Map<AssetType, OHLCV[]> = new Map();
  private config: MarketMakerConfig;

  constructor(config?: Partial<MarketMakerConfig>) {
    this.config = {
      defaultSpread: 0.02, // 2%
      maxSpread: 0.1, // 10%
      minSpread: 0.005, // 0.5%
      inventoryTarget: 0.5, // 50% of liquidity
      riskLimit: 100000,
      feeRate: 0.001, // 0.1%
      minOrderSize: 1,
      maxOrderSize: 10000,
      ...config,
    };

    this.initializeAssetTypes();
    this.initializeLiquidityPools();
  }

  /**
   * Initialize order books for all asset types
   */
  private initializeAssetTypes(): void {
    const assetTypes: AssetType[] = ['credits', 'compute', 'storage', 'api_calls', 'priority', 'signal'];
    
    for (const assetType of assetTypes) {
      this.orderBooks.set(assetType, []);
      this.priceHistory.set(assetType, []);
      
      // Initialize price oracle with default price
      this.priceOracles.set(assetType, {
        assetType,
        sources: [{
          name: 'internal',
          price: this.getDefaultPrice(assetType),
          weight: 1,
          lastUpdate: new Date(),
        }],
        aggregatedPrice: this.getDefaultPrice(assetType),
        confidence: 0.9,
        lastUpdate: new Date(),
      });
    }
  }

  /**
   * Initialize liquidity pools
   */
  private initializeLiquidityPools(): void {
    const assetTypes: AssetType[] = ['credits', 'compute', 'storage', 'api_calls'];
    
    for (const assetType of assetTypes) {
      const pool: LiquidityPool = {
        id: generateId(),
        assetType,
        totalLiquidity: 100000, // Initial liquidity
        providers: [],
        feeRate: this.config.feeRate,
        utilizationRate: 0,
        apr: 0.05, // 5% APR
      };
      
      this.liquidityPools.set(assetType, pool);
    }
  }

  /**
   * Submit an order to the market
   */
  submitOrder(params: {
    agentId: string;
    side: Order['side'];
    assetType: AssetType;
    quantity: number;
    price?: number;
    type?: OrderType;
    expiresAt?: Date;
    metadata?: Partial<OrderMetadata>;
  }): Order {
    // Validate order
    if (params.quantity < this.config.minOrderSize) {
      throw new Error(`Order quantity must be at least ${this.config.minOrderSize}`);
    }
    if (params.quantity > this.config.maxOrderSize) {
      throw new Error(`Order quantity cannot exceed ${this.config.maxOrderSize}`);
    }

    const orderType = params.type || (params.price ? 'limit' : 'market');
    const price = params.price || this.getMarketPrice(params.assetType, params.side);

    const order: Order = {
      id: generateId(),
      type: orderType,
      side: params.side,
      assetType: params.assetType,
      quantity: params.quantity,
      price,
      filledQuantity: 0,
      avgFillPrice: 0,
      agentId: params.agentId,
      status: 'open',
      metadata: {
        tags: [],
        ...params.metadata,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: params.expiresAt,
    };

    this.orders.set(order.id, order);

    // Add to order book
    const orderBook = this.orderBooks.get(params.assetType) || [];
    orderBook.push(order);
    this.orderBooks.set(params.assetType, orderBook);

    // Try to match immediately
    this.matchOrders(params.assetType);

    return order;
  }

  /**
   * Cancel an order
   */
  cancelOrder(orderId: string): Order {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order '${orderId}' not found`);
    }

    if (order.status !== 'open' && order.status !== 'partial') {
      throw new Error(`Cannot cancel order with status '${order.status}'`);
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();

    // Remove from order book
    const orderBook = this.orderBooks.get(order.assetType) || [];
    const index = orderBook.findIndex(o => o.id === orderId);
    if (index !== -1) {
      orderBook.splice(index, 1);
    }

    return order;
  }

  /**
   * Match orders in the order book
   */
  private matchOrders(assetType: AssetType): Trade[] {
    const trades: Trade[] = [];
    const orderBook = this.orderBooks.get(assetType) || [];

    // Get buy and sell orders
    const buyOrders = orderBook
      .filter(o => o.side === 'buy' && (o.status === 'open' || o.status === 'partial'))
      .sort((a, b) => b.price - a.price); // Highest first

    const sellOrders = orderBook
      .filter(o => o.side === 'sell' && (o.status === 'open' || o.status === 'partial'))
      .sort((a, b) => a.price - b.price); // Lowest first

    // Match orders
    for (const buyOrder of buyOrders) {
      for (const sellOrder of sellOrders) {
        if (buyOrder.price < sellOrder.price) break; // No match possible

        const buyRemaining = buyOrder.quantity - buyOrder.filledQuantity;
        const sellRemaining = sellOrder.quantity - sellOrder.filledQuantity;
        
        if (buyRemaining <= 0 || sellRemaining <= 0) continue;

        const matchQuantity = Math.min(buyRemaining, sellRemaining);
        const matchPrice = (buyOrder.price + sellOrder.price) / 2;

        // Execute trade
        const trade = this.executeTrade(buyOrder, sellOrder, matchQuantity, matchPrice);
        trades.push(trade);

        // Update orders
        buyOrder.filledQuantity += matchQuantity;
        sellOrder.filledQuantity += matchQuantity;

        this.updateOrderStatus(buyOrder);
        this.updateOrderStatus(sellOrder);
      }
    }

    // Clean up filled orders
    this.orderBooks.set(assetType, orderBook.filter(
      o => o.status === 'open' || o.status === 'partial'
    ));

    // Update price history
    if (trades.length > 0) {
      this.updatePriceHistory(assetType, trades);
    }

    return trades;
  }

  /**
   * Execute a trade between two orders
   */
  private executeTrade(
    buyOrder: Order,
    sellOrder: Order,
    quantity: number,
    price: number
  ): Trade {
    const fee = quantity * price * this.config.feeRate;

    const trade: Trade = {
      id: generateId(),
      buyOrderId: buyOrder.id,
      sellOrderId: sellOrder.id,
      buyerAgentId: buyOrder.agentId,
      sellerAgentId: sellOrder.agentId,
      assetType: buyOrder.assetType,
      quantity,
      price,
      fee,
      timestamp: new Date(),
    };

    this.trades.set(trade.id, trade);

    // Update order fill prices
    this.updateOrderFillPrice(buyOrder, quantity, price);
    this.updateOrderFillPrice(sellOrder, quantity, price);

    // Update liquidity pool fees
    this.distributeFees(buyOrder.assetType, fee);

    // Update price oracle
    this.updatePriceOracle(buyOrder.assetType, price);

    return trade;
  }

  /**
   * Update order status based on fill
   */
  private updateOrderStatus(order: Order): void {
    if (order.filledQuantity >= order.quantity) {
      order.status = 'filled';
    } else if (order.filledQuantity > 0) {
      order.status = 'partial';
    }
    order.updatedAt = new Date();
  }

  /**
   * Update order average fill price
   */
  private updateOrderFillPrice(order: Order, quantity: number, price: number): void {
    const totalValue = order.avgFillPrice * (order.filledQuantity - quantity) + price * quantity;
    order.avgFillPrice = totalValue / order.filledQuantity;
  }

  /**
   * Get market price for an asset
   */
  getMarketPrice(assetType: AssetType, side: 'buy' | 'sell'): number {
    const oracle = this.priceOracles.get(assetType);
    const basePrice = oracle?.aggregatedPrice || this.getDefaultPrice(assetType);

    const spread = this.calculateSpread(assetType);
    
    if (side === 'buy') {
      return basePrice * (1 + spread / 2);
    } else {
      return basePrice * (1 - spread / 2);
    }
  }

  /**
   * Get current market quote
   */
  getQuote(assetType: AssetType): MarketQuote {
    const orderBook = this.getOrderBook(assetType);
    const oracle = this.priceOracles.get(assetType);
    const history = this.priceHistory.get(assetType) || [];

    // Calculate 24h volume and change
    const now = Date.now();
    const dayAgo = now - 86400000;
    const recentTrades = Array.from(this.trades.values())
      .filter(t => t.assetType === assetType && t.timestamp.getTime() > dayAgo);

    const volume24h = recentTrades.reduce((sum, t) => sum + t.quantity * t.price, 0);
    
    const dayAgoPrice = history.find(c => c.timestamp.getTime() <= dayAgo)?.close || orderBook.lastPrice;
    const change24h = dayAgoPrice > 0 ? (orderBook.lastPrice - dayAgoPrice) / dayAgoPrice : 0;

    return {
      assetType,
      bid: orderBook.bids.length > 0 ? orderBook.bids[0].price : orderBook.midPrice * 0.99,
      ask: orderBook.asks.length > 0 ? orderBook.asks[0].price : orderBook.midPrice * 1.01,
      bidSize: orderBook.bids.reduce((sum, b) => sum + b.quantity, 0),
      askSize: orderBook.asks.reduce((sum, a) => sum + a.quantity, 0),
      spread: orderBook.spread,
      lastPrice: orderBook.lastPrice,
      volume24h,
      change24h,
      timestamp: new Date(),
    };
  }

  /**
   * Get order book for an asset
   */
  getOrderBook(assetType: AssetType): OrderBook {
    const orders = this.orderBooks.get(assetType) || [];
    const oracle = this.priceOracles.get(assetType);
    const basePrice = oracle?.aggregatedPrice || this.getDefaultPrice(assetType);

    // Aggregate bids
    const bidMap = new Map<number, { quantity: number; count: number }>();
    orders.filter(o => o.side === 'buy' && o.status === 'open').forEach(o => {
      const existing = bidMap.get(o.price) || { quantity: 0, count: 0 };
      existing.quantity += o.quantity - o.filledQuantity;
      existing.count++;
      bidMap.set(o.price, existing);
    });

    // Aggregate asks
    const askMap = new Map<number, { quantity: number; count: number }>();
    orders.filter(o => o.side === 'sell' && o.status === 'open').forEach(o => {
      const existing = askMap.get(o.price) || { quantity: 0, count: 0 };
      existing.quantity += o.quantity - o.filledQuantity;
      existing.count++;
      askMap.set(o.price, existing);
    });

    const bids: OrderBookEntry[] = Array.from(bidMap.entries())
      .map(([price, data]) => ({ price, ...data, orderCount: data.count }))
      .sort((a, b) => b.price - a.price);

    const asks: OrderBookEntry[] = Array.from(askMap.entries())
      .map(([price, data]) => ({ price, ...data, orderCount: data.count }))
      .sort((a, b) => a.price - b.price);

    const bestBid = bids[0]?.price || basePrice * 0.99;
    const bestAsk = asks[0]?.price || basePrice * 1.01;

    // Get last trade price
    const assetTrades = Array.from(this.trades.values())
      .filter(t => t.assetType === assetType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    
    const lastPrice = assetTrades[0]?.price || basePrice;

    return {
      assetType,
      bids,
      asks,
      lastPrice,
      lastTradeTime: assetTrades[0]?.timestamp,
      spread: (bestAsk - bestBid) / ((bestAsk + bestBid) / 2),
      midPrice: (bestAsk + bestBid) / 2,
    };
  }

  /**
   * Add liquidity to a pool
   */
  addLiquidity(assetType: AssetType, agentId: string, amount: number): LiquidityProvider {
    const pool = this.liquidityPools.get(assetType);
    if (!pool) {
      throw new Error(`No liquidity pool for asset type '${assetType}'`);
    }

    // Check for existing provider
    let provider = pool.providers.find(p => p.agentId === agentId);
    
    if (provider) {
      provider.amount += amount;
    } else {
      provider = {
        agentId,
        amount,
        share: 0,
        rewardsEarned: 0,
        joinedAt: new Date(),
      };
      pool.providers.push(provider);
    }

    pool.totalLiquidity += amount;

    // Recalculate shares
    for (const p of pool.providers) {
      p.share = p.amount / pool.totalLiquidity;
    }

    return provider;
  }

  /**
   * Remove liquidity from a pool
   */
  removeLiquidity(assetType: AssetType, agentId: string, amount: number): number {
    const pool = this.liquidityPools.get(assetType);
    if (!pool) {
      throw new Error(`No liquidity pool for asset type '${assetType}'`);
    }

    const provider = pool.providers.find(p => p.agentId === agentId);
    if (!provider) {
      throw new Error(`Agent is not a liquidity provider`);
    }

    const withdrawAmount = Math.min(amount, provider.amount);
    provider.amount -= withdrawAmount;
    pool.totalLiquidity -= withdrawAmount;

    // Remove provider if fully withdrawn
    if (provider.amount <= 0) {
      const index = pool.providers.indexOf(provider);
      pool.providers.splice(index, 1);
    }

    // Recalculate shares
    for (const p of pool.providers) {
      p.share = pool.totalLiquidity > 0 ? p.amount / pool.totalLiquidity : 0;
    }

    return withdrawAmount + provider.rewardsEarned;
  }

  /**
   * Get liquidity pool
   */
  getLiquidityPool(assetType: AssetType): LiquidityPool | undefined {
    return this.liquidityPools.get(assetType);
  }

  /**
   * Get all liquidity pools
   */
  getLiquidityPools(): LiquidityPool[] {
    return Array.from(this.liquidityPools.values());
  }

  /**
   * Get price history
   */
  getPriceHistory(assetType: AssetType, interval: PriceHistory['interval'] = 'hour', limit: number = 100): PriceHistory {
    const candles = this.priceHistory.get(assetType) || [];
    
    return {
      assetType,
      interval,
      candles: candles.slice(-limit),
    };
  }

  /**
   * Get market metrics
   */
  getMetrics(): MarketMetrics {
    const trades = Array.from(this.trades.values());
    const orders = Array.from(this.orders.values());
    const activeOrders = orders.filter(o => o.status === 'open' || o.status === 'partial');

    const totalVolume = trades.reduce((sum, t) => sum + t.quantity * t.price, 0);
    const uniqueTraders = new Set([
      ...trades.map(t => t.buyerAgentId),
      ...trades.map(t => t.sellerAgentId),
    ]).size;

    const totalLiquidity = Array.from(this.liquidityPools.values())
      .reduce((sum, p) => sum + p.totalLiquidity, 0);

    // Calculate volatility from recent prices
    const allPrices = Array.from(this.priceHistory.values())
      .flatMap(h => h.map(c => c.close));
    const avgPrice = allPrices.length > 0 ? allPrices.reduce((a, b) => a + b, 0) / allPrices.length : 0;
    const variance = allPrices.length > 0
      ? allPrices.reduce((sum, p) => sum + Math.pow(p - avgPrice, 2), 0) / allPrices.length
      : 0;
    const volatility = Math.sqrt(variance) / (avgPrice || 1);

    return {
      totalVolume,
      totalTrades: trades.length,
      activeOrders: activeOrders.length,
      uniqueTraders,
      liquidityDepth: totalLiquidity,
      volatility,
      efficiency: trades.length > 0 ? 1 - volatility : 0.5,
    };
  }

  /**
   * Get order by ID
   */
  getOrder(orderId: string): Order | undefined {
    return this.orders.get(orderId);
  }

  /**
   * Get all orders
   */
  getOrders(): Order[] {
    return Array.from(this.orders.values());
  }

  /**
   * Get orders by agent
   */
  getOrdersByAgent(agentId: string): Order[] {
    return this.getOrders().filter(o => o.agentId === agentId);
  }

  /**
   * Get trade by ID
   */
  getTrade(tradeId: string): Trade | undefined {
    return this.trades.get(tradeId);
  }

  /**
   * Get all trades
   */
  getTrades(): Trade[] {
    return Array.from(this.trades.values());
  }

  /**
   * Get trades by agent
   */
  getTradesByAgent(agentId: string): Trade[] {
    return this.getTrades().filter(t => t.buyerAgentId === agentId || t.sellerAgentId === agentId);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalOrders: number;
    activeOrders: number;
    totalTrades: number;
    totalVolume: number;
    totalFees: number;
    totalLiquidity: number;
    avgSpread: number;
    marketEfficiency: number;
  } {
    const orders = this.getOrders();
    const trades = this.getTrades();
    const pools = this.getLiquidityPools();

    const totalFees = trades.reduce((sum, t) => sum + t.fee, 0);
    const totalLiquidity = pools.reduce((sum, p) => sum + p.totalLiquidity, 0);

    // Calculate average spread across all assets
    const spreads = Array.from(this.orderBooks.keys()).map(assetType => {
      const book = this.getOrderBook(assetType);
      return book.spread;
    });
    const avgSpread = spreads.length > 0 ? spreads.reduce((a, b) => a + b, 0) / spreads.length : 0;

    return {
      totalOrders: orders.length,
      activeOrders: orders.filter(o => o.status === 'open' || o.status === 'partial').length,
      totalTrades: trades.length,
      totalVolume: trades.reduce((sum, t) => sum + t.quantity * t.price, 0),
      totalFees,
      totalLiquidity,
      avgSpread,
      marketEfficiency: Math.max(0, 1 - avgSpread),
    };
  }

  // Private helper methods

  private getDefaultPrice(assetType: AssetType): number {
    const defaultPrices: Record<AssetType, number> = {
      credits: 1,
      compute: 10,
      storage: 5,
      api_calls: 0.01,
      priority: 50,
      signal: 25,
    };
    return defaultPrices[assetType] || 1;
  }

  private calculateSpread(assetType: AssetType): number {
    const pool = this.liquidityPools.get(assetType);
    if (!pool) return this.config.defaultSpread;

    // Lower spread for higher liquidity
    const liquidityFactor = Math.min(1, pool.totalLiquidity / 100000);
    const spread = this.config.maxSpread - 
      (this.config.maxSpread - this.config.minSpread) * liquidityFactor;

    return Math.max(this.config.minSpread, Math.min(this.config.maxSpread, spread));
  }

  private distributeFees(assetType: AssetType, fee: number): void {
    const pool = this.liquidityPools.get(assetType);
    if (!pool) return;

    for (const provider of pool.providers) {
      provider.rewardsEarned += fee * provider.share;
    }
  }

  private updatePriceOracle(assetType: AssetType, newPrice: number): void {
    const oracle = this.priceOracles.get(assetType);
    if (!oracle) return;

    // Update internal source
    const internalSource = oracle.sources.find(s => s.name === 'internal');
    if (internalSource) {
      internalSource.price = newPrice;
      internalSource.lastUpdate = new Date();
    }

    // Recalculate aggregated price
    const totalWeight = oracle.sources.reduce((sum, s) => sum + s.weight, 0);
    oracle.aggregatedPrice = oracle.sources.reduce(
      (sum, s) => sum + s.price * (s.weight / totalWeight), 0
    );
    oracle.lastUpdate = new Date();
  }

  private updatePriceHistory(assetType: AssetType, trades: Trade[]): void {
    const history = this.priceHistory.get(assetType) || [];
    const now = new Date();
    
    // Get or create current candle
    const currentHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
    let currentCandle = history.find(c => c.timestamp.getTime() === currentHour.getTime());

    if (!currentCandle) {
      const lastCandle = history[history.length - 1];
      currentCandle = {
        timestamp: currentHour,
        open: lastCandle?.close || trades[0].price,
        high: 0,
        low: Infinity,
        close: 0,
        volume: 0,
      };
      history.push(currentCandle);
    }

    // Update candle with trades
    for (const trade of trades) {
      if (currentCandle.high < trade.price) currentCandle.high = trade.price;
      if (currentCandle.low > trade.price) currentCandle.low = trade.price;
      currentCandle.close = trade.price;
      currentCandle.volume += trade.quantity;
    }

    // Keep last 1000 candles
    if (history.length > 1000) {
      history.shift();
    }

    this.priceHistory.set(assetType, history);
  }
}

export default MarketMaker;
