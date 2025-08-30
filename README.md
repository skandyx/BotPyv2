# Trading Bot Dashboard "BOTPY"

BOTPY is a comprehensive web-based dashboard designed to monitor, control, and analyze a multi-pair automated crypto trading bot operating on USDT pairs. It provides a real-time, user-friendly interface to track market opportunities, manage active positions, review performance, and fine-tune the trading strategy. It supports a phased approach to live trading with `Virtual`, `Real (Paper)`, and `Real (Live)` modes.

## ✨ Key Features

-   **Multiple Trading Modes**: A safe, phased approach to live trading.
    -   `Virtual`: 100% simulation. Safe for testing and strategy optimization.
    -   `Real (Paper)`: Uses real Binance API keys for a live data feed but **simulates** trades without risking capital. The perfect final test.
    -   `Real (Live)`: Executes trades with real funds on your Binance account.
-   **Dynamic Adaptive Profiles**: Instead of a static configuration, the bot can operate as a "Tactical Chameleon". When enabled, it analyzes the market's volatility and trend strength for each specific trade and automatically selects the most effective management profile: "Sniper", "Scalper", or "Volatility Hunter".
-   **Precision "Macro-Micro" Strategy**: Implements a powerful multi-stage strategy that combines long-term trend analysis with precision 1-minute entry triggers to capture explosive breakouts.
-   **Live Dashboard**: Offers an at-a-glance overview of key performance indicators (KPIs) such as balance, open positions, total Profit & Loss (P&L), and win rate.
-   **Real-time Market Scanner**: Displays the results of the market analysis, showing pairs that are potential trade candidates, including ADX and ATR% data used by the adaptive logic.
-   **Detailed Trade History**: Provides a complete log of all past trades with powerful sorting, filtering, and data export (CSV) capabilities.
-   **Fully Configurable**: Every parameter of the strategy is easily adjustable through a dedicated settings page with helpful tooltips.

---

## 🎨 Application Pages & Design

The application is designed with a dark, modern aesthetic (`bg-[#0c0e12]`), using an `Inter` font for readability and `Space Mono` for numerical data. The primary accent color is a vibrant yellow/gold (`#f0b90b`), used for interactive elements and highlights, with green and red reserved for clear financial indicators.

### 🔐 Login Page
-   **Purpose**: Provides secure access to the dashboard.

### 📊 Dashboard
-   **Purpose**: The main control center, providing a high-level summary of the bot's status and performance.
-   **Key Components**: Stat Cards (Balance, Open Positions, P&L), Performance Chart, and an Active Positions Table.

### 📡 Scanner
-   **Purpose**: To display the real-time results of the market analysis, showing which pairs are potential trade candidates.
-   **Layout**: A data-dense table with sortable columns reflecting the strategy.
-   **Key Columns**:
    -   `Symbol`, `Price` (with live green/red flashes).
    -   `Score`: The final strategic score, displayed as a colored badge.
    -   `Conditions`: Visual dots representing the status of each strategic filter.
    -   `Tendance 4h (EMA50)`: Shows if the master trend filter is met.
    -   `RSI 1h`: Displays the 1-hour RSI for the safety filter.
    -   `ADX 15m` & `ATR % 15m`: The key indicators for the Dynamic Profile Selector.

### 📜 History
-   **Purpose**: A dedicated page for reviewing and analyzing the performance of all completed trades.

### ⚙️ Settings
-   **Purpose**: Allows for complete configuration of the bot's strategy, including enabling the "Dynamic Profile Selector" and setting its thresholds.

### 🖥️ Console
-   **Purpose**: Provides a transparent, real-time view into the bot's internal operations with color-coded log levels.

---

## 🧠 Trading Strategy Explained: The "Macro-Micro" Precision Hunter

The bot's core philosophy is to combine a high-level **"Macro"** analysis to find high-probability environments with a low-level **"Micro"** analysis to pinpoint the perfect entry moment. This avoids the "noise" of low timeframes while capturing the explosive start of a move with surgical precision.

### **Phase 1: Macro Scan & Hotlist Qualification (4h / 15m)**

The bot continuously scans all USDT pairs, looking for those that are "primed" for a potential explosive move. Instead of trading immediately, it adds qualified pairs to a **"Hotlist"** (marked with a 🎯 in the scanner). A pair must pass two strict macro filters:

1.  **✅ MASTER TREND FILTER (The Context - 4h Chart):** The pair must be in a confirmed, powerful long-term uptrend.
    *   **Condition:** The current price is **above its 50-period Exponential Moving Average (EMA50)**.

