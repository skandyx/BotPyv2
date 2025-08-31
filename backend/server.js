


import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import session from 'express-session';
import { WebSocketServer } from 'ws';
import WebSocket from 'ws';
import http from 'http';
import fetch from 'node-fetch';
import { ScannerService } from './ScannerService.js';
import { RSI, ADX, ATR, BollingerBands, EMA } from 'technicalindicators';


// --- Basic Setup ---
dotenv.config();
const app = express();
const port = process.env.PORT || 8080;
const server = http.createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(bodyParser.json());
app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET || 'a_much_more_secure_and_random_secret_string_32_chars_long',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24
    }
}));

// --- WebSocket Server ---
const wss = new WebSocketServer({ noServer: true });
const clients = new Set();
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
});
wss.on('connection', (ws) => {
    clients.add(ws);
    log('WEBSOCKET', 'Frontend client connected.');
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'GET_FULL_SCANNER_LIST') {
                ws.send(JSON.stringify({ type: 'FULL_SCANNER_LIST', payload: botState.scannerCache }));
            }
        } catch (e) { log('ERROR', `Failed to parse client message: ${message}`); }
    });
    ws.on('close', () => clients.delete(ws));
    ws.on('error', (error) => { log('ERROR', `WS client error: ${error.message}`); ws.close(); });
});
function broadcast(message) {
    const data = JSON.stringify(message);
    for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) client.send(data);
    }
}

// --- Logging ---
const log = (level, message) => {
    console.log(`[${new Date().toISOString()}] [${level}] ${message}`);
    broadcast({ type: 'LOG_ENTRY', payload: { timestamp: new Date().toISOString(), level, message } });
};

// --- Persistence ---
const DATA_DIR = path.join(process.cwd(), 'data');
const SETTINGS_FILE_PATH = path.join(DATA_DIR, 'settings.json');
const STATE_FILE_PATH = path.join(DATA_DIR, 'state.json');
const ensureDataDir = async () => { try { await fs.access(DATA_DIR); } catch { await fs.mkdir(DATA_DIR); } };

const loadData = async () => {
    await ensureDataDir();
    try {
        botState.settings = JSON.parse(await fs.readFile(SETTINGS_FILE_PATH, 'utf-8'));
    } catch {
        log("WARN", "settings.json not found. Loading defaults.");
        botState.settings = {
            INITIAL_VIRTUAL_BALANCE: 10000, MAX_OPEN_POSITIONS: 5, POSITION_SIZE_PCT: 2.0,
            SL_ATR_MULTIPLIER: 1.5, TP_ATR_MULTIPLIER: 3.0, USE_TRAILING_STOP_LOSS: true,
            TRAILING_STOP_ATR_MULTIPLIER: 2.0, USE_ADAPTIVE_TRAILING_STOP: true,
            ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: 1.2, MIN_VOLUME_USD: 10000000,
            SCANNER_DISCOVERY_INTERVAL_SECONDS: 3600, EXCLUDED_PAIRS: "USDCUSDT,FDUSDUSDT",
            AGGRESSIVE_ENTRY_PROFILES: "Le Chasseur de Volatilité", BINANCE_API_KEY: "", BINANCE_SECRET_KEY: "",
            USE_DYNAMIC_PROFILE_SELECTOR: true, ADX_THRESHOLD_RANGE: 20, ATR_PCT_THRESHOLD_VOLATILE: 5,
            RSI_OVERBOUGHT_THRESHOLD: 75,
            USE_CIRCUIT_BREAKER: true, CIRCUIT_BREAKER_SYMBOL: "BTCUSDT", CIRCUIT_BREAKER_PERIOD_MINUTES: 5,
            CIRCUIT_BREAKER_ALERT_THRESHOLD_PCT: -1.5,
            CIRCUIT_BREAKER_BLOCK_THRESHOLD_PCT: -2.5,
            CIRCUIT_BREAKER_ALERT_POSITION_SIZE_MULTIPLIER: 0.5, CIRCUIT_BREAKER_COOLDOWN_HOURS: 1,
            SLIPPAGE_PCT: 0.05
        };
        await saveData('settings');
    }
    try {
        const persisted = JSON.parse(await fs.readFile(STATE_FILE_PATH, 'utf-8'));
        botState.balance = persisted.balance || botState.settings.INITIAL_VIRTUAL_BALANCE;
        botState.activePositions = persisted.activePositions || [];
        botState.tradeHistory = persisted.tradeHistory || [];
        botState.tradeIdCounter = persisted.tradeIdCounter || 1;
        botState.isRunning = persisted.isRunning !== undefined ? persisted.isRunning : true;
        botState.tradingMode = persisted.tradingMode || 'VIRTUAL';
    } catch {
        log("WARN", "state.json not found. Initializing default state.");
        botState.balance = botState.settings.INITIAL_VIRTUAL_BALANCE;
        await saveData('state');
    }

    // --- Simplified Auth Check ---
    const pwFromEnv = process.env.APP_PASSWORD;
    if (!pwFromEnv) {
        log('ERROR', 'CRITICAL: APP_PASSWORD is not set in your .env file. Please configure it and restart.');
        process.exit(1);
    }
    log('INFO', 'Authentication is unhashed and will be checked directly against .env file.');
    
    scanner.updateSettings(botState.settings);
    realtimeAnalyzer.updateSettings(botState.settings);
};

