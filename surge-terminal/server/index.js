require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { createServer } = require('http');
const { WebSocketServer } = require('ws');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ==================== DATABASE (JSON file) ====================
const DB_PATH = path.join(__dirname, 'data', 'db.json');
if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const defaultDb = {
  trades: [
    { id: 1, pair: 'ETH/USD', side: 'buy', price: 3842.15, volume: 0.5, status: 'open', pnl: 34.07, opened_at: new Date(Date.now() - 3600000).toISOString() },
    { id: 2, pair: 'BTC/USD', side: 'buy', price: 97420.50, volume: 0.01, status: 'open', pnl: 694.83, opened_at: new Date(Date.now() - 7200000).toISOString() },
  ],
  signals: [
    { id: 1, timestamp: new Date(Date.now() - 25 * 60000).toISOString(), pair: 'ETH/USD', side: 'BUY', source: 'Economic Calendar', confidence: 92, reason: 'Fed rate decision: Hold → ETH long triggered', impact: 'HIGH', executed: 1, price: 3845.20 },
    { id: 2, timestamp: new Date(Date.now() - 45 * 60000).toISOString(), pair: 'BTC/USD', side: 'BUY', source: 'CryptoPanic', confidence: 78, reason: 'ETF inflow spike detected → BTC position increased', impact: 'MEDIUM', executed: 1, price: 97600.00 },
    { id: 3, timestamp: new Date(Date.now() - 90 * 60000).toISOString(), pair: 'ETH/USD', side: 'BUY', source: 'Kraken API', confidence: 45, reason: 'Whale wallet movement → ETH alert', impact: 'LOW', executed: 0, price: 3820.50 },
  ],
  bot_config: {
    activePairs: JSON.stringify(['ETH/USD', 'BTC/USD']),
    strategyMode: 'News-Driven',
    strategies: JSON.stringify(['Momentum', 'Breakout']),
    maxPositionSize: '25',
    stopLossPercent: '2.5',
    takeProfitPercent: '5',
    tradingAllocation: '1000',
    newsSources: JSON.stringify(['CryptoPanic', 'Kraken API', 'Economic Calendar']),
    autoTrade: 'false',
  },
  api_keys: {},
  news_cache: [],
};

function loadDb() {
  try {
    if (fs.existsSync(DB_PATH)) {
      const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
      return { ...defaultDb, ...data };
    }
  } catch (e) { console.error('DB load error:', e.message); }
  return JSON.parse(JSON.stringify(defaultDb));
}

function saveDb(db) {
  try { fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2)); } catch (e) { console.error('DB save error:', e.message); }
}

const db = loadDb();

// Load saved API keys from database on startup
function loadSavedApiKeys() {
  const keys = db.api_keys || {};
  if (keys.kraken_api_key && keys.kraken_api_secret) {
    process.env.KRAKEN_API_KEY = keys.kraken_api_key;
    process.env.KRAKEN_API_SECRET = keys.kraken_api_secret;
    if (keys.cryptopanic_key) process.env.CRYPTOPANIC_API_KEY = keys.cryptopanic_key;
    console.log('🔑 Loaded saved Kraken API keys from database');
    return true;
  }
  return false;
}
loadSavedApiKeys();

// ==================== KRAKEN CLIENT ====================
const KRAKEN_API = 'https://api.kraken.com';

class KrakenClient {
  constructor(config) {
    this.apiKey = config.apiKey || '';
    this.apiSecret = config.apiSecret || '';
  }

  getSignature(path, nonce, postData) {
    const message = nonce + postData;
    const secret = Buffer.from(this.apiSecret, 'base64');
    const hash = crypto.createHash('sha256').update(message).digest();
    return crypto.createHmac('sha512', secret).update(path + hash).digest('base64');
  }

