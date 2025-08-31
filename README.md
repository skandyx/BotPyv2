# Trading Bot Dashboard "BOTPY"

BOTPY is a comprehensive web-based dashboard designed to monitor, control, and analyze a multi-pair automated crypto trading bot operating on USDT pairs. It provides a real-time, user-friendly interface to track market opportunities, manage active positions, review performance, and fine-tune a sophisticated, adaptive trading strategy. It supports a phased approach to live trading with `Virtual`, `Real (Paper)`, and `Real (Live)` modes.

## ✨ Key Features

-   **Multiple Trading Modes**: A safe, phased approach to live trading: `Virtual`, `Real (Paper)`, and `Real (Live)`.
-   **Dynamic Adaptive Profiles**: A "Tactical Chameleon" that analyzes market volatility and trend strength to automatically select the most effective management profile: "Sniper", "Scalper", or "Volatility Hunter".
-   **Macro Trend Score**: Replaces a simple binary filter with a nuanced 0-100 score based on multiple moving average metrics, allowing the bot to trade the *best* trends, not just any trend.
-   **Structure-Confirmed Entries**: A powerful confluence filter that requires a 1-minute momentum breakout to be confirmed by a break of the previous 15-minute price structure, dramatically improving signal quality.
-   **ATR-Based Risk Management**: All stop losses and take profits are calculated using ATR (Average True Range) multipliers, making risk management automatically adapt to each asset's specific volatility.
-   **Global Circuit Breaker**: An ultimate safety mechanism that monitors a market-wide index (like Bitcoin) and can automatically halt trading and flatten all positions during a market "flash crash" to preserve capital.
-   **Live Dashboard & Real-time Market Scanner**: At-a-glance KPIs and a detailed scanner showing the new Trend Score and all strategic data points.
-   **Fully Configurable**: Every parameter, from ATR multipliers to Circuit Breaker thresholds, is easily adjustable through a dedicated settings page.

---

## 🎨 Application Pages & Design

The application is designed with a dark, modern aesthetic (`bg-[#0c0e12]`), using an `Inter` font for readability and `Space Mono` for numerical data. The primary accent color is a vibrant yellow/gold (`#f0b90b`), used for interactive elements and highlights, with green and red reserved for clear financial indicators. A bright red banner appears across the top of the application if the Global Circuit Breaker is ever triggered.

---

## 🧠 Trading Strategy Explained: The "Macro-Micro" Precision Hunter (v2)

The bot's enhanced philosophy is to combine a high-level **"Macro"** analysis to quantify trend quality with a low-level **"Micro"** analysis that demands structural confirmation for pinpoint entries. This strategy is protected by adaptive risk management and a global market safety switch.

### **Phase 1: Macro Scan & Hotlist Qualification (4h / 15m)**

The bot continuously scans all USDT pairs, looking for those "primed" for a potential explosive move. Instead of trading immediately, it adds qualified pairs to a **"Hotlist"** (marked with a 🎯 in the scanner). A pair must pass two strict macro filters:

1.  **MACRO TREND SCORE (The Quality - 4h Chart):** The pair must be in a high-quality, confirmed uptrend. This is no longer a simple binary check but a **score from 0-100** based on:
    *   **Position vs. EMA50:** The percentage distance of the price above the 50-period EMA.
    *   **Slope of EMA50:** The angle of the EMA50, rewarding strong upward momentum.
    *   **MA Alignment:** Whether the short-term EMA (20) is above the long-term EMA (50).
    *   **Condition:** The `Macro Trend Score` must be above a certain threshold (e.g., > 50).

2.  **VOLATILITY COMPRESSION (The Preparation - 15m Chart):** The market must be consolidating and building up energy.
    *   **Condition:** The pair is in a **Bollinger Band Squeeze**. This is detected when the width of the bands on the *previous* 15m candle was in the lowest 25% of its values over the last **50 periods**.

If both conditions are met, the pair is placed on the **Hotlist**. The bot now "zooms in" for the precision entry.

### **Phase 2: Micro Trigger & Structure Confirmation (1m / 15m)**

For pairs on the Hotlist, the bot waits for the exact moment the breakout begins, requiring a powerful confluence of three events at once.

1.  **MOMENTUM SHIFT (The Spark - 1m Chart):** The immediate, short-term momentum must flip bullish.
    *   **Condition:** A 1-minute candle **closes above the 9-period Exponential Moving Average (EMA9)**.

2.  **STRUCTURE CONFIRMATION (The Confluence - 15m Chart):** The momentum shift must occur as part of a larger structural break.
    *   **Condition:** The same 1-minute trigger candle must also **close above the high of the PREVIOUS 15-minute candle**.

3.  **VOLUME CONFIRMATION & SAFETY CHECKS (The Fuel & Brakes):** The breakout must be backed by a surge in buying interest and pass safety checks (RSI not overbought, not a parabolic spike).

### **Phase 2.5: Tactical Analysis & Profile Selection (The Adaptive Brain)**