const saveData = async (type) => {
    await ensureDataDir();
    if (type === 'settings') {
        await fs.writeFile(SETTINGS_FILE_PATH, JSON.stringify(botState.settings, null, 2));
    } else if (type === 'state') {
        const state = {
            balance: botState.balance, activePositions: botState.activePositions,
            tradeHistory: botState.tradeHistory, tradeIdCounter: botState.tradeIdCounter,
            isRunning: botState.isRunning, tradingMode: botState.tradingMode,
        };
        await fs.writeFile(STATE_FILE_PATH, JSON.stringify(state, null, 2));
    }
};

class RealtimeAnalyzer {
    constructor(l) { this.log = l; this.settings = {}; this.klineData = new Map(); this.hydrating = new Set(); this.SQUEEZE_PERCENTILE = 0.25; this.SQUEEZE_LOOKBACK = 50; }
    updateSettings(s) { this.log('INFO', '[Analyzer] Settings updated.'); this.settings = s; }

    analyze15mIndicators(pair) {
        const klines15m = this.klineData.get(pair.symbol)?.get('15m');
        if (!klines15m || klines15m.length < this.SQUEEZE_LOOKBACK) return;
        const closes = klines15m.map(d => d.close), highs = klines15m.map(d => d.high), lows = klines15m.map(d => d.low);
        const bb = BollingerBands.calculate({ period: 20, values: closes, stdDev: 2 });
        const atr = ATR.calculate({ high: highs, low: lows, close: closes, period: 14 });
        const adx = ADX.calculate({ high: highs, low: lows, close: closes, period: 14 });
        if (bb.length < 2 || !atr.length) return;

        const bbWidths = bb.map(b => (b.upper - b.lower) / b.middle);
        const atrValues = atr.map(a => a);
        
        const prevIdx = bbWidths.length - 2;
        const prevBBWidth = bbWidths[prevIdx];
        const prevAtr = atrValues[atrValues.length - 2];
        const currentAtr = atrValues[atrValues.length - 1];

        const historyForSqueeze = bbWidths.slice(0, prevIdx + 1).slice(-this.SQUEEZE_LOOKBACK);
        const sortedWidths = [...historyForSqueeze].sort((a, b) => a - b);
        const squeezeThreshold = sortedWidths[Math.floor(sortedWidths.length * this.SQUEEZE_PERCENTILE)];
        
        pair.is_in_squeeze_15m = prevBBWidth <= squeezeThreshold;
        pair.is_atr_falling_15m = currentAtr < prevAtr;
        pair.atr_15m = currentAtr;
        pair.adx_15m = adx.length ? adx[adx.length - 1].adx : undefined;
        pair.atr_pct_15m = (currentAtr / pair.price) * 100;
        pair.previous_15m_high = highs[highs.length - 2];

        const oldHotlist = pair.is_on_hotlist;
        const trendOK = pair.macro_trend_score > 50;
        pair.is_on_hotlist = trendOK && pair.is_in_squeeze_15m && pair.is_atr_falling_15m;
        
        if (pair.is_on_hotlist && !oldHotlist) {
            this.log('SCANNER', `[HOTLIST ADD] ${pair.symbol} (Score: ${pair.macro_trend_score.toFixed(0)}, Squeeze+ATR Fall OK)`);
            addSymbolTo1mStream(pair.symbol);
        } else if (!pair.is_on_hotlist && oldHotlist) {
            this.log('SCANNER', `[HOTLIST REMOVE] ${pair.symbol}`);
            removeSymbolFrom1mStream(pair.symbol);
        }
        
        broadcast({ type: 'SCANNER_UPDATE', payload: pair });
    }