  async privateRequest(method, params = {}) {
    if (!this.apiKey || !this.apiSecret) throw new Error('Kraken API credentials not configured');
    const path = `/0/private/${method}`;
    const nonce = Date.now().toString();
    const postData = new URLSearchParams({ nonce, ...params }).toString();
    const signature = this.getSignature(path, nonce, postData);
    const res = await axios.post(`${KRAKEN_API}${path}`, postData, {
      headers: { 'API-Key': this.apiKey, 'API-Sign': signature, 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 15000,
    });
    if (res.data.error?.length > 0) throw new Error(res.data.error.join(', '));
    return res.data.result;
  }

  async publicRequest(method, params = {}) {
    const query = new URLSearchParams(params).toString();
    const url = `${KRAKEN_API}/0/public/${method}${query ? '?' + query : ''}`;
    const res = await axios.get(url, { timeout: 8000 });
    if (res.data.error?.length > 0) throw new Error(res.data.error.join(', '));
    return res.data.result;
  }

  async getTicker(pairs) {
    if (!this.apiKey) throw new Error('No API credentials - using simulated data');
    const result = await this.publicRequest('Ticker', { pair: pairs.join(',') });
    return Object.entries(result).map(([pairKey, data]) => {
      const a = parseFloat(data.a?.[0] || '0');
      const b = parseFloat(data.b?.[0] || '0');
      const c = parseFloat(data.c?.[0] || '0');
      const v = parseFloat(data.v?.[1] || '0');
      const h = parseFloat(data.h?.[1] || '0');
      const l = parseFloat(data.l?.[1] || '0');
      const o = parseFloat(data.o || '0');
      return { pair: pairKey, ask: a, bid: b, last: c, volume: v, high: h, low: l, change: c - o, changePercent: o > 0 ? ((c - o) / o) * 100 : 0 };
    });
  }

  async getOHLC(pair, interval = 60) {
    const params = { pair, interval };
    const result = await this.publicRequest('OHLC', params);
    const pairKey = Object.keys(result).find(k => k !== 'last');
    if (!pairKey) return [];
    return result[pairKey].map(c => ({ time: c[0], open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4]), volume: parseFloat(c[6]) }));
  }

  async getBalances() {
    const result = await this.privateRequest('Balance');
    return Object.entries(result).map(([asset, balance]) => ({ asset, balance: parseFloat(balance), hold: 0, available: parseFloat(balance) }));
  }

  async getOpenOrders() {
    const result = await this.privateRequest('OpenOrders');
    return Object.entries(result.open || {}).map(([id, order]) => ({
      id, pair: order.descr?.pair || '', type: order.descr?.type || 'buy', ordertype: order.descr?.ordertype || '',
      price: parseFloat(order.descr?.price || '0'), volume: parseFloat(order.vol || '0'),
      volume_exec: parseFloat(order.vol_exec || '0'), status: order.status || 'open',
      openTime: new Date(order.opentm * 1000).toISOString(),
    }));
  }

  async addOrder({ pair, type, volume, ordertype = 'market', price, leverage }) {
    const params = { pair, type, ordertype, volume: volume.toString() };
    if (price) params.price = price.toString();
    if (leverage) params.leverage = leverage.toString();
    return this.privateRequest('AddOrder', params);
  }

  async cancelOrder(txid) {
    return this.privateRequest('CancelOrder', { txid });
  }

  async getTradeBalance() {
    return this.privateRequest('TradeBalance');
  }
}

// ==================== NEWS SERVICE ====================
const CRYPTOPANIC_API = 'https://cryptopanic.com/api/free/v1/posts';
const NEWS_API_KEY = process.env.CRYPTOPANIC_API_KEY || '';

class NewsService {
  constructor() {
    this.lastFetch = 0;
    this.cache = [];
    this.CACHE_TTL = 5 * 60 * 1000;
  }