2.  **✅ VOLATILITY COMPRESSION (The Preparation - 15m Chart):** The market must be consolidating and building up energy, like a coiled spring.
    *   **Condition:** The pair is in a **Bollinger Band Squeeze**. This is detected when the width of the bands on the *previous* 15m candle was in the lowest 25% of its values over the last 50 periods.

If both conditions are met, the pair is placed on the **Hotlist**. The bot now "zooms in" and proceeds to Phase 2, analyzing every 1-minute candle for this specific pair.

### **Phase 2: Micro Trigger & Safety Checks (1m)**

For pairs on the Hotlist, the bot waits for the exact moment the breakout begins. The trade signal is generated if all the following micro-conditions and safety checks are met:

1.  **✅ MOMENTUM SHIFT (The Spark - 1m Chart):** The immediate, short-term momentum must flip bullish.
    *   **Condition:** A 1-minute candle **closes above the 9-period Exponential Moving Average (EMA9)**.

2.  **✅ VOLUME CONFIRMATION (The Fuel - 1m Chart):** The breakout must be backed by a surge in buying interest.
    *   **Condition:** The volume of the trigger candle is significantly higher than average (e.g., **> 1.5 times the average of the last 20 minutes**).

3.  **⚠️ SAFETY FILTER CHECKS (RSI & Parabolic):** The bot verifies that the market is not over-extended (`RSI < Threshold`) and that the move is not a sudden, unsustainable vertical spike (`Parabolic Filter`).

### **Phase 2.5: Tactical Analysis & Profile Selection (The Adaptive Brain)**

If a valid entry signal is generated in Phase 2, and the "Dynamic Profile Selector" is enabled, the bot performs one final, ultra-fast analysis to choose the best trade management strategy for the *current market personality*. It uses two key indicators:

1.  **ADX (Average Directional Index) on 15m:** Measures the strength of the trend.
2.  **ATR (Average True Range) as a % of Price on 15m:** Measures volatility.

Based on this, it selects one of three profiles:
-   **If the market is in a "Range" (ADX is very low):** It selects **"Le Scalpeur"**. The bot knows a big trend is unlikely, so it aims for a very small, quick profit and gets out.
-   **If the market is "Hyper-Volatile" (ATR % is very high):** It selects **"Le Chasseur de Volatilité"**. The bot uses a wider initial stop loss to survive the noise and an aggressive trailing stop to lock in gains quickly.
-   **If the market is in a "Healthy Trend" (Default case):** It selects **"Le Sniper"**. This is the ideal condition to apply the full "Profit Runner" strategy to maximize gains from a strong, stable trend.

### **Phase 3: Dynamic Trade Management (Executing the Chosen Tactic)**

Once a trade is open and a profile is selected, the exit management is executed according to that profile's philosophy.

1.  **STOP LOSS (Initial Protection):**
    *   **Placement:** The initial Stop Loss is placed logically, often below the 1-minute trigger candle or adapted using ATR for volatile conditions.

2.  **ADVANCED RISK MANAGEMENT (The "Profit Runner" Strategy):**
    This sequence is typically used by the **"Sniper"** profile:
    *   **Step 1: Partial Take Profit:** Sell a portion of the position at a small initial profit target.
    *   **Step 2: Move to Break-even:** Move the Stop Loss to the entry price, making the trade risk-free.
    *   **Step 3: Trailing Stop Loss:** Use a trailing stop on the remaining position to "ride the wave" and capture the majority of a strong trend.

---
# Version Française

## 🧠 Stratégie de Trading : “Le Chasseur de Précision Macro-Micro”

La philosophie du bot est de combiner une analyse **"Macro"** à haute échelle de temps pour trouver des environnements à forte probabilité, avec une analyse **"Micro"** à basse échelle de temps pour identifier le point d'entrée parfait. Cela permet d'éviter le "bruit" des petites unités de temps tout en capturant le début explosif d'un mouvement avec une précision chirurgicale.

### **Phase 1 : Scan Macro & Qualification sur la Hotlist (4h / 15m)**

Le bot scanne en permanence toutes les paires USDT, à la recherche de celles qui sont "prêtes" pour un potentiel mouvement explosif. Il ajoute les paires qualifiées à une **"Hotlist"** (marquée par un `🎯` dans le scanner). Une paire doit passer deux filtres macro stricts :