    analyze1mIndicators(symbol) {
        const pair = botState.scannerCache.find(p => p.symbol === symbol);
        if (!pair || !pair.is_on_hotlist) return;
        const klines1m = this.klineData.get(symbol)?.get('1m');
        if (!klines1m || klines1m.length < 21) return;

        const closes1m = klines1m.map(k => k.close), volumes1m = klines1m.map(k => k.volume);
        const lastEma9 = EMA.calculate({ period: 9, values: closes1m }).pop();
        const avgVol = volumes1m.slice(-21, -1).reduce((s, v) => s + v, 0) / 20;
        if (lastEma9 === undefined) return;
        
        const candle = klines1m[klines1m.length - 1];
        const momoOK = candle.close > lastEma9;
        const volOK = candle.volume > avgVol * 1.5;
        const isAggressiveProfile = (this.settings.AGGRESSIVE_ENTRY_PROFILES || "").includes(botState.activeProfileName);
        const structureOK = isAggressiveProfile || candle.close > pair.previous_15m_high;

        if (momoOK && volOK && structureOK) {
            this.log('TRADE', `[1m TRIGGER] Signal for ${symbol}. Aggressive: ${isAggressiveProfile}, Structure Broke: ${candle.close > pair.previous_15m_high}`);
            if (tradingEngine.evaluateAndOpenTrade(pair)) {
                pair.is_on_hotlist = false;
                removeSymbolFrom1mStream(symbol);
                broadcast({ type: 'SCANNER_UPDATE', payload: pair });
            }
        }
    }

    async hydrateSymbol(s, i) {
        const klineLimit = i === '1m' ? 50 : 201;
        if (this.hydrating.has(`${s}-${i}`)) return;
        this.hydrating.add(`${s}-${i}`);
        try {
            const klines = await scanner.fetchKlinesFromBinance(s, i, 0, klineLimit);
            const formatted = klines.map(k => ({ open: parseFloat(k[1]), high: parseFloat(k[2]), low: parseFloat(k[3]), close: parseFloat(k[4]), volume: parseFloat(k[5]) }));
            if (!this.klineData.has(s)) this.klineData.set(s, new Map());
            this.klineData.get(s).set(i, formatted);
            if (i === '15m') this.analyze15mIndicators(botState.scannerCache.find(p => p.symbol === s));
        } catch (e) { this.log('ERROR', `Failed to hydrate ${s} (${i}): ${e.message}`); } finally { this.hydrating.delete(`${s}-${i}`); }
    }

    handleNewKline(s, i, k) {
        if (!this.klineData.has(s) || !this.klineData.get(s).has(i)) { this.hydrateSymbol(s, i); return; }
        const klines = this.klineData.get(s).get(i);
        klines.push(k);
        if (klines.length > 201) klines.shift();
        if (i === '15m') this.analyze15mIndicators(botState.scannerCache.find(p => p.symbol === s));
        else if (i === '1m') this.analyze1mIndicators(s);
    }
}
const realtimeAnalyzer = new RealtimeAnalyzer(log);