  analyzeSentiment(title) {
    const positive = ['surge','rally','bull','gain','up','rise','pump','breakout','moon','adopt','etf approval','inflow','whale buy','soar','climb'];
    const negative = ['crash','dump','bear','fall','down','drop','plunge','decline','sell-off','outflow','hack','ban','regulatory crackdown','collapse'];
    const lower = title.toLowerCase();
    let score = 0;
    for (const w of positive) if (lower.includes(w)) score++;
    for (const w of negative) if (lower.includes(w)) score--;
    if (score > 0) return 'positive';
    if (score < 0) return 'negative';
    return 'neutral';
  }

  calculateRelevance(title, currencies) {
    let score = 0.5;
    const lower = title.toLowerCase();
    if (lower.includes('etf')) score += 0.2;
    if (lower.includes('fed')) score += 0.25;
    if (lower.includes('whale')) score += 0.15;
    if (lower.includes('hack') || lower.includes('exploit')) score += 0.2;
    if (currencies?.length > 0) score += 0.1;
    return Math.min(score, 1.0);
  }

  getSimulatedNews() {
    return [
      { id: 'sim_1', title: 'Bitcoin ETF sees record $2.1B inflow as institutional demand surges', source: 'CryptoBriefing', url: '#', publishedAt: new Date(Date.now() - 25 * 60000).toISOString(), sentiment: 'positive', relevance: 0.95, currencies: ['BTC'] },
      { id: 'sim_2', title: 'Ethereum staking rewards reach all-time high post-Dencun upgrade', source: 'TheBlock', url: '#', publishedAt: new Date(Date.now() - 45 * 60000).toISOString(), sentiment: 'positive', relevance: 0.85, currencies: ['ETH'] },
      { id: 'sim_3', title: 'Federal Reserve signals potential rate cut in next meeting', source: 'Reuters', url: '#', publishedAt: new Date(Date.now() - 90 * 60000).toISOString(), sentiment: 'positive', relevance: 0.9, currencies: ['BTC', 'ETH'] },
      { id: 'sim_4', title: 'Major DeFi protocol reports security vulnerability, TVL drops 15%', source: 'CoinDesk', url: '#', publishedAt: new Date(Date.now() - 120 * 60000).toISOString(), sentiment: 'negative', relevance: 0.75, currencies: ['ETH'] },
    ];
  }

  getMarketEvents() {
    return [
      { id: 'evt_1', title: 'US Non-Farm Payroll data release: 180K vs 200K expected', source: 'Economic Calendar', url: '#', publishedAt: new Date(Date.now() - 180 * 60000).toISOString(), sentiment: 'neutral', relevance: 0.88, currencies: ['BTC', 'ETH'] },
      { id: 'evt_2', title: 'SEC announces new crypto custody rule clarification', source: 'Regulatory News', url: '#', publishedAt: new Date(Date.now() - 240 * 60000).toISOString(), sentiment: 'neutral', relevance: 0.82, currencies: ['BTC', 'ETH'] },
    ];
  }

  async fetchLatest() {
    const now = Date.now();
    if (now - this.lastFetch < this.CACHE_TTL && this.cache.length > 0) return this.cache;

    const items = [];
    try {
      const res = await axios.get(CRYPTOPANIC_API, {
        params: { auth_token: NEWS_API_KEY, currencies: 'BTC,ETH', public: 'true', limit: 20 },
        timeout: 10000,
      });
      if (res.data?.results) {
        for (const post of res.data.results) {
          const item = {
            id: `cp_${post.id}`, title: post.title, source: post.source?.domain || 'CryptoPanic',
            url: post.url, publishedAt: post.created_at,
            sentiment: this.analyzeSentiment(post.title),
            relevance: this.calculateRelevance(post.title, post.currencies),
            currencies: (post.currencies || []).map(c => c.code),
          };
          items.push(item);
        }
      }
    } catch (err) { console.error('CryptoPanic error:', err.message); }

    if (items.length === 0) items.push(...this.getSimulatedNews());
    items.push(...this.getMarketEvents());

    this.cache = items.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    this.lastFetch = now;

    // Cache to DB
    db.news_cache = this.cache.map(item => ({ ...item, currencies: JSON.stringify(item.currencies) }));
    saveDb(db);

    return this.cache;
  }

