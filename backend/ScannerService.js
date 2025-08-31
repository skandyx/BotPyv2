import fetch from 'node-fetch';
import { SMA, ADX, RSI, EMA } from 'technicalindicators';

const FIAT_CURRENCIES = ['EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'CNY', 'HKD', 'NZD', 'SEK', 'KRW', 'SGD', 'NOK', 'MXN', 'INR', 'RUB', 'ZAR', 'TRY', 'BRL'];

export class ScannerService {
    constructor(log) {
        this.log = log;
        this.cache = new Map();
        this.cacheTTL = 60 * 60 * 1000; // 1 heure
    }

    async runScan(settings) {
        this.log('SCANNER', 'Starting new discovery cycle for breakout strategy...');
        try {
            const binancePairs = await this.discoverAndFilterPairsFromBinance(settings);
            if (binancePairs.length === 0) {
                this.log('WARN', 'No pairs found meeting volume/exclusion criteria.');
                return [];
            }
            this.log('SCANNER', `Found ${binancePairs.length} pairs after initial filters.`);

            const analysisPromises = binancePairs.map(pair => this.analyzePair(pair.symbol, settings)
                .then(analysis => analysis ? { ...pair, ...analysis } : null)
                .catch(e => {
                    this.log('WARN', `Could not analyze ${pair.symbol}: ${e.message}`);
                    return null;
                })
            );

            const results = await Promise.all(analysisPromises);
            const analyzedPairs = results.filter(p => p !== null);
            
            this.log('SCANNER', `Discovery finished. ${analyzedPairs.length} pairs are being monitored.`);
            return analyzedPairs;

        } catch (error) {
            this.log('ERROR', `Discovery cycle failed: ${error.message}.`);
            throw error;
        }
    }

    async discoverAndFilterPairsFromBinance(settings) {
        this.log('BINANCE_API', 'Fetching all 24hr ticker data from Binance...');
        try {
            const response = await fetch('https://api.binance.com/api/v3/ticker/24hr');
            if (!response.ok) throw new Error(`Binance API error! status: ${response.status}`);
            const allTickers = await response.json();
            if (!Array.isArray(allTickers)) throw new Error('Binance API did not return an array.');

            const excluded = (settings.EXCLUDED_PAIRS || "").split(',').map(p => p.trim());
            const containsFiat = (symbol) => {
                const base = symbol.replace('USDT', '');
                return FIAT_CURRENCIES.includes(base);
            };

            return allTickers
                .filter(ticker => 
                    ticker.symbol.endsWith('USDT') &&
                    !containsFiat(ticker.symbol) &&
                    parseFloat(ticker.quoteVolume) > (settings.MIN_VOLUME_USD || 10000000) &&
                    !excluded.includes(ticker.symbol)
                )
                .map(ticker => ({
                    symbol: ticker.symbol,
                    volume: parseFloat(ticker.quoteVolume),
                    price: parseFloat(ticker.lastPrice),
                }));
        } catch (error) {
            this.log('ERROR', `Failed to discover pairs from Binance: ${error.message}`);
            throw error;
        }
    }

    async analyzePair(symbol, settings) {
        const cached = this.cache.get(symbol);
        if (cached && cached.timestamp > Date.now() - this.cacheTTL) {
            return cached.data;
        }
        this.log('SCANNER', `Performing long-term analysis for ${symbol}...`);

        const klines4h = await this.fetchKlinesFromBinance(symbol, '4h', 0, 100);
        if (klines4h.length < 51) return null;
        
        const klines1h = await this.fetchKlinesFromBinance(symbol, '1h', 0, 100);
        if (klines1h.length < 15) return null;

        const closes4h = klines4h.map(k => parseFloat(k[4]));
        const highs4h = klines4h.map(k => parseFloat(k[2]));
        const lows4h = klines4h.map(k => parseFloat(k[3]));

        // --- Reinforced Macro Trend Score (4h) ---
        const ema20_4h_all = EMA.calculate({ period: 20, values: closes4h });
        const ema50_4h_all = EMA.calculate({ period: 50, values: closes4h });
        const adx_4h_all = ADX.calculate({ high: highs4h, low: lows4h, close: closes4h, period: 14 });
        const rsi_4h_all = RSI.calculate({ period: 14, values: closes4h });

        const lastClose4h = closes4h[closes4h.length - 1];
        const ema20_4h = ema20_4h_all.pop();
        const ema50_4h = ema50_4h_all.pop();
        const prev_ema50_4h = ema50_4h_all[ema50_4h_all.length-1];
        const adx_4h = adx_4h_all.length ? adx_4h_all.pop().adx : 0;
        const rsi_4h = rsi_4h_all.pop();

        let score = 0;
        // 1. EMA Alignment & Position (50 points)
        if (lastClose4h > ema50_4h && ema20_4h > ema50_4h) {
            score += 25; // Base points for correct alignment
            const dist_pct = ((lastClose4h - ema50_4h) / ema50_4h) * 100;
            score += Math.min(25, dist_pct * 5); // Add up to 25 points for distance
        }
        // 2. EMA Slope (20 points)
        const slope = ema50_4h - prev_ema50_4h;
        if (slope > 0) {
            const slope_pct = (slope / prev_ema50_4h) * 100;
            score += Math.min(20, slope_pct * 20); // Add up to 20 points for slope
        }
        // 3. Trend Strength (ADX) (15 points)
        if (adx_4h > 20) {
            score += Math.min(15, (adx_4h - 20) * 0.75);
        }
        // 4. Momentum (RSI) (15 points)
        if (rsi_4h > 50) {
            score += Math.min(15, (rsi_4h - 50) * 0.75);
        }
        
        const macro_trend_score = Math.max(0, Math.min(100, score));

        // --- 1h ANALYSIS (Safety Filter) ---
        const closes1h = klines1h.map(k => parseFloat(k[4]));
        const rsi_1h = RSI.calculate({ values: closes1h, period: 14 }).pop();

        const analysisData = {
            macro_trend_score,
            adx_4h,
            rsi_4h,
            rsi_1h,
            priceDirection: 'neutral',
            is_in_squeeze_15m: false,
            adx_15m: undefined,
            atr_pct_15m: undefined,
        };

        this.cache.set(symbol, { timestamp: Date.now(), data: analysisData });
        return analysisData;
    }

    async fetchKlinesFromBinance(symbol, interval, startTime = 0, limit = 201) {
        let url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        if (startTime > 0) url += `&startTime=${startTime + 1}`;
        
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch klines for ${symbol} (${interval}). Status: ${response.status}`);
            const klines = await response.json();
            if (!Array.isArray(klines)) throw new Error(`Binance klines response for ${symbol} is not an array.`);
            return klines;
        } catch (error) {
            this.log('WARN', `Could not fetch klines for ${symbol} (${interval}): ${error.message}`);
            return [];
        }
    }
}