// --- Binance WebSocket ---
let binanceWs; const subscribedStreams = new Set();
const connectToBinance = () => {
    if (binanceWs && (binanceWs.readyState < 2)) return;
    binanceWs = new WebSocket('wss://stream.binance.com:9443/ws');
    binanceWs.on('open', () => { log('BINANCE_WS', 'Connected.'); if (subscribedStreams.size > 0) binanceWs.send(JSON.stringify({ method: "SUBSCRIBE", params: [...subscribedStreams], id: 1 })); });
    binanceWs.on('message', (d) => {
        const msg = JSON.parse(d);
        if (msg.e === 'kline' && msg.k.x) {
            const { s: symbol, k: kline } = msg;
            realtimeAnalyzer.handleNewKline(symbol, kline.i, { open: parseFloat(kline.o), high: parseFloat(kline.h), low: parseFloat(kline.l), close: parseFloat(kline.c), volume: parseFloat(kline.v) });
        } else if (msg.e === '24hrTicker') {
            const p = botState.scannerCache.find(pair => pair.symbol === msg.s);
            if (p) {
                const oldPrice = p.price;
                p.price = parseFloat(msg.c);
                p.volume = parseFloat(msg.q);
                p.priceDirection = p.price > oldPrice ? 'up' : p.price < oldPrice ? 'down' : p.priceDirection;
                broadcast({ type: 'SCANNER_UPDATE', payload: p });
            }
            botState.priceCache.set(msg.s, parseFloat(msg.c));
            broadcast({ type: 'PRICE_UPDATE', payload: { symbol: msg.s, price: parseFloat(msg.c) } });
        }
    });
    binanceWs.on('close', () => { log('WARN', 'Binance WS disconnected. Reconnecting...'); setTimeout(connectToBinance, 5000); });
    binanceWs.on('error', (err) => log('ERROR', `Binance WS error: ${err.message}`));
};
const updateSubs = (symbols) => {
    const newStreams = new Set([...symbols.map(s => `${s.toLowerCase()}@ticker`), ...symbols.map(s => `${s.toLowerCase()}@kline_15m`), ...[...botState.hotlist].map(s => `${s.toLowerCase()}@kline_1m`)]);
    const toUnsub = [...subscribedStreams].filter(s => !newStreams.has(s)), toSub = [...newStreams].filter(s => !subscribedStreams.has(s));
    if (binanceWs && binanceWs.readyState === 1) {
        if (toUnsub.length) binanceWs.send(JSON.stringify({ method: "UNSUBSCRIBE", params: toUnsub, id: 2 }));
        if (toSub.length) binanceWs.send(JSON.stringify({ method: "SUBSCRIBE", params: toSub, id: 3 }));
    }
    newStreams.forEach(s => subscribedStreams.add(s));
};
const addSymbolTo1mStream = (s) => { botState.hotlist.add(s); updateSubs(botState.scannerCache.map(p => p.symbol)); realtimeAnalyzer.hydrateSymbol(s, '1m'); };
const removeSymbolFrom1mStream = (s) => { botState.hotlist.delete(s); updateSubs(botState.scannerCache.map(p => p.symbol)); };

// --- Bot State & Core ---
let botState = {
    settings: {}, balance: 10000, activePositions: [], tradeHistory: [], tradeIdCounter: 1,
    scannerCache: [], isRunning: true, tradingMode: 'VIRTUAL',
    hotlist: new Set(), priceCache: new Map(), circuitBreakerStatus: 'INACTIVE', activeProfileName: 'PERSONNALISE'
};
const scanner = new ScannerService(log);
let scannerInterval, cbMonitorInterval;

async function runScannerCycle() {
    if (!botState.isRunning) return;
    try {
        const pairs = await scanner.runScan(botState.settings);
        const newSymbols = pairs.filter(p => !botState.scannerCache.some(c => c.symbol === p.symbol)).map(p => p.symbol);
        botState.scannerCache = pairs;
        if (newSymbols.length) await Promise.all(newSymbols.map(s => realtimeAnalyzer.hydrateSymbol(s, '15m')));
        updateSubs(pairs.map(p => p.symbol));
    } catch (e) { log('ERROR', `Scanner cycle failed: ${e.message}`); }
}

const settingProfiles = {
    'Le Sniper': { SL_ATR_MULTIPLIER: 1.5, TP_ATR_MULTIPLIER: 4.0, USE_TRAILING_STOP_LOSS: true, TRAILING_STOP_ATR_MULTIPLIER: 2.0, USE_ADAPTIVE_TRAILING_STOP: true, ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: 1.2 },
    'Le Scalpeur': { SL_ATR_MULTIPLIER: 1.2, TP_ATR_MULTIPLIER: 1.5, USE_TRAILING_STOP_LOSS: false, USE_ADAPTIVE_TRAILING_STOP: false },
    'Le Chasseur de Volatilité': { SL_ATR_MULTIPLIER: 2.5, TP_ATR_MULTIPLIER: 6.0, USE_TRAILING_STOP_LOSS: true, TRAILING_STOP_ATR_MULTIPLIER: 1.2, USE_ADAPTIVE_TRAILING_STOP: true, ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: 1.0 }
};