  async getCached() {
    if (this.cache.length > 0) return this.cache;
    return db.news_cache.map(r => ({ ...r, currencies: JSON.parse(r.currencies || '[]') }));
  }
}

// ==================== SIGNAL ENGINE ====================
class SignalEngine {
  constructor() {
    this.cooldowns = new Map();
    this.COOLDOWN_MS = 5 * 60 * 1000;
  }

  aggregateSentiment(news) {
    let score = 0;
    for (const item of news) {
      const weight = item.relevance;
      if (item.sentiment === 'positive') score += weight;
      else if (item.sentiment === 'negative') score -= weight;
    }
    return { score: score / Math.max(news.length, 1), count: news.length };
  }

  analyze(ticker, news, config) {
    const signals = [];
    for (const tick of ticker) {
      const pairName = tick.pair.replace('XBT', 'BTC').replace('XXBT', 'BTC').replace('XETH', 'ETH');
      if (!config.activePairs.some(p => pairName.includes(p.replace('/USD', '')))) continue;

      const lastSignal = this.cooldowns.get(tick.pair) || 0;
      if (Date.now() - lastSignal < this.COOLDOWN_MS) continue;

      const relevantNews = news.filter(n => n.currencies.some(c => tick.pair.includes(c)) && n.relevance > 0.5);
      if (relevantNews.length === 0) continue;

      const sentiment = this.aggregateSentiment(relevantNews);
      const shouldBuy = sentiment.score > 0.25;
      const shouldSell = sentiment.score < -0.25;

      if (shouldBuy || shouldSell) {
        const side = shouldBuy ? 'BUY' : 'SELL';
        const topNews = relevantNews[0];
        const confidence = Math.min(Math.abs(sentiment.score) * 100, 95);
        const signal = {
          id: `sig_${Date.now()}_${tick.pair}`, timestamp: new Date().toISOString(),
          pair: pairName, side, source: topNews.source, confidence,
          reason: topNews.title, impact: confidence > 80 ? 'HIGH' : confidence > 50 ? 'MEDIUM' : 'LOW',
          executed: false, price: tick.last,
        };
        signals.push(signal);
        db.signals.unshift({ ...signal, id: db.signals.length + 1, executed: 0 });
        saveDb(db);
        this.cooldowns.set(tick.pair, Date.now());
      }
    }
    return signals;
  }

  getRecentSignals(limit = 20) {
    return (db.signals || []).slice(0, limit).map(r => ({
      id: `sig_${r.id}`, timestamp: r.timestamp, pair: r.pair, side: r.side,
      source: r.source, confidence: r.confidence, reason: r.reason,
      impact: r.impact, executed: !!r.executed, price: r.price,
    }));
  }
}

// ==================== MARKET DATA SERVICE ====================
class MarketDataService {
  constructor(client) { this.client = client; this.cache = new Map(); this.CACHE_TTL = 5000; }

