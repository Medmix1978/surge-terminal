import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';
import { useWebSocket } from '@/hooks/useWebSocket';

interface Position {
  pair: string;
  side: 'BUY' | 'SELL';
  entryPrice: number;
  currentPrice: number;
  pnl: number;
}

interface Signal {
  id: string;
  timestamp: string;
  pair: string;
  side: 'BUY' | 'SELL';
  source: string;
  confidence: number;
  reason: string;
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  executed: boolean;
  price?: number;
}

interface TradingState {
  activePairs: string[];
  strategyMode: string;
  strategies: string[];
  maxPositionSize: number;
  stopLoss: number;
  takeProfit: number;
  tradingAllocation: number;
  autoTrade: boolean;
  newsSources: Record<string, boolean>;
  botActive: boolean;
  totalEquity: number;
  unrealizedPnl: number;
  usdBalance: number;
  allocationUsed: number;
  allocationAvailable: number;
  openPositions: Position[];
  recentSignals: Signal[];
  tickerData: any[];
  wsConnected: boolean;
  apiConnected: boolean;
  loading: boolean;
  setActivePairs: (pairs: string[]) => void;
  setStrategyMode: (mode: string) => void;
  toggleStrategy: (strategy: string) => void;
  setMaxPositionSize: (val: number) => void;
  setStopLoss: (val: number) => void;
  setTakeProfit: (val: number) => void;
  setTradingAllocation: (val: number) => void;
  setAutoTrade: (val: boolean) => void;
  toggleNewsSource: (source: string) => void;
  refreshData: () => Promise<void>;
  saveConfig: () => Promise<void>;
}

const TradingContext = createContext<TradingState | null>(null);