const tradingEngine = {
    evaluateAndOpenTrade(pair) {
        if (!botState.isRunning || botState.circuitBreakerStatus === 'ACTIVE') return false;
        const s = botState.settings; let tradeSettings = { ...s }; let profileName = 'PERSONNALISE';
        if (s.USE_DYNAMIC_PROFILE_SELECTOR) {
            if (pair.adx_15m < s.ADX_THRESHOLD_RANGE) profileName = 'Le Scalpeur';
            else if (pair.atr_pct_15m > s.ATR_PCT_THRESHOLD_VOLATILE) profileName = 'Le Chasseur de Volatilité';
            else profileName = 'Le Sniper';
            tradeSettings = { ...tradeSettings, ...settingProfiles[profileName] };
            botState.activeProfileName = profileName;
            log('TRADE', `[PROFILE] Dynamic: ${profileName} for ${pair.symbol}`);
        }
        if (botState.activePositions.length >= s.MAX_OPEN_POSITIONS || botState.activePositions.some(p => p.symbol === pair.symbol)) return false;
        
        let posSizePct = tradeSettings.POSITION_SIZE_PCT;
        if (botState.circuitBreakerStatus === 'ALERT') posSizePct *= s.CIRCUIT_BREAKER_ALERT_POSITION_SIZE_MULTIPLIER;
        const posSizeUSD = botState.balance * (posSizePct / 100), qty = posSizeUSD / pair.price;
        const sl = pair.price - (pair.atr_15m * tradeSettings.SL_ATR_MULTIPLIER);
        if (sl >= pair.price) { log('ERROR', `Invalid SL for ${pair.symbol}. SL (${sl}) must be below entry (${pair.price}).`); return false; }
        const riskPerUnit = pair.price - sl;
        const tp = pair.price + (riskPerUnit * (tradeSettings.TP_ATR_MULTIPLIER / tradeSettings.SL_ATR_MULTIPLIER));

        const newTrade = {
            id: botState.tradeIdCounter++, mode: botState.tradingMode, symbol: pair.symbol, side: 'BUY',
            entry_price: pair.price, quantity: qty, initial_quantity: qty, stop_loss: sl, take_profit: tp,
            highest_price_since_entry: pair.price, entry_time: new Date().toISOString(), status: 'FILLED',
            entry_snapshot: { ...pair }, initial_risk_per_unit: riskPerUnit, trailing_stop_tightened: false,
            current_trailing_stop_atr_multiplier: tradeSettings.TRAILING_STOP_ATR_MULTIPLIER,
        };
        log('TRADE', `>>> FIRING [${profileName}] TRADE <<< ${pair.symbol} Qty=${qty.toFixed(4)}, Entry=$${pair.price}, SL=$${sl.toFixed(4)}, TP=$${tp.toFixed(4)}`);
        botState.activePositions.push(newTrade);
        botState.balance -= posSizeUSD;
        saveData('state'); broadcast({ type: 'POSITIONS_UPDATED' }); return true;
    },
    monitorAndManagePositions() {
        if (!botState.isRunning) return;
        let stateChanged = false;
        for (const pos of botState.activePositions) {
            const price = botState.priceCache.get(pos.symbol); if (!price) continue;
            pos.highest_price_since_entry = Math.max(pos.highest_price_since_entry, price);
            if (price <= pos.stop_loss) { this.closeTrade(pos.id, pos.stop_loss, 'Stop Loss'); stateChanged = true; continue; }
            if (price >= pos.take_profit) { this.closeTrade(pos.id, pos.take_profit, 'Take Profit'); stateChanged = true; continue; }
            
            const s = botState.settings;
            if (s.USE_TRAILING_STOP_LOSS) {
                if (s.USE_ADAPTIVE_TRAILING_STOP && !pos.trailing_stop_tightened && pos.initial_risk_per_unit && price >= pos.entry_price + pos.initial_risk_per_unit) {
                    pos.current_trailing_stop_atr_multiplier = s.ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER;
                    pos.trailing_stop_tightened = true;
                    log('TRADE', `[${pos.symbol}] Adaptive SL triggered. Multiplier tightened to ${pos.current_trailing_stop_atr_multiplier}x ATR.`);
                }
                const newSL = pos.highest_price_since_entry - (pos.entry_snapshot.atr_15m * pos.current_trailing_stop_atr_multiplier);
                if (newSL > pos.stop_loss) pos.stop_loss = newSL;
            }
        }
        if (stateChanged) { saveData('state'); broadcast({ type: 'POSITIONS_UPDATED' }); }
    },
    closeTrade(id, exitPrice, reason) {
        const idx = botState.activePositions.findIndex(t => t.id === id); if (idx === -1) return null;
        const [trade] = botState.activePositions.splice(idx, 1);
        const pnl = (exitPrice - trade.entry_price) * trade.initial_quantity;
        trade.exit_price = exitPrice; trade.exit_time = new Date().toISOString(); trade.status = 'CLOSED';
        trade.pnl = pnl; trade.pnl_pct = (pnl / (trade.entry_price * trade.initial_quantity)) * 100;
        botState.balance += (trade.entry_price * trade.initial_quantity) + pnl;
        botState.tradeHistory.push(trade);
        log('TRADE', `<<< CLOSED [${reason}] >>> ${trade.symbol} at $${exitPrice.toFixed(4)}. PnL: $${pnl.toFixed(2)} (${trade.pnl_pct.toFixed(2)}%)`);
        return trade;
    }
};