  async getTickers(pairs) {
    const cacheKey = pairs.join(',');
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.time < this.CACHE_TTL) return cached.data;
    if (!this.client.apiKey) return this.getSimulatedTickers(pairs);
    try {
      const data = await this.client.getTicker(pairs);
      this.cache.set(cacheKey, { data, time: Date.now() });
      return data;
    } catch (err) {
      console.error('Ticker fetch failed:', err.message);
      return this.getSimulatedTickers(pairs);
    }
  }

  async getOHLC(pair, interval = 60) {
    if (!this.client.apiKey) return this.getSimulatedOHLC();
    try { return await this.client.getOHLC(pair, interval); }
    catch (err) { return this.getSimulatedOHLC(); }
  }

  async getPortfolio() {
    if (!this.client.apiKey) return { totalEquity: 12847.32, unrealizedPnl: 324.18, balances: [{ asset: 'ZUSD', balance: 2847.32, hold: 0, available: 2847.32 }, { asset: 'XETH', balance: 2.5, hold: 0, available: 2.5 }, { asset: 'XXBT', balance: 0.1, hold: 0, available: 0.1 }] };
    try {
      const balances = await this.client.getBalances();
      const tradeBalance = await this.client.getTradeBalance();
      return { totalEquity: parseFloat(tradeBalance?.eb || '12847.32'), unrealizedPnl: parseFloat(tradeBalance?.n || '324.18'), balances };
    } catch (err) {
      return { totalEquity: 12847.32, unrealizedPnl: 324.18, balances: [{ asset: 'ZUSD', balance: 2847.32, hold: 0, available: 2847.32 }, { asset: 'XETH', balance: 2.5, hold: 0, available: 2.5 }, { asset: 'XXBT', balance: 0.1, hold: 0, available: 0.1 }] };
    }
  }

  getSimulatedTickers(pairs) {
    const basePrices = { 'XETHZUSD': 3876.22, 'ETHUSD': 3876.22, 'XXBTZUSD': 98115.33, 'XBTUSD': 98115.33, 'BTCUSD': 98115.33 };
    return pairs.map(pair => {
      const base = basePrices[pair] || 1000;
      const jitter = (Math.random() - 0.5) * base * 0.002;
      const last = base + jitter;
      return { pair, ask: last * 1.0002, bid: last * 0.9998, last, volume: Math.random() * 5000 + 1000, high: last * 1.02, low: last * 0.98, change: jitter, changePercent: (jitter / base) * 100 };
    });
  }

  getSimulatedOHLC() {
    const candles = [];
    let price = 3850;
    const now = Math.floor(Date.now() / 1000);
    for (let i = 48; i >= 0; i--) {
      const t = now - i * 3600;
      const change = (Math.random() - 0.48) * 50;
      const open = price;
      price += change;
      candles.push({ time: t, open, high: Math.max(open, price) + Math.random() * 20, low: Math.min(open, price) - Math.random() * 20, close: price, volume: Math.random() * 2000 + 500 });
    }
    return candles;
  }
}

// ==================== TRADE EXECUTOR ====================
class TradeExecutor {
  constructor(krakenClient) {
    this.kraken = krakenClient;
  }

  getUsedAllocation() {
    const openTrades = (db.trades || []).filter(t => t.status === 'open');
    return openTrades.reduce((sum, t) => sum + (t.price * t.volume), 0);
  }

  getAvailableAllocation(config) {
    const totalAllocation = config.tradingAllocation || 1000;
    const used = this.getUsedAllocation();
    return Math.max(totalAllocation - used, 0);
  }

  async getUSDBalance() {
    if (!this.kraken.apiKey) return 2847.32; // simulated fallback
    try {
      const balances = await this.kraken.getBalances();
      const usdBalance = balances.find(b => b.asset === 'ZUSD' || b.asset === 'USD');
      return usdBalance ? usdBalance.balance : 0;
    } catch (err) {
      console.error('Failed to get USD balance:', err.message);
      return 0;
    }
  }

  calculatePositionSize(signalPrice, config) {
    const maxPositionSizePercent = (config.maxPositionSize || 25) / 100;
    const allocation = config.tradingAllocation || 1000;
    const used = this.getUsedAllocation();
    const available = Math.max(allocation - used, 0);
    const maxForThisTrade = allocation * maxPositionSizePercent;
    const actual = Math.min(available, maxForThisTrade);
    const volume = actual / signalPrice;
    return { volume, cost: actual, available, used, allocation };
  }

