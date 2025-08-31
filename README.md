# Trading Bot Dashboard "BOTPY"

BOTPY is a comprehensive web-based dashboard designed to monitor, control, and analyze a multi-pair automated crypto trading bot operating on USDT pairs. It provides a real-time, user-friendly interface to track market opportunities, manage active positions, review performance, and fine-tune a sophisticated, adaptive trading strategy. It supports a phased approach to live trading with `Virtual`, `Real (Paper)`, and `Real (Live)` modes.

## ✨ Key Features

-   **Multiple Trading Modes**: A safe, phased approach to live trading: `Virtual`, `Real (Paper)`, and `Real (Live)`.
-   **Dynamic Adaptive Profiles**: A "Tactical Chameleon" that analyzes market volatility and trend strength to automatically select the most effective management profile: "Sniper", "Scalper", or "Volatility Hunter".
-   **Reinforced Macro Trend Score**: Replaces a simple binary filter with a nuanced 0-100 score based on EMA position, EMA slope, RSI, and ADX, allowing the bot to trade the *best* trends, not just any trend.
-   **Dual-Mode Micro Entries**: Combines a high-precision "Structure Confirmation" trigger for most situations with an "Aggressive" momentum-only trigger for highly volatile markets.
-   **ATR-Based Risk Management**: All stop losses and take profits are calculated using ATR (Average True Range) multipliers, making risk management automatically adapt to each asset's specific volatility.
-   **Adaptive Trailing Stop**: An intelligent trailing stop that automatically tightens after a trade reaches 1R profit, aggressively protecting gains.
-   **Graduated Global Circuit Breaker**: An ultimate, two-tiered safety mechanism that monitors the market and can proportionally reduce risk or halt all trading during a "flash crash" to preserve capital.
-   **Live Dashboard & Real-time Market Scanner**: At-a-glance KPIs and a detailed scanner showing the new Trend Score and all strategic data points.
-   **Fully Configurable**: Every parameter, from ATR multipliers to Circuit Breaker thresholds, is easily adjustable through a dedicated settings page.

---

## 🎨 Application Pages & Design

The application is designed with a dark, modern aesthetic (`bg-[#0c0e12]`), using an `Inter` font for readability and `Space Mono` for numerical data. The primary accent color is a vibrant yellow/gold (`#f0b90b`), used for interactive elements and highlights. Green and red are reserved for clear financial indicators. A flashing yellow or red banner appears across the top of the application if the Global Circuit Breaker is triggered.

---

## 🧠 Trading Strategy Explained: The "Macro-Micro Precision Hunter" (v2.1)

The bot's enhanced philosophy is to combine a high-level **"Macro"** analysis to quantify trend quality with a low-level **"Micro"** analysis that demands structural confirmation for pinpoint entries. This strategy is protected by adaptive risk management and a graduated global market safety switch.

### **Phase 1: Macro Scan & Hotlist Qualification (4h / 15m)**

The bot continuously scans all USDT pairs, looking for those "primed" for a potential explosive move. Instead of trading immediately, it adds qualified pairs to a **"Hotlist"** (marked with a 🎯 in the scanner). A pair must pass two strict macro filters:

1.  **REINFORCED MACRO TREND SCORE (The Quality - 4h Chart):** The pair must be in a high-quality, confirmed uptrend. This is a **score from 0-100** based on a weighted combination of:
    *   **Position vs. EMA50:** The percentage distance of the price above the 50-period EMA.
    *   **Slope of EMA50:** The angle of the EMA50, rewarding strong upward momentum.
    *   **Trend Strength (ADX):** An ADX > 20 confirms the market is trending.
    *   **Momentum (RSI):** An RSI > 50 confirms buyers are in control.
    *   **Condition:** The `Macro Trend Score` must be above a certain threshold (e.g., > 50).

2.  **DOUBLE-FILTERED VOLATILITY COMPRESSION (The Preparation - 15m Chart):** The market must be consolidating and building up energy, confirmed by two separate indicators.
    *   **Condition 1 (Relative Volatility):** The pair is in a **Bollinger Band Squeeze**.
    *   **Condition 2 (Absolute Volatility):** The **14-period ATR is falling** compared to the previous candle.

If both conditions are met, the pair is placed on the **Hotlist**.

### **Phase 2: Dual-Mode Micro Trigger (1m / 15m)**

For pairs on the Hotlist, the bot waits for the exact moment the breakout begins, using one of two entry modes based on the active trading profile.

1.  **PRECISION MODE (Default - for Sniper/Scalper):** Requires a powerful confluence of three events at once.
    *   **Momentum Shift (1m):** A 1-minute candle closes above the 9-period EMA.
    *   **Structure Confirmation (15m):** The same 1m candle also closes above the **high of the PREVIOUS 15-minute candle**.
    *   **Volume Confirmation (1m):** The trigger candle has significantly increased volume.

2.  **AGGRESSIVE MODE (for Volatility Hunter):** In explosive markets, waiting for 15m confirmation can be too slow. This mode requires only:
    *   **Momentum Shift (1m):** A 1-minute candle closes above the 9-period EMA.
    *   **Volume Confirmation (1m):** The trigger candle has significantly increased volume.

### **Phase 2.5: Tactical Analysis & Profile Selection (The Adaptive Brain)**

If a valid entry signal is generated, and the "Dynamic Profile Selector" is enabled, the bot performs one final analysis to choose the best trade management strategy based on the market's personality (ADX for trend strength, ATR for volatility), selecting between "Le Scalpeur," "Le Chasseur de Volatilité," and "Le Sniper."

### **Phase 3: Adaptive, ATR-Based Trade Management**

Once a trade is open, all risk parameters are based on the asset's current volatility (ATR), not fixed percentages.