1.  **✅ FILTRE DE TENDANCE MAÎTRE (Le Contexte - Graphique 4h) :** La paire doit être dans une tendance haussière de fond confirmée.
    *   **Condition :** Le prix actuel est **au-dessus de sa Moyenne Mobile Exponentielle 50 (MME50)**.

2.  **✅ COMPRESSION DE VOLATILITÉ (La Préparation - Graphique 15m) :** Le marché doit se consolider et accumuler de l'énergie.
    *   **Condition :** La paire est dans un **"Squeeze" des Bandes de Bollinger**. Détecté lorsque la largeur des bandes sur la bougie de 15m *précédente* était dans les 25% les plus bas de ses valeurs récentes.

Si ces conditions sont remplies, la paire est sur la **Hotlist**. Le bot "zoome" alors et passe à la Phase 2.

### **Phase 2 : Déclencheur Micro & Vérifications de Sécurité (1m)**

Pour les paires sur la Hotlist, le bot attend le signal de cassure. Le signal est généré si toutes les conditions suivantes sont remplies :

1.  **✅ CHANGEMENT DE MOMENTUM (L'Étincelle - Graphique 1m) :** Le momentum à très court terme doit basculer à la hausse.
    *   **Condition :** Une bougie de 1 minute **clôture au-dessus de la Moyenne Mobile Exponentielle 9 (MME9)**.

2.  **✅ CONFIRMATION PAR LE VOLUME (Le Carburant - Graphique 1m) :** La cassure doit être soutenue par un intérêt acheteur.
    *   **Condition :** Le volume de la bougie de déclenchement est **supérieur à 1.5 fois la moyenne** du volume récent.

3.  **⚠️ FILTRES DE SÉCURITÉ (RSI & Parabolique) :** Le bot vérifie que le marché n'est pas déjà en surchauffe (`RSI < Seuil`) et que le mouvement n'est pas un pic vertical insoutenable (`Filtre Parabolique`).

### **Phase 2.5 : Analyse Tactique & Sélection du Profil (Le Cerveau Adaptatif)**

Si un signal d'entrée valide est généré, et que le "Sélecteur de Profil Dynamique" est activé, le bot effectue une dernière analyse ultra-rapide pour choisir la meilleure stratégie de gestion pour la *personnalité actuelle du marché*. Il utilise deux indicateurs clés :

1.  **ADX (Average Directional Index) sur 15m :** Mesure la force de la tendance.
2.  **ATR (Average True Range) en % du prix sur 15m :** Mesure la volatilité.

En fonction de cela, il sélectionne l'un des trois profils :
-   **Si le marché est en "Range" (ADX très bas) :** Il sélectionne **"Le Scalpeur"**. Le bot sait qu'une grande tendance est improbable, il vise donc un profit très petit et rapide et sort.
-   **Si le marché est "Hyper-Volatil" (ATR % très élevé) :** Il sélectionne **"Le Chasseur de Volatilité"**. Le bot utilise un stop loss initial plus large pour survivre au bruit et un stop suiveur agressif pour sécuriser les gains rapidement.
-   **Si le marché est en "Tendance Saine" (Cas par défaut) :** Il sélectionne **"Le Sniper"**. C'est la condition idéale pour appliquer la stratégie complète du "Profit Runner" afin de maximiser les gains d'une tendance forte et stable.

### **Phase 3 : Gestion Dynamique du Trade (Exécution de la Tactique Choisie)**

Une fois le trade ouvert et le profil sélectionné, la gestion de la sortie est exécutée selon la philosophie de ce profil.

1.  **STOP LOSS (Protection Initiale)** :
    *   **Placement** : Le Stop Loss initial est placé logiquement, souvent sous la bougie de déclenchement de 1 minute ou adapté via l'ATR pour les conditions volatiles.

2.  **GESTION AVANCÉE DU RISQUE (La Stratégie "Profit Runner")** :
    Cette séquence est typiquement utilisée par le profil **"Sniper"** :
    *   **Étape 1 : Prise de Profit Partielle** : Vendre une partie de la position à un petit objectif de profit initial.
    *   **Étape 2 : Mise à Seuil de Rentabilité (Break-even)** : Déplacer le Stop Loss au prix d'entrée, rendant le trade sans risque.
    *   **Étape 3 : Stop Loss Suiveur (Trailing Stop Loss)** : Utiliser un stop suiveur sur le reste de la position pour "surfer la vague" et capturer la majorité d'une forte tendance.