const monitorCircuitBreaker = async () => {
    const s = botState.settings;
    if (!s.USE_CIRCUIT_BREAKER || !s.CIRCUIT_BREAKER_SYMBOL) return;
    try {
        const klines = await scanner.fetchKlinesFromBinance(s.CIRCUIT_BREAKER_SYMBOL, '1m', 0, s.CIRCUIT_BREAKER_PERIOD_MINUTES);
        if (klines.length < s.CIRCUIT_BREAKER_PERIOD_MINUTES) return;
        const startPrice = parseFloat(klines[0][1]), currentPrice = parseFloat(klines[klines.length-1][4]);
        const dropPct = ((currentPrice - startPrice) / startPrice) * 100;

        let newStatus = 'INACTIVE';
        if (dropPct <= s.CIRCUIT_BREAKER_BLOCK_THRESHOLD_PCT) newStatus = 'ACTIVE';
        else if (dropPct <= s.CIRCUIT_BREAKER_ALERT_THRESHOLD_PCT) newStatus = 'ALERT';

        if (newStatus !== botState.circuitBreakerStatus) {
            log('CIRCUIT_BREAKER', `Status changed from ${botState.circuitBreakerStatus} to ${newStatus}. Drop: ${dropPct.toFixed(2)}%`);
            botState.circuitBreakerStatus = newStatus;
            broadcast({ type: 'BOT_STATUS_UPDATE', payload: { isRunning: botState.isRunning, circuitBreakerStatus: newStatus } });

            if (newStatus === 'ACTIVE' && botState.activePositions.length > 0) {
                log('CIRCUIT_BREAKER', `BLOCK triggered! Closing all ${botState.activePositions.length} open positions.`);
                const positionsToClose = [...botState.activePositions];
                for(const pos of positionsToClose) {
                    const price = botState.priceCache.get(pos.symbol) || pos.entry_price;
                    tradingEngine.closeTrade(pos.id, price, 'Circuit Breaker');
                }
                saveData('state'); broadcast({ type: 'POSITIONS_UPDATED' });
            }
        }
    } catch (e) { log('ERROR', `Circuit Breaker check failed: ${e.message}`); }
};

const startBot = () => {
    if (scannerInterval) clearInterval(scannerInterval);
    if (cbMonitorInterval) clearInterval(cbMonitorInterval);
    runScannerCycle();
    scannerInterval = setInterval(runScannerCycle, botState.settings.SCANNER_DISCOVERY_INTERVAL_SECONDS * 1000);
    setInterval(() => botState.isRunning && tradingEngine.monitorAndManagePositions(), 2000);
    cbMonitorInterval = setInterval(monitorCircuitBreaker, 15000);
    connectToBinance();
    log('INFO', 'Bot started.');
};

const requireAuth = (req, res, next) => req.session?.isAuthenticated ? next() : res.status(401).json({ message: 'Unauthorized' });

