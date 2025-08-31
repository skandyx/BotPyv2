export enum TradingMode {
  VIRTUAL = "VIRTUAL",
  REAL_PAPER = "REAL_PAPER",
  REAL_LIVE = "REAL_LIVE"
}

export enum OrderSide {
  BUY = "BUY",
  SELL = "SELL",
}

export enum OrderStatus {
  PENDING = "PENDING",
  FILLED = "FILLED",
  CANCELLED = "CANCELLED",
  CLOSED = "CLOSED",
}

export enum WebSocketStatus {
    CONNECTING = "CONNECTING",
    CONNECTED = "CONNECTED",
    DISCONNECTED = "DISCONNECTED",
}

export interface Trade {
  id: number;
  mode: TradingMode;
  symbol: string;
  side: OrderSide;
  entry_price: number;
  current_price?: number;
  priceDirection?: 'up' | 'down' | 'neutral';
  exit_price?: number;
  quantity: number;
  initial_quantity?: number; // For tracking partial sells
  stop_loss: number;
  take_profit: number;
  highest_price_since_entry: number; // For Trailing Stop Loss
  entry_time: string;
  exit_time?: string;
  pnl?: number;
  pnl_pct?: number;
  status: OrderStatus;
  initial_risk_usd?: number; // The initial $ amount at risk
  is_at_breakeven?: boolean;
  partial_tp_hit?: boolean;
  realized_pnl?: number; // For tracking profit from partial sells
  entry_snapshot?: ScannedPair; // Capture scanner state at entry
}

export interface StrategyConditions {
    trend: boolean;
    squeeze: boolean;
    breakout: boolean;
    volume: boolean;
    safety: boolean;
    structure?: boolean; // New: For 15m high breakout confirmation
}

export interface ScannedPair {
    symbol: string;
    volume: number;
    price: number;
    priceDirection: 'up' | 'down' | 'neutral';
    
    // --- Core Strategy Indicators ---
    macro_trend_score?: number; // Suggestion 1: Replaces price_above_ema50_4h
    price_above_ema50_4h?: boolean; // Kept for the condition dot logic
    rsi_1h?: number; // Safety filter (anti-overheating)
    bollinger_bands_15m?: { upper: number; middle: number; lower: number; width_pct: number; }; // Preparation/Trigger
    is_in_squeeze_15m?: boolean; // Preparation
    volume_20_period_avg_15m?: number; // Confirmation
    atr_15m?: number; // For ATR Stop Loss calculation
    adx_15m?: number; // For dynamic profile selection (trend strength)
    atr_pct_15m?: number; // For dynamic profile selection (volatility)
    
    // --- Realtime Calculated Fields ---
    score: 'STRONG BUY' | 'BUY' | 'HOLD' | 'COOLDOWN' | 'COMPRESSION' | 'FAKE_BREAKOUT';
    score_value?: number; // Numerical representation of the score
    conditions?: StrategyConditions;
    conditions_met_count?: number; // From 0 to 5
    is_on_hotlist?: boolean; // New: True if conditions are met for 1m precision entry
}


export interface PerformanceStats {
    total_trades: number;
    winning_trades: number;
    losing_trades: number;
    total_pnl: number;
    avg_pnl_pct: number;
    win_rate: number;
}

export interface BotStatus {
    mode: TradingMode;
    balance: number;
    positions: number;
    monitored_pairs: number;
    top_pairs: string[];
    max_open_positions: number;
}

export interface LogEntry {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'TRADE' | 'WEBSOCKET' | 'SCANNER' | 'BINANCE_API' | 'BINANCE_WS' | 'API_CLIENT' | 'CIRCUIT_BREAKER';
    message: string;
}

export const LOG_LEVELS: Readonly<Array<LogEntry['level']>> = ['INFO', 'API_CLIENT', 'WARN', 'ERROR', 'TRADE', 'WEBSOCKET', 'SCANNER', 'BINANCE_API', 'BINANCE_WS', 'CIRCUIT_BREAKER'];
export type LogTab = 'ALL' | LogEntry['level'];


export interface BotSettings {
    // Trading Parameters
    INITIAL_VIRTUAL_BALANCE: number;
    MAX_OPEN_POSITIONS: number;
    POSITION_SIZE_PCT: number;
    SLIPPAGE_PCT: number;

    // Suggestion 3: ATR-Based Trade Management
    SL_ATR_MULTIPLIER: number;
    TP_ATR_MULTIPLIER: number;
    USE_TRAILING_STOP_LOSS: boolean;
    TRAILING_STOP_ATR_MULTIPLIER: number;
    
    // Market Scanner & Strategy Filters
    MIN_VOLUME_USD: number;
    SCANNER_DISCOVERY_INTERVAL_SECONDS: number;
    EXCLUDED_PAIRS: string;
    USE_VOLUME_CONFIRMATION: boolean;
    USE_MARKET_REGIME_FILTER: boolean; // Now interpreted as a score threshold
    REQUIRE_STRONG_BUY: boolean;
    LOSS_COOLDOWN_HOURS: number;
    
    // API Credentials
    BINANCE_API_KEY: string;
    BINANCE_SECRET_KEY: string;

    // --- ADVANCED STRATEGY & RISK MANAGEMENT ---
    
    // Auto Break-even
    USE_AUTO_BREAKEVEN: boolean;
    BREAKEVEN_TRIGGER_PCT: number; // PnL % to trigger break-even
    ADJUST_BREAKEVEN_FOR_FEES: boolean;
    TRANSACTION_FEE_PCT: number;

    // RSI Overbought Filter
    RSI_OVERBOUGHT_THRESHOLD: number;
    
    // Partial Take Profit
    USE_PARTIAL_TAKE_PROFIT: boolean;
    PARTIAL_TP_TRIGGER_PCT: number; // PnL % to trigger the partial sell
    PARTIAL_TP_SELL_QTY_PCT: number; // % of original position to sell

    // Dynamic Position Sizing
    USE_DYNAMIC_POSITION_SIZING: boolean;
    STRONG_BUY_POSITION_SIZE_PCT: number;

    // Parabolic Move Filter
    USE_PARABOLIC_FILTER: boolean;
    PARABOLIC_FILTER_PERIOD_MINUTES: number;
    PARABOLIC_FILTER_THRESHOLD_PCT: number;

    // The single source of truth for the RSI safety filter toggle
    USE_RSI_SAFETY_FILTER: boolean;

    // --- ADAPTIVE BEHAVIOR ---
    USE_DYNAMIC_PROFILE_SELECTOR: boolean;
    ADX_THRESHOLD_RANGE: number; // e.g., below 20 indicates a ranging market
    ATR_PCT_THRESHOLD_VOLATILE: number; // e.g., above 5% indicates a volatile market

    // --- SUGGESTION 4: GLOBAL CIRCUIT BREAKER ---
    USE_CIRCUIT_BREAKER: boolean;
    CIRCUIT_BREAKER_SYMBOL: string;
    CIRCUIT_BREAKER_THRESHOLD_PCT: number;
    CIRCUIT_BREAKER_PERIOD_MINUTES: number;
    CIRCUIT_BREAKER_COOLDOWN_HOURS: number;
}