export function TradingProvider({ children }: { children: React.ReactNode }) {
  const { connected: wsConnected, tickers: wsTickers, signals: wsSignals } = useWebSocket();

  const [activePairs, setActivePairs] = useState<string[]>(['ETH/USD', 'BTC/USD']);
  const [strategyMode, setStrategyMode] = useState('News-Driven');
  const [strategies, setStrategies] = useState<string[]>(['Momentum', 'Breakout']);
  const [maxPositionSize, setMaxPositionSize] = useState(25);
  const [stopLoss, setStopLoss] = useState(2.5);
  const [takeProfit, setTakeProfit] = useState(5);
  const [tradingAllocation, setTradingAllocation] = useState(1000);
  const [autoTrade, setAutoTrade] = useState(false);
  const [newsSources, setNewsSources] = useState<Record<string, boolean>>({
    'CryptoPanic': true,
    'Kraken API': true,
    'Economic Calendar': true,
  });
  const [totalEquity, setTotalEquity] = useState(12847.32);
  const [unrealizedPnl, setUnrealizedPnl] = useState(324.18);
  const [usdBalance, setUsdBalance] = useState(2847.32);
  const [allocationUsed, setAllocationUsed] = useState(0);
  const [allocationAvailable, setAllocationAvailable] = useState(1000);
  const [openPositions, setOpenPositions] = useState<Position[]>([
    { pair: 'ETH/USD', side: 'BUY', entryPrice: 3842.15, currentPrice: 3876.22, pnl: 34.07 },
    { pair: 'BTC/USD', side: 'BUY', entryPrice: 97420.50, currentPrice: 98115.33, pnl: 694.83 },
  ]);
  const [recentSignals, setRecentSignals] = useState<Signal[]>([]);
  const [tickerData, setTickerData] = useState<any[]>([]);
  const [apiConnected, setApiConnected] = useState(false);
  const [loading, setLoading] = useState(true);

  const botActive = true;

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Health check
      const health = await api.getHealth();
      setApiConnected(health.status === 'ok');

      // Config
      const configRes = await api.getConfig();
      if (configRes.success) {
        const cfg = configRes.data;
        setActivePairs(cfg.activePairs || ['ETH/USD', 'BTC/USD']);
        setStrategyMode(cfg.strategyMode || 'News-Driven');
        setStrategies(cfg.strategies || ['Momentum', 'Breakout']);
        setMaxPositionSize(cfg.maxPositionSize || 25);
        setStopLoss(cfg.stopLossPercent || 2.5);
        setTakeProfit(cfg.takeProfitPercent || 5);
        setTradingAllocation(cfg.tradingAllocation || 1000);
        setAutoTrade(cfg.autoTrade || false);
        if (cfg.newsSources) {
          const sources: Record<string, boolean> = {};
          cfg.newsSources.forEach((s: string) => { sources[s] = true; });
          setNewsSources(sources);
        }
      }

      // Portfolio
      const portfolioRes = await api.getPortfolio();
      if (portfolioRes.success) {
        setTotalEquity(portfolioRes.data.totalEquity || 12847.32);
        setUnrealizedPnl(portfolioRes.data.unrealizedPnl || 324.18);
      }

      // Balance / Allocation
      try {
        const balanceRes = await api.getBalance();
        if (balanceRes.success) {
          setUsdBalance(balanceRes.data.usdBalance || 2847.32);
          setAllocationUsed(balanceRes.data.used || 0);
          setAllocationAvailable(balanceRes.data.available || 1000);
        }
      } catch (e) {
        // Balance endpoint may fail if backend offline
      }

      // Tickers
      const tickerRes = await api.getTickers(['XETHZUSD', 'XXBTZUSD']);
      if (tickerRes.success) {
        setTickerData(tickerRes.data);
        setOpenPositions(prev => prev.map(pos => {
          const ticker = tickerRes.data.find((t: any) =>
            (pos.pair === 'ETH/USD' && t.pair.includes('ETH')) ||
            (pos.pair === 'BTC/USD' && t.pair.includes('XBT'))
          );
          if (ticker) {
            const priceDiff = ticker.last - pos.entryPrice;
            return { ...pos, currentPrice: ticker.last, pnl: priceDiff * (pos.pair === 'BTC/USD' ? 0.01 : 0.5) };
          }
          return pos;
        }));
      }

      // Signals
      const signalsRes = await api.getSignals(10);
      if (signalsRes.success) {
        setRecentSignals(signalsRes.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch data:', err.message);
      setApiConnected(false);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchAllData, 30000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  // Update from WebSocket
  useEffect(() => {
    if (wsTickers.length > 0) setTickerData(wsTickers);
  }, [wsTickers]);

  useEffect(() => {
    if (wsSignals.length > 0) setRecentSignals(wsSignals);
  }, [wsSignals]);

  const toggleStrategy = (strategy: string) => {
    setStrategies(prev =>
      prev.includes(strategy) ? prev.filter(s => s !== strategy) : [...prev, strategy]
    );
  };

  const toggleNewsSource = (source: string) => {
    setNewsSources(prev => ({ ...prev, [source]: !prev[source] }));
  };

  const saveConfig = async () => {
    try {
      await api.updateConfig({
        activePairs,
        strategyMode,
        strategies,
        maxPositionSize,
        stopLossPercent: stopLoss,
        takeProfitPercent: takeProfit,
        tradingAllocation,
        autoTrade,
        newsSources: Object.entries(newsSources).filter(([, v]) => v).map(([k]) => k),
      });
    } catch (err: any) {
      console.error('Failed to save config:', err.message);
    }
  };

  return (
    <TradingContext.Provider value={{
      activePairs, strategyMode, strategies, maxPositionSize, stopLoss, takeProfit,
      tradingAllocation, autoTrade, newsSources, botActive, totalEquity, unrealizedPnl,
      usdBalance, allocationUsed, allocationAvailable, openPositions, recentSignals,
      tickerData, wsConnected, apiConnected, loading,
      setActivePairs, setStrategyMode, toggleStrategy, setMaxPositionSize,
      setStopLoss, setTakeProfit, setTradingAllocation, setAutoTrade, toggleNewsSource,
      refreshData: fetchAllData, saveConfig,
    }}>
      {children}
    </TradingContext.Provider>
  );
}

export function useTrading() {
  const ctx = useContext(TradingContext);
  if (!ctx) throw new Error('useTrading must be used within TradingProvider');
  return ctx;
}