  async execute(signal, config) {
    if (!config.autoTrade) {
      console.log(`🚫 Auto-trade disabled — signal ${signal.id} not executed`);
      return { executed: false, reason: 'auto-trade disabled' };
    }

    if (!this.kraken.apiKey) {
      console.log(`🚫 No Kraken keys — signal ${signal.id} not executed`);
      return { executed: false, reason: 'no kraken api keys' };
    }

    const available = this.getAvailableAllocation(config);
    if (available <= 10) {
      console.log(`🚫 Allocation exhausted ($${available.toFixed(2)} left) — signal not executed`);
      return { executed: false, reason: 'allocation exhausted' };
    }

    const krakenPair = signal.pair === 'ETH/USD' ? 'XETHZUSD' : 'XXBTZUSD';
    const { volume, cost } = this.calculatePositionSize(signal.price, config);

    if (volume < 0.0001) {
      return { executed: false, reason: 'position size too small' };
    }

    try {
      console.log(`🚀 Executing ${signal.side} ${signal.pair}: ${volume.toFixed(6)} @ $${signal.price} (cost: $${cost.toFixed(2)})`);
      const result = await this.kraken.addOrder({
        pair: krakenPair,
        type: signal.side.toLowerCase(),
        volume,
        ordertype: 'market',
      });

      // Record the trade
      db.trades.unshift({
        id: (db.trades.length || 0) + 1,
        pair: signal.pair,
        side: signal.side.toLowerCase(),
        price: signal.price,
        volume,
        status: 'open',
        pnl: 0,
        opened_at: new Date().toISOString(),
      });
      saveDb(db);

      // Mark signal as executed
      const sig = db.signals.find(s => s.id === signal.id.replace('sig_', ''));
      if (sig) { sig.executed = 1; saveDb(db); }

      console.log(`✅ Trade executed: ${result.descr?.order || 'market order'}`);
      return { executed: true, result };
    } catch (err) {
      console.error(`❌ Trade execution failed:`, err.message);
      return { executed: false, reason: err.message };
    }
  }
}

// ==================== WEBSOCKET MANAGER ====================
class WebSocketManager {
  constructor(server) {
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.clients = new Map();
    this.setupHandlers();
  }

  setupHandlers() {
    this.wss.on('connection', (ws) => {
      this.clients.set(ws, new Set());
      ws.on('message', (raw) => {
        try {
          const msg = JSON.parse(raw.toString());
          const subs = this.clients.get(ws);
          if (!subs) return;
          if (msg.type === 'subscribe' && msg.channel) subs.add(msg.channel);
          else if (msg.type === 'unsubscribe' && msg.channel) subs.delete(msg.channel);
        } catch (e) {}
      });
      ws.on('close', () => this.clients.delete(ws));
    });
  }

  startBroadcasting(getData) {
    this.interval = setInterval(async () => {
      try {
        const { tickers, signals } = await getData();
        const msg = JSON.stringify({ type: 'update', tickers, signals });
        for (const [ws] of this.clients) {
          if (ws.readyState === 1) ws.send(msg);
        }
      } catch (err) { console.error('Broadcast error:', err.message); }
    }, 5000);
  }

  broadcast(type, data) {
    const msg = JSON.stringify({ type, data });
    for (const [ws] of this.clients) {
      if (ws.readyState === 1) ws.send(msg);
    }
  }

  stop() {
    if (this.interval) clearInterval(this.interval);
    this.wss.close();
  }
}

// ==================== CONFIG HELPERS ====================
function loadConfig() {
  const cfg = db.bot_config || {};
  return {
    activePairs: safeParse(cfg.activePairs, ['ETH/USD', 'BTC/USD']),
    strategyMode: cfg.strategyMode || 'News-Driven',
    strategies: safeParse(cfg.strategies, ['Momentum', 'Breakout']),
    maxPositionSize: parseFloat(cfg.maxPositionSize) || 25,
    stopLossPercent: parseFloat(cfg.stopLossPercent) || 2.5,
    takeProfitPercent: parseFloat(cfg.takeProfitPercent) || 5,
    tradingAllocation: parseFloat(cfg.tradingAllocation) || 1000,
    newsSources: safeParse(cfg.newsSources, ['CryptoPanic', 'Kraken API', 'Economic Calendar']),
    autoTrade: cfg.autoTrade === 'true' || cfg.autoTrade === true,
  };
}

