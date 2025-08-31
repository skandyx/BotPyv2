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

export enum CircuitBreakerStatus {
  INACTIVE = "INACTIVE",
  ALERT = "ALERT",
  ACTIVE = "ACTIVE",
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
  initial_quantity?: number;
  stop_loss: number;
  take_profit: number;
  highest_price_since_entry: number;
  entry_time: string;
  exit_time?: string;
  pnl?: number;
  pnl_pct?: number;
  status: OrderStatus;
  entry_snapshot?: ScannedPair;
  // --- Advanced Trade Management ---
  initial_risk_per_unit?: number; // entry_price - initial_stop_loss
  trailing_stop_tightened?: boolean; // If adaptive trailing has been triggered
  current_trailing_stop_atr_multiplier?: number;
}


export interface StrategyConditions {
    trend: boolean;
    squeeze: boolean;
    structure: boolean;
    volume: boolean;
    safety: boolean;
}

export interface ScannedPair {
    symbol: string;
    volume: number;
    price: number;
    priceDirection: 'up' | 'down' | 'neutral';
    
    // --- Core Strategy Indicators ---
    macro_trend_score?: number; // Suggestion 1
    adx_4h?: number; // For score
    rsi_4h?: number; // For score
    rsi_1h?: number; // Safety filter
    bollinger_bands_15m?: { upper: number; middle: number; lower: number; width_pct: number; };
    is_in_squeeze_15m?: boolean;
    is_atr_falling_15m?: boolean; // Suggestion 2
    previous_15m_high?: number; // For structure confirmation
    volume_20_period_avg_15m?: number;
    atr_15m?: number;
    adx_15m?: number;
    atr_pct_15m?: number;
    
    // --- Realtime Calculated Fields ---
    score_value?: number;
    conditions?: StrategyConditions;
    conditions_met_count?: number;
    is_on_hotlist?: boolean;
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

    // ATR-Based Trade Management
    SL_ATR_MULTIPLIER: number;
    TP_ATR_MULTIPLIER: number;
    USE_TRAILING_STOP_LOSS: boolean;
    TRAILING_STOP_ATR_MULTIPLIER: number;
    
    // Suggestion 4: Adaptive Trailing Stop
    USE_ADAPTIVE_TRAILING_STOP: boolean;
    ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: number;
    
    // Market Scanner & Strategy Filters
    MIN_VOLUME_USD: number;
    SCANNER_DISCOVERY_INTERVAL_SECONDS: number;
    EXCLUDED_PAIRS: string;
    // FIX: Add RSI_OVERBOUGHT_THRESHOLD to the BotSettings interface.
    RSI_OVERBOUGHT_THRESHOLD: number;
    
    // Suggestion 3: Aggressive Mode for Entry
    AGGRESSIVE_ENTRY_PROFILES: string; // e.g., "Le Chasseur de Volatilité"

    // API Credentials
    BINANCE_API_KEY: string;
    BINANCE_SECRET_KEY: string;

    // --- ADAPTIVE BEHAVIOR ---
    USE_DYNAMIC_PROFILE_SELECTOR: boolean;
    ADX_THRESHOLD_RANGE: number;
    ATR_PCT_THRESHOLD_VOLATILE: number;

    // --- SUGGESTION 5: GRADUATED GLOBAL CIRCUIT BREAKER ---
    USE_CIRCUIT_BREAKER: boolean;
    CIRCUIT_BREAKER_SYMBOL: string;
    CIRCUIT_BREAKER_PERIOD_MINUTES: number;
    CIRCUIT_BREAKER_ALERT_THRESHOLD_PCT: number; // Alert Level
    CIRCUIT_BREAKER_BLOCK_THRESHOLD_PCT: number; // Block Level
    CIRCUIT_BREAKER_ALERT_POSITION_SIZE_MULTIPLIER: number; // e.g., 0.5 to halve position size
    CIRCUIT_BREAKER_COOLDOWN_HOURS: number;
}