// --- API Endpoints ---
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    const appPassword = process.env.APP_PASSWORD;

    if (!appPassword) {
        log('ERROR', 'CRITICAL: APP_PASSWORD is not set in your .env file.');
        return res.status(500).json({ success: false, message: 'Server configuration error.' });
    }
    
    if (typeof password !== 'string' || !password) {
        return res.status(400).json({ success: false, message: 'Password is required.' });
    }

    if (password === appPassword) {
        req.session.isAuthenticated = true;
        res.json({ success: true, message: 'Login successful.' });
    } else {
        res.status(401).json({ success: false, message: 'Invalid password.' });
    }
});
app.post('/api/logout', (req, res) => req.session.destroy(() => res.status(204).send()));
app.get('/api/check-session', (req, res) => res.json({ isAuthenticated: !!req.session?.isAuthenticated }));
app.get('/api/settings', requireAuth, (req, res) => res.json(botState.settings));
app.post('/api/settings', requireAuth, async (req, res) => {
    botState.settings = { ...botState.settings, ...req.body };
    await saveData('settings');
    scanner.updateSettings(botState.settings);
    realtimeAnalyzer.updateSettings(botState.settings);
    res.json({ success: true });
});
app.get('/api/status', requireAuth, (req, res) => res.json({
    mode: botState.tradingMode, balance: botState.balance, positions: botState.activePositions.length,
    monitored_pairs: botState.scannerCache.length, top_pairs: botState.scannerCache.slice(0, 15).map(p => p.symbol),
    max_open_positions: botState.settings.MAX_OPEN_POSITIONS
}));
app.get('/api/positions', requireAuth, (req, res) => res.json(botState.activePositions.map(p => ({...p, current_price: botState.priceCache.get(p.symbol)}))));
app.get('/api/history', requireAuth, (req, res) => res.json(botState.tradeHistory));
app.get('/api/performance-stats', requireAuth, (req, res) => {
    const total = botState.tradeHistory.length, wins = botState.tradeHistory.filter(t => (t.pnl || 0) > 0).length;
    res.json({
        total_trades: total, winning_trades: wins, losing_trades: total - wins,
        total_pnl: botState.tradeHistory.reduce((s, t) => s + (t.pnl || 0), 0),
        win_rate: total > 0 ? (wins / total) * 100 : 0,
    });
});
app.get('/api/scanner', requireAuth, (req, res) => res.json(botState.scannerCache));
app.post('/api/close-trade/:id', requireAuth, (req, res) => {
    const trade = botState.activePositions.find(t => t.id === parseInt(req.params.id));
    if (!trade) return res.status(404).json({ message: 'Trade not found.' });
    const price = botState.priceCache.get(trade.symbol) || trade.entry_price;
    if (tradingEngine.closeTrade(trade.id, price, 'Manual Close')) {
        saveData('state'); broadcast({ type: 'POSITIONS_UPDATED' }); res.json({ success: true });
    } else res.status(500).json({ message: 'Failed to close trade.'});
});
app.post('/api/clear-data', requireAuth, async (req, res) => {
    log('WARN', 'User cleared all trade data.');
    botState.balance = botState.settings.INITIAL_VIRTUAL_BALANCE;
    botState.activePositions = []; botState.tradeHistory = []; botState.tradeIdCounter = 1;
    await saveData('state'); broadcast({ type: 'POSITIONS_UPDATED' }); res.json({ success: true });
});
app.get('/api/bot/status', requireAuth, (req, res) => res.json({ isRunning: botState.isRunning, circuitBreakerStatus: botState.circuitBreakerStatus }));
app.post('/api/bot/start', requireAuth, async (req, res) => { botState.isRunning = true; await saveData('state'); broadcast({ type: 'BOT_STATUS_UPDATE', payload: { isRunning: true, circuitBreakerStatus: botState.circuitBreakerStatus }}); res.json({ success: true }); });
app.post('/api/bot/stop', requireAuth, async (req, res) => { botState.isRunning = false; await saveData('state'); broadcast({ type: 'BOT_STATUS_UPDATE', payload: { isRunning: false, circuitBreakerStatus: botState.circuitBreakerStatus }}); res.json({ success: true }); });
app.get('/api/mode', requireAuth, (req, res) => res.json({ mode: botState.tradingMode }));
app.post('/api/mode', requireAuth, async (req, res) => {
    const { mode } = req.body;
    if (['VIRTUAL', 'REAL_PAPER', 'REAL_LIVE'].includes(mode)) {
        botState.tradingMode = mode;
        await saveData('state');
        log('INFO', `Trading mode switched to ${mode}`);
        res.json({ success: true, mode: botState.tradingMode });
    } else {
        res.status(400).json({ success: false, message: 'Invalid mode' });
    }
});

// --- Serve Frontend ---
const __dirname = path.resolve();
app.use(express.static(path.join(__dirname, '..', 'dist')));
app.get('*', (req, res) => res.sendFile(path.join(__dirname, '..', 'dist', 'index.html')));

// --- Initialize and Start ---
(async () => {
    try {
        await loadData();
        startBot();
        server.listen(port, () => log('INFO', `Server running on http://localhost:${port}`));
    } catch (e) { log('ERROR', `Failed to start server: ${e.message}`); process.exit(1); }
})();