function saveConfig(config) {
  db.bot_config = {
    activePairs: JSON.stringify(config.activePairs),
    strategyMode: config.strategyMode,
    strategies: JSON.stringify(config.strategies),
    maxPositionSize: String(config.maxPositionSize),
    stopLossPercent: String(config.stopLossPercent),
    takeProfitPercent: String(config.takeProfitPercent),
    tradingAllocation: String(config.tradingAllocation || 1000),
    newsSources: JSON.stringify(config.newsSources),
    autoTrade: String(config.autoTrade),
  };
  saveDb(db);
}

function safeParse(val, fallback) {
  if (!val) return fallback;
  try { return JSON.parse(val); } catch { return fallback; }
}

// ==================== EXPRESS APP ====================
const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Services
const kraken = new KrakenClient({ apiKey: process.env.KRAKEN_API_KEY, apiSecret: process.env.KRAKEN_API_SECRET });
const marketService = new MarketDataService(kraken);
const newsService = new NewsService();
const signalEngine = new SignalEngine();
const tradeExecutor = new TradeExecutor(kraken);

// Health
app.get('/api/health', (req, res) => {
  const config = loadConfig();
  res.json({
    status: 'ok',
    krakenConnected: !!(kraken.apiKey && kraken.apiSecret),
    autoTrade: config.autoTrade,
    tradingAllocation: config.tradingAllocation,
    timestamp: new Date().toISOString(),
  });
});