If a valid entry signal is generated, and the "Dynamic Profile Selector" is enabled, the bot performs one final analysis to choose the best trade management strategy based on the market's personality (ADX for trend strength, ATR for volatility), selecting between "Le Scalpeur," "Le Chasseur de Volatilité," and "Le Sniper."

### **Phase 3: Dynamic, ATR-Based Trade Management**

Once a trade is open, all risk parameters are now based on the asset's current volatility (ATR), not fixed percentages.

*   **Initial Stop Loss:** `Prix d'Entrée - (N * ATR)`
*   **Take Profit:** `Prix d'Entrée + (M * ATR)`
*   **Trailing Stop Loss Distance:** `P * ATR`

The multipliers (N, M, P) are defined by the active profile, making the bot's risk management universally adaptive and robust.

### **Global Safety: The Circuit Breaker**
Overseeing the entire strategy is the **Global Circuit Breaker**. It constantly monitors a market index like `BTCUSDT`. If the index drops more than a user-defined percentage in a short period (e.g., -2% in 5 minutes), the bot will:
1.  **Block all new trade entries.**
2.  **Immediately close all open positions.**
3.  **Enter a cooldown period** to wait for market stabilization.

This is the ultimate safeguard against systemic market risk and catastrophic losses.

---
# Version Française

## 🧠 Stratégie de Trading : “Le Chasseur de Précision Macro-Micro” (v2)

La philosophie améliorée du bot combine une analyse **"Macro"** pour quantifier la qualité de la tendance avec une analyse **"Micro"** qui exige une confirmation structurelle pour des entrées parfaites. Cette stratégie est protégée par une gestion du risque adaptative et un disjoncteur de marché global.

### **Phase 1 : Le Radar Macro (Qualification pour la Hotlist)**

Le bot scanne en permanence les paires USDT pour identifier celles qui sont "prêtes" pour une explosion haussière. Les paires qualifiées sont ajoutées à une **"Hotlist"** (`🎯`).

1.  **SCORE DE TENDANCE MACRO (La Qualité - Graphique 4h) :** La paire doit être dans une tendance haussière de haute qualité. C'est un **score de 0 à 100** basé sur :
    *   **Position/MME50 :** La distance en % au-dessus de la MME50.
    *   **Pente de la MME50 :** Une pente ascendante forte est récompensée.
    *   **Alignement des MME :** La MME20 est-elle au-dessus de la MME50 ?
    *   **Règle :** Le `Score de Tendance Macro` doit être supérieur à un seuil (ex: > 50).

2.  **COMPRESSION DE VOLATILITÉ (La Préparation - Graphique 15m) :** Le marché doit accumuler de l'énergie.
    *   **Règle :** La paire est dans un **"Squeeze" des Bandes de Bollinger**, détecté lorsque la largeur des bandes sur la bougie de 15m *précédente* était dans le quartile inférieur de ses valeurs sur les **50 dernières périodes**.

### **Phase 2 : Déclencheur Micro & Confirmation Structurelle (1m / 15m)**

Pour les paires sur la Hotlist, le bot attend une confluence de trois événements simultanés pour entrer.

1.  **CHANGEMENT DE MOMENTUM (L'Étincelle - 1m) :**
    *   **Règle :** Une bougie de 1 minute **clôture au-dessus de la MME9**.

2.  **CONFIRMATION STRUCTURELLE (La Confluence - 15m) :**
    *   **Règle :** La même bougie de 1 minute doit également **clôturer au-dessus du plus haut de la bougie de 15 minutes PRÉCÉDENTE**.

3.  **CONFIRMATION PAR LE VOLUME & SÉCURITÉ (Le Carburant & les Freins) :** La cassure doit être soutenue par le volume et passer les filtres de sécurité (RSI, Parabolique).

### **Phase 2.5 : Analyse Tactique & Sélection du Profil (Le Cerveau Adaptatif)**

Si un signal est valide et le mode dynamique activé, le bot analyse la personnalité du marché (ADX, ATR%) pour choisir entre les profils **"Le Scalpeur"**, **"Le Chasseur de Volatilité"**, ou **"Le Sniper"**.

### **Phase 3 : Gestion de Trade Dynamique Basée sur l'ATR**

Toute la gestion du risque est désormais proportionnelle à la volatilité de l'actif (ATR), et non plus à des pourcentages fixes.

*   **Stop Loss Initial :** `Prix d'Entrée - (N * ATR)`
*   **Take Profit :** `Prix d'Entrée + (M * ATR)`
*   **Distance du Stop Suiveur :** `P * ATR`

Les multiplicateurs (N, M, P) sont définis par le profil actif, rendant la gestion du risque universelle et auto-adaptative.

### **Sécurité Globale : Le Disjoncteur (Circuit Breaker)**
Un **Disjoncteur Global** surveille en permanence un indice de marché (ex: `BTCUSDT`). Si cet indice chute brutalement (ex: -2% en 5 minutes), le bot :
1.  **Bloque toute nouvelle entrée.**
2.  **Clôture immédiatement toutes les positions ouvertes.**
3.  **Se met en pause** pour attendre la stabilisation du marché.

C'est l'assurance-vie ultime contre les risques systémiques.