*   **Initial Stop Loss:** `Prix d'Entrée - (N * ATR)`
*   **Take Profit:** `Prix d'Entrée + (M * ATR)`
*   **Adaptive Trailing Stop:** The trailing stop follows the price at a distance of `P * ATR`. Once the trade is profitable by `N * ATR` (1R), this distance automatically tightens to `Q * ATR` to aggressively protect gains.

The multipliers (N, M, P, Q) are defined by the active profile.

### **Global Safety: Graduated Circuit Breaker**
Overseeing the entire strategy is the **Graduated Global Circuit Breaker**. It constantly monitors a market index like `BTCUSDT`.
*   **⚠️ ALERTE (e.g., -1% drop):** The market is showing stress. The bot continues to trade but **reduces the size of all new positions** (e.g., by 50%).
*   **🛑 BLOCAGE (e.g., -2.5% drop):** A potential crash is detected. The bot will:
    1.  Block all new trade entries.
    2.  Immediately close all open positions.
    3.  Enter a cooldown period.

---
# Version Française

## 🧠 Stratégie de Trading : “Le Chasseur de Précision Macro-Micro” (v2.1)

La philosophie améliorée du bot combine une analyse **"Macro"** pour quantifier la qualité de la tendance avec une analyse **"Micro"** qui exige une confirmation structurelle pour des entrées parfaites. Cette stratégie est protégée par une gestion du risque adaptative et un disjoncteur de marché global gradué.

### **Phase 1 : Le Radar Macro (Qualification pour la Hotlist)**

Le bot scanne en permanence les paires USDT pour identifier celles qui sont "prêtes" pour une explosion haussière. Les paires qualifiées sont ajoutées à une **"Hotlist"** (`🎯`).

1.  **SCORE DE TENDANCE MACRO RENFORCÉ (La Qualité - Graphique 4h) :** La paire doit être dans une tendance haussière de haute qualité. C'est un **score de 0 à 100** basé sur une combinaison pondérée de :
    *   **Position/MME50 :** La distance en % au-dessus de la MME50.
    *   **Pente de la MME50 :** Une pente ascendante forte est récompensée.
    *   **Force de la Tendance (ADX) :** Un ADX > 20 confirme que le marché est en tendance.
    *   **Momentum (RSI) :** Un RSI > 50 confirme le contrôle des acheteurs.
    *   **Règle :** Le `Score de Tendance Macro` doit être supérieur à un seuil (ex: > 50).

2.  **COMPRESSION DE VOLATILITÉ À DOUBLE FILTRE (La Préparation - Graphique 15m) :** Le marché doit accumuler de l'énergie, validé par deux indicateurs.
    *   **Condition 1 (Volatilité Relative) :** La paire est dans un **"Squeeze" des Bandes de Bollinger**.
    *   **Condition 2 (Volatilité Absolue) :** L'**ATR 14 périodes est en baisse** par rapport à la bougie précédente.

### **Phase 2 : Déclencheur Micro à Double Vitesse (1m / 15m)**

Pour les paires sur la Hotlist, le bot utilise un des deux modes d'entrée selon le profil de trading actif.

1.  **MODE PRÉCISION (Défaut - pour Sniper/Scalpeur) :** Exige une confluence puissante de trois événements.
    *   **Changement de Momentum (1m) :** Une bougie de 1 minute clôture au-dessus de la MME9.
    *   **Confirmation Structurelle (15m) :** La même bougie 1m clôture aussi au-dessus du **plus haut de la bougie de 15 minutes PRÉCÉDENTE**.
    *   **Confirmation par le Volume (1m) :** Le volume de la bougie de déclenchement est significativement en hausse.

2.  **MODE AGRESSIF (pour Chasseur de Volatilité) :** Dans des marchés explosifs, ce mode ne requiert que :
    *   **Changement de Momentum (1m) :** Une bougie de 1 minute clôture au-dessus de la MME9.
    *   **Confirmation par le Volume (1m) :** Le volume de la bougie de déclenchement est en hausse.

### **Phase 2.5 : Analyse Tactique & Sélection du Profil (Le Cerveau Adaptatif)**

Si un signal est valide et le mode dynamique activé, le bot analyse la personnalité du marché (ADX, ATR%) pour choisir entre les profils **"Le Scalpeur"**, **"Le Chasseur de Volatilité"**, ou **"Le Sniper"**.

### **Phase 3 : Gestion de Trade Adaptative Basée sur l'ATR**

Toute la gestion du risque est proportionnelle à la volatilité de l'actif (ATR).

*   **Stop Loss Initial :** `Prix d'Entrée - (N * ATR)`
*   **Take Profit :** `Prix d'Entrée + (M * ATR)`
*   **Stop Suiveur Adaptatif :** Le stop suit le prix à une distance de `P * ATR`. Une fois que le trade atteint un profit de `N * ATR` (1R), cette distance se resserre automatiquement à `Q * ATR` pour protéger les gains.

Les multiplicateurs (N, M, P, Q) sont définis par le profil actif.

### **Sécurité Globale : Le Disjoncteur Gradué**
Un **Disjoncteur Global Gradué** surveille en permanence un indice de marché (ex: `BTCUSDT`).
*   **⚠️ ALERTE (ex: -1% de chute) :** Le marché est sous stress. Le bot continue de trader mais **réduit la taille de toutes les nouvelles positions** (ex: de 50%).
*   **🛑 BLOCAGE (ex: -2.5% de chute) :** Un crash potentiel est détecté. Le bot va :
    1.  Bloquer toute nouvelle entrée.
    2.  Clôturer immédiatement toutes les positions ouvertes.
    3.  Se mettre en pause.