// Market routes
app.get('/api/market/ticker', async (req, res) => {
  try {
    const pairs = (req.query.pairs || 'XETHZUSD,XXBTZUSD').split(',');
    const data = await marketService.getTickers(pairs);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/market/ohlc', async (req, res) => {
  try {
    const pair = req.query.pair || 'XETHZUSD';
    const interval = parseInt(req.query.interval) || 60;
    const data = await marketService.getOHLC(pair, interval);
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/market/portfolio', async (req, res) => {
  try {
    const data = await marketService.getPortfolio();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/market/balance', async (req, res) => {
  try {
    const usdBalance = await tradeExecutor.getUSDBalance();
    const config = loadConfig();
    const used = tradeExecutor.getUsedAllocation();
    const available = tradeExecutor.getAvailableAllocation(config);
    res.json({
      success: true,
      data: {
        usdBalance,
        tradingAllocation: config.tradingAllocation,
        used,
        available,
        inUsePercent: config.tradingAllocation > 0 ? (used / config.tradingAllocation * 100) : 0,
        openTrades: (db.trades || []).filter(t => t.status === 'open').length,
      },
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Trading routes
app.get('/api/trading/orders', async (req, res) => {
  try { const data = await kraken.getOpenOrders(); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/trading/order', async (req, res) => {
  try {
    const { pair, type, volume, ordertype, price } = req.body;
    if (!pair || !type || !volume) return res.status(400).json({ success: false, error: 'Missing fields' });
    const result = await kraken.addOrder({ pair, type, volume: parseFloat(volume), ordertype: ordertype || 'market', price: price ? parseFloat(price) : undefined });
    db.trades.unshift({ id: (db.trades.length || 0) + 1, pair, side: type, price: price || 0, volume: parseFloat(volume), status: 'open', pnl: 0, opened_at: new Date().toISOString() });
    saveDb(db);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/trading/cancel', async (req, res) => {
  try {
    const { txid } = req.body;
    if (!txid) return res.status(400).json({ success: false, error: 'Missing txid' });
    const result = await kraken.cancelOrder(txid);
    res.json({ success: true, data: result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/trading/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({ success: true, data: (db.trades || []).slice(0, limit) });
});

// Signals
app.get('/api/signals', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  res.json({ success: true, data: signalEngine.getRecentSignals(limit) });
});

// News
app.get('/api/news', async (req, res) => {
  try {
    const data = req.query.refresh === 'true' ? await newsService.fetchLatest() : await newsService.getCached();
    res.json({ success: true, data });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.post('/api/news/refresh', async (req, res) => {
  try { const data = await newsService.fetchLatest(); res.json({ success: true, data }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Config
app.get('/api/config', (req, res) => res.json({ success: true, data: loadConfig() }));
app.post('/api/config', (req, res) => {
  const current = loadConfig();
  const updated = { ...current, ...req.body };
  saveConfig(updated);
  res.json({ success: true, data: updated });
});

// Setup / Connect Kraken
app.get('/api/setup', (req, res) => {
  const keys = db.api_keys || {};
  res.json({ success: true, data: { hasKeys: !!keys.kraken_api_key, krakenConnected: kraken.apiKey } });
});

app.post('/api/setup', (req, res) => {
  const { kraken_api_key, kraken_api_secret, cryptopanic_key } = req.body;
  
  if (kraken_api_key && kraken_api_secret) {
    db.api_keys = { kraken_api_key, kraken_api_secret, cryptopanic_key: cryptopanic_key || '' };
    saveDb(db);
    
    // Re-initialize Kraken client with new keys
    kraken.apiKey = kraken_api_key;
    kraken.apiSecret = kraken_api_secret;
    
    // Update env for other uses
    process.env.KRAKEN_API_KEY = kraken_api_key;
    process.env.KRAKEN_API_SECRET = kraken_api_secret;
    if (cryptopanic_key) process.env.CRYPTOPANIC_API_KEY = cryptopanic_key;
    
    console.log('🔑 Kraken keys updated — switching to LIVE mode');
    res.json({ success: true, data: { krakenConnected: true, message: 'Connected to Kraken Pro' } });
  } else {
    res.status(400).json({ success: false, error: 'Missing kraken_api_key or kraken_api_secret' });
  }
});

// Serve frontend static files
const FRONTEND_DIST = path.join(__dirname, '..', 'dist');
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api') && !req.path.startsWith('/ws')) {
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    }
  });
  console.log(`📁 Serving frontend from ${FRONTEND_DIST}`);
}

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal error' });
});

// WebSocket
const wsManager = new WebSocketManager(server);
wsManager.startBroadcasting(async () => {
  const pairs = ['XETHZUSD', 'XXBTZUSD'];
  const [tickers, signals] = await Promise.all([
    marketService.getTickers(pairs),
    signalEngine.getRecentSignals(10),
  ]);
  return { tickers, signals };
});

// Scheduled signal generation + auto-trading
cron.schedule('*/5 * * * *', async () => {
  console.log('⏰ Scheduled signal analysis...');
  try {
    await newsService.fetchLatest();
    const news = await newsService.getCached();
    const tickers = await marketService.getTickers(['XETHZUSD', 'XXBTZUSD']);
    const config = loadConfig();
    const newSignals = signalEngine.analyze(tickers, news, config);
    if (newSignals.length > 0) {
      console.log(`🚨 ${newSignals.length} new signals generated`);
      wsManager.broadcast('signals', newSignals);

      // Auto-execute if enabled
      if (config.autoTrade) {
        for (const signal of newSignals) {
          const result = await tradeExecutor.execute(signal, config);
          if (result.executed) {
            wsManager.broadcast('trade_executed', { signal, result });
          }
        }
      }
    }
  } catch (err) { console.error('Schedule error:', err.message); }
});

server.listen(PORT, () => {
  console.log(`🚀 Surge Terminal API on port ${PORT}`);
  console.log(`📡 WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`🔑 Kraken: ${process.env.KRAKEN_API_KEY ? 'LIVE' : 'SIMULATED'}`);
});
