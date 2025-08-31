
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../services/mockApi';
import { BotSettings } from '../types';
import Spinner from '../components/common/Spinner';
import { useAppContext } from '../contexts/AppContext';
import ToggleSwitch from '../components/common/ToggleSwitch';
import Tooltip from '../components/common/Tooltip';
import Modal from '../components/common/Modal';

// --- TYPES & PROFILES ---
type ProfileName = 'Le Sniper' | 'Le Scalpeur' | 'Le Chasseur de Volatilité';
type ActiveProfile = ProfileName | 'PERSONNALISE';

const profileTooltips: Record<ProfileName, string> = {
    'Le Sniper': "PRUDENT : Vise la qualité maximale et les grandes tendances. Utilise un SL et un TP larges basés sur l'ATR pour laisser le trade respirer, et un trailing stop pour maximiser les gains.",
    'Le Scalpeur': "ÉQUILIBRÉ : Optimisé pour des gains rapides et constants. Vise des objectifs de profit serrés (1.5x le risque ATR) sans trailing stop. Idéal pour les marchés en range.",
    'Le Chasseur de Volatilité': "AGRESSIF : Conçu pour survivre et profiter des marchés explosifs. Utilise un SL ATR très large pour ne pas être sorti par le bruit, et un trailing stop serré pour sécuriser les gains rapidement."
};

const settingProfiles: Record<ProfileName, Partial<BotSettings>> = {
    'Le Sniper': { // PRUDENT
        POSITION_SIZE_PCT: 2.0,
        MAX_OPEN_POSITIONS: 3,
        REQUIRE_STRONG_BUY: true,
        USE_RSI_SAFETY_FILTER: true,
        RSI_OVERBOUGHT_THRESHOLD: 65,
        USE_PARABOLIC_FILTER: true,
        PARABOLIC_FILTER_PERIOD_MINUTES: 5,
        PARABOLIC_FILTER_THRESHOLD_PCT: 2.5,
        SL_ATR_MULTIPLIER: 1.5,
        TP_ATR_MULTIPLIER: 4.0, // High R:R, relies on trailing
        USE_PARTIAL_TAKE_PROFIT: true,
        PARTIAL_TP_TRIGGER_PCT: 0.8,
        PARTIAL_TP_SELL_QTY_PCT: 50,
        USE_AUTO_BREAKEVEN: true,
        BREAKEVEN_TRIGGER_PCT: 1.0,
        ADJUST_BREAKEVEN_FOR_FEES: true,
        TRANSACTION_FEE_PCT: 0.1,
        USE_TRAILING_STOP_LOSS: true,
        TRAILING_STOP_ATR_MULTIPLIER: 2.0, 
    },
    'Le Scalpeur': { // EQUILIBRE
        POSITION_SIZE_PCT: 3.0,
        MAX_OPEN_POSITIONS: 5,
        REQUIRE_STRONG_BUY: false,
        USE_RSI_SAFETY_FILTER: true,
        RSI_OVERBOUGHT_THRESHOLD: 70,
        USE_PARABOLIC_FILTER: true,
        PARABOLIC_FILTER_PERIOD_MINUTES: 5,
        PARABOLIC_FILTER_THRESHOLD_PCT: 3.5,
        SL_ATR_MULTIPLIER: 1.2,
        TP_ATR_MULTIPLIER: 1.5, // Tight TP based on ATR
        USE_PARTIAL_TAKE_PROFIT: false,
        USE_AUTO_BREAKEVEN: false,
        ADJUST_BREAKEVEN_FOR_FEES: false,
        TRANSACTION_FEE_PCT: 0.1,
        USE_TRAILING_STOP_LOSS: false,
        TRAILING_STOP_ATR_MULTIPLIER: 1.0,
    },
    'Le Chasseur de Volatilité': { // AGRESSIF
        POSITION_SIZE_PCT: 4.0,
        MAX_OPEN_POSITIONS: 8,
        REQUIRE_STRONG_BUY: false,
        USE_RSI_SAFETY_FILTER: false, // Filters off
        RSI_OVERBOUGHT_THRESHOLD: 80,
        USE_PARABOLIC_FILTER: false, // Filters off
        SL_ATR_MULTIPLIER: 2.5, // Wider ATR SL to survive volatility
        TP_ATR_MULTIPLIER: 6.0,
        USE_PARTIAL_TAKE_PROFIT: false,
        USE_AUTO_BREAKEVEN: true,
        BREAKEVEN_TRIGGER_PCT: 2.0,
        ADJUST_BREAKEVEN_FOR_FEES: true,
        TRANSACTION_FEE_PCT: 0.1,
        USE_TRAILING_STOP_LOSS: true,
        TRAILING_STOP_ATR_MULTIPLIER: 1.2, // Tight, aggressive trailing stop
    }
};


// --- HELPERS ---
const tooltips: Record<string, string> = {
    INITIAL_VIRTUAL_BALANCE: "Le capital de départ pour votre compte de trading virtuel. Ce montant est appliqué lorsque vous effacez toutes les données de trading.",
    MAX_OPEN_POSITIONS: "Le nombre maximum de trades que le bot peut avoir ouverts en même temps. Aide à contrôler l'exposition globale au risque.",
    POSITION_SIZE_PCT: "Le pourcentage de votre solde total à utiliser pour chaque nouveau trade. (ex: 2% sur un solde de 10 000 $ se traduira par des positions de 200 $).",
    SLIPPAGE_PCT: "Un petit pourcentage pour simuler la différence entre le prix d'exécution attendu et réel d'un trade sur un marché en direct.",
    MIN_VOLUME_USD: "Le volume de trading minimum sur 24 heures qu'une paire doit avoir pour être prise en compte par le scanner. Filtre les marchés illiquides.",
    SCANNER_DISCOVERY_INTERVAL_SECONDS: "La fréquence (en secondes) à laquelle le bot doit effectuer un scan complet du marché pour découvrir et analyser les paires en fonction de leurs données graphiques sur 4h.",
    USE_VOLUME_CONFIRMATION: "Si activé, une cassure (breakout) n'est valide que si le volume est significativement supérieur à sa moyenne récente, confirmant l'intérêt du marché.",
    USE_MARKET_REGIME_FILTER: "Un filtre maître. Si activé, le bot ne tradera que si le Score de Tendance Macro (basé sur la force, la pente et l'alignement des MME 4h) est suffisamment élevé.",
    REQUIRE_STRONG_BUY: "Si activé, le bot n'ouvrira de nouvelles transactions que pour les paires avec un score 'STRONG BUY' (après confirmation de la structure 15m), rendant la stratégie plus sélective.",
    LOSS_COOLDOWN_HOURS: "Anti-Churn : Si une transaction sur un symbole est clôturée à perte, le bot sera empêché de trader ce même symbole pendant ce nombre d'heures.",
    EXCLUDED_PAIRS: "Une liste de paires séparées par des virgules à ignorer complètement, quel que soit leur volume (par exemple, USDCUSDT,FDUSDUSDT).",
    BINANCE_API_KEY: "Votre clé API publique Binance. Requise pour les modes de trading live et paper.",
    BINANCE_SECRET_KEY: "Votre clé API secrète Binance. Elle est stockée en toute sécurité sur le serveur et n'est jamais exposée au frontend.",
    SL_ATR_MULTIPLIER: "Le multiplicateur à appliquer à la valeur de l'ATR (Average True Range) pour définir la distance du Stop Loss. (ex: 1.5 signifie que le SL sera à 1.5 * ATR en dessous du prix d'entrée). C'est la base de votre risque.",
    TP_ATR_MULTIPLIER: "Le multiplicateur ATR pour définir l'objectif de Take Profit. Un multiplicateur de 3.0 avec un SL à 1.5 résultera en un Ratio Risque/Récompense de 2:1.",
    USE_TRAILING_STOP_LOSS: "Active un stop loss dynamique qui monte pour sécuriser les profits à mesure que le prix augmente, mais ne descend jamais.",
    TRAILING_STOP_ATR_MULTIPLIER: "Le multiplicateur ATR pour définir la distance à laquelle le stop suiveur se maintiendra en dessous du prix le plus élevé atteint. Plus la valeur est petite, plus le suivi est serré.",
    USE_AUTO_BREAKEVEN: "Déplacer automatiquement le Stop Loss au prix d'entrée une fois qu'un trade est en profit, éliminant le risque de perte.",
    BREAKEVEN_TRIGGER_PCT: "Le pourcentage de profit (%) auquel déclencher le passage au seuil de rentabilité (ex: 0.5% signifie que lorsque le profit atteint 0.5%, le SL est déplacé au prix d'entrée).",
    ADJUST_BREAKEVEN_FOR_FEES: "Si activé, le 'Break-Even' sera légèrement au-dessus du prix d'entrée pour couvrir les frais de transaction de l'achat et de la vente, assurant une sortie à 0$ P&L net.",
    TRANSACTION_FEE_PCT: "Le pourcentage de frais de transaction par ordre sur votre exchange (ex: 0.1 pour 0.1%). Utilisé pour calculer le point de Break-Even réel.",
    USE_RSI_SAFETY_FILTER: "Empêcher l'ouverture de nouveaux trades si le RSI est dans la zone de 'surachat', évitant d'acheter à un potentiel sommet local.",
    RSI_OVERBOUGHT_THRESHOLD: "Le niveau RSI au-dessus duquel un signal de trade sera ignoré (ex: 70).",
    USE_PARTIAL_TAKE_PROFIT: "Vendre une partie de la position à un objectif de profit préliminaire et laisser le reste courir avec le trailing stop loss.",
    PARTIAL_TP_TRIGGER_PCT: "Le pourcentage de profit (%) auquel vendre la première partie de la position.",
    PARTIAL_TP_SELL_QTY_PCT: "Le pourcentage (%) de la quantité de position initiale à vendre pour la prise de profit partielle.",
    USE_DYNAMIC_POSITION_SIZING: "Allouer une taille de position plus importante pour les signaux 'STRONG BUY' de la plus haute qualité par rapport aux signaux 'BUY' réguliers.",
    STRONG_BUY_POSITION_SIZE_PCT: "Le pourcentage de votre solde à utiliser pour un signal 'STRONG BUY' si le dimensionnement dynamique est activé.",
    USE_PARABOLIC_FILTER: "Active un filtre de sécurité pour éviter d'ouvrir des trades sur des mouvements de prix soudains et verticaux (paraboliques), qui sont souvent des pièges de liquidité.",
    PARABOLIC_FILTER_PERIOD_MINUTES: "La période (en minutes) sur laquelle vérifier une hausse de prix parabolique avant d'entrer dans un trade.",
    PARABOLIC_FILTER_THRESHOLD_PCT: "Le pourcentage maximum d'augmentation de prix autorisé sur la période de vérification. Si le prix a augmenté plus que ce seuil, le trade est ignoré pour éviter d'entrer sur un pic insoutenable.",
    USE_DYNAMIC_PROFILE_SELECTOR: "Si activé, le bot choisira automatiquement le meilleur profil (Sniper, Scalpeur, Chasseur) pour chaque trade en fonction des conditions de marché (tendance, volatilité) au moment de l'entrée.",
    ADX_THRESHOLD_RANGE: "Le seuil ADX (15m) en dessous duquel un marché est considéré comme étant en 'range' (faible tendance), déclenchant le profil 'Scalpeur'.",
    ATR_PCT_THRESHOLD_VOLATILE: "Le seuil de l'ATR (en % du prix) au-dessus duquel un marché est considéré comme hyper-volatil, déclenchant le profil 'Chasseur de Volatilité'.",
    USE_CIRCUIT_BREAKER: "Active le disjoncteur global. C'est un garde-fou qui surveille un actif majeur (comme BTC) pour détecter un 'flash crash' du marché.",
    CIRCUIT_BREAKER_SYMBOL: "Le symbole à surveiller pour le disjoncteur (ex: BTCUSDT).",
    CIRCUIT_BREAKER_THRESHOLD_PCT: "Le pourcentage de chute de prix qui déclenchera le disjoncteur.",
    CIRCUIT_BREAKER_PERIOD_MINUTES: "La période (en minutes) sur laquelle la chute de prix est mesurée.",
    CIRCUIT_BREAKER_COOLDOWN_HOURS: "La durée (en heures) pendant laquelle le bot restera en pause après le déclenchement du disjoncteur."
};

const inputClass = "mt-1 block w-full rounded-md border-[#3e4451] bg-[#0c0e12] shadow-sm focus:border-[#f0b90b] focus:ring-[#f0b90b] sm:text-sm text-white";

const SettingsPage: React.FC = () => {
    const { settings: contextSettings, setSettings: setContextSettings, incrementSettingsActivity, refreshData } = useAppContext();
    const [settings, setSettings] = useState<BotSettings | null>(contextSettings);
    const [activeProfile, setActiveProfile] = useState<ActiveProfile>('PERSONNALISE');
    const [isSaving, setIsSaving] = useState(false);
    const [isTestingBinance, setIsTestingBinance] = useState(false);
    const [saveMessage, setSaveMessage] = useState<{text: string, type: 'success' | 'error'} | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isClearModalOpen, setIsClearModalOpen] = useState(false);

    useEffect(() => {
        if (contextSettings) {
            setSettings(contextSettings);
        }
    }, [contextSettings]);

    // Effect to detect the current profile based on settings
    useEffect(() => {
        if (!settings || settings.USE_DYNAMIC_PROFILE_SELECTOR) {
            setActiveProfile('PERSONNALISE');
            return;
        }

        const checkProfile = (profile: Partial<BotSettings>): boolean => {
            return Object.keys(profile).every(key => {
                const settingKey = key as keyof BotSettings;
                if (!settings.hasOwnProperty(settingKey)) return false; // Ensure the key exists on the main settings object
                // Handle potential floating point inaccuracies for numeric comparisons
                if (typeof settings[settingKey] === 'number' && typeof profile[settingKey] === 'number') {
                     return Math.abs((settings[settingKey] as number) - (profile[settingKey] as number)) < 0.001;
                }
                return settings[settingKey] === profile[settingKey];
            });
        };

        let currentProfile: ActiveProfile = 'PERSONNALISE';
        if (checkProfile(settingProfiles['Le Sniper'])) {
            currentProfile = 'Le Sniper';
        } else if (checkProfile(settingProfiles['Le Scalpeur'])) {
            currentProfile = 'Le Scalpeur';
        } else if (checkProfile(settingProfiles['Le Chasseur de Volatilité'])) {
            currentProfile = 'Le Chasseur de Volatilité';
        }
        
        if (currentProfile !== activeProfile) {
            setActiveProfile(currentProfile);
        }

    }, [settings, activeProfile]);


    const handleProfileSelect = (profileName: ProfileName) => {
        if (!settings || settings.USE_DYNAMIC_PROFILE_SELECTOR) return;
        const profileSettings = settingProfiles[profileName];
        setSettings({ ...settings, ...profileSettings });
        setActiveProfile(profileName);
    };

    const showMessage = (text: string, type: 'success' | 'error' = 'success', duration: number = 4000) => {
        setSaveMessage({ text, type });
        setTimeout(() => setSaveMessage(null), duration);
    };

    const handleChange = (id: keyof BotSettings, value: string | boolean | number) => {
        if (settings) {
            setSettings({ ...settings, [id]: value });
        }
    };

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await api.updateSettings(settings);
            setContextSettings(settings);
            incrementSettingsActivity();
            showMessage("Paramètres sauvegardés avec succès !");
        } catch (error: any) {
            showMessage(`Échec de la sauvegarde des paramètres : ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const handleTestBinanceConnection = async () => {
        if (!settings || !settings.BINANCE_API_KEY || !settings.BINANCE_SECRET_KEY) {
             showMessage("Veuillez entrer les clés API et secrète de Binance.", 'error');
            return;
        }
        setIsTestingBinance(true);
        try {
            const result = await api.testBinanceConnection(settings.BINANCE_API_KEY, settings.BINANCE_SECRET_KEY);
            showMessage(result.message, result.success ? 'success' : 'error');
        } catch (error: any) {
            showMessage(error.message || 'Le test de connexion à Binance a échoué.', 'error');
        } finally {
            setIsTestingBinance(false);
        }
    };

    const handleUpdatePassword = async () => {
        if (!newPassword) {
            showMessage("Le mot de passe ne peut pas être vide.", 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showMessage("Les mots de passe ne correspondent pas.", 'error');
            return;
        }
        setIsSaving(true);
        try {
            const result = await api.changePassword(newPassword);
            showMessage(result.message, result.success ? 'success' : 'error');
            if (result.success) {
                setNewPassword('');
                setConfirmPassword('');
            }
        } catch (error: any) {
            showMessage(error.message || "Échec de la mise à jour du mot de passe.", 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleClearAllData = async () => {
        setIsClearModalOpen(false); // Close the modal first
        setIsSaving(true);
        try {
            const result = await api.clearAllTradeData();
            if (result.success) {
                showMessage("Toutes les données de transaction ont été effacées avec succès !");
                refreshData(); // This will trigger a full data refresh across the app
            } else {
                 showMessage("Échec de l'effacement des données.", 'error');
            }
        } catch (error: any) {
             showMessage(error.message || "Une erreur est survenue lors de l'effacement des données.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const InputField: React.FC<{
        id: keyof BotSettings;
        label: string;
        type?: 'text' | 'number';
        step?: string;
        children?: React.ReactNode;
    }> = ({ id, label, type = 'number', step, children }) => {
        if (!settings) return null;
        return (
            <div>
                <label htmlFor={id} className="flex items-center text-sm font-medium text-gray-300">
                    {label}
                    <Tooltip text={tooltips[id]} />
                </label>
                <div className="relative mt-1">
                    <input
                        type={type}
                        id={id}
                        step={step}
                        value={settings[id] as any}
                        onChange={(e) => handleChange(id, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                        className={inputClass}
                    />
                    {children && <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">{children}</div>}
                </div>
            </div>
        );
    };

    const ToggleField: React.FC<{
        id: keyof BotSettings;
        label: string;
    }> = ({ id, label }) => {
        if (!settings) return null;
        return (
            <div className="flex justify-between items-center bg-[#0c0e12]/30 p-3 rounded-lg">
                <label htmlFor={id} className="flex items-center text-sm font-medium text-gray-300">
                    {label}
                    <Tooltip text={tooltips[id]} />
                </label>
                <ToggleSwitch
                    checked={settings[id] as boolean}
                    onChange={(checked) => handleChange(id, checked)}
                    leftLabel="ON"
                    rightLabel="OFF"
                />
            </div>
        );
    };

    if (!settings) {
        return <div className="flex justify-center items-center h-64"><Spinner /></div>;
    }

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white">Paramètres</h2>
                <div className="relative">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-[#f0b90b] px-6 py-2 text-sm font-semibold text-black shadow-sm hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-[#f0b90b] focus:ring-offset-2 focus:ring-offset-[#0c0e12] disabled:opacity-50"
                    >
                         {isSaving ? <Spinner size="sm" /> : 'Sauvegarder les Changements'}
                    </button>
                    {saveMessage && (
                        <div className={`absolute top-full mt-2 right-0 text-xs px-3 py-1 rounded-md ${saveMessage.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                           {saveMessage.text}
                        </div>
                    )}
                </div>
            </div>
            
             {/* Profile Selector */}
            <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-1">Profil de Comportement Adaptatif</h3>
                <p className="text-sm text-gray-400 mb-4">Activez le sélecteur dynamique pour laisser le bot choisir la meilleure tactique, ou désactivez-le pour sélectionner manuellement un profil.</p>
                <div className="flex items-center space-x-4 mb-4 bg-[#0c0e12]/30 p-3 rounded-lg">
                    <ToggleSwitch
                        checked={settings.USE_DYNAMIC_PROFILE_SELECTOR}
                        onChange={(checked) => handleChange('USE_DYNAMIC_PROFILE_SELECTOR', checked)}
                        leftLabel="AUTO"
                        rightLabel="MANUEL"
                    />
                    <label className="flex items-center text-sm font-medium text-gray-300">
                        Sélecteur de Profil Dynamique
                        <Tooltip text={tooltips.USE_DYNAMIC_PROFILE_SELECTOR} />
                    </label>
                </div>
                <div className={`transition-opacity ${settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'opacity-50' : ''}`}>
                    <div className="isolate inline-flex rounded-md shadow-sm">
                        {(['Le Sniper', 'Le Scalpeur', 'Le Chasseur de Volatilité'] as ProfileName[]).map((profile, idx) => (
                            <button
                                key={profile}
                                type="button"
                                onClick={() => handleProfileSelect(profile)}
                                disabled={settings.USE_DYNAMIC_PROFILE_SELECTOR}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-[#3e4451] focus:z-10 transition-colors group
                                    ${activeProfile === profile && !settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'bg-[#f0b90b] text-black' : 'bg-[#14181f] text-gray-300 hover:bg-[#2b2f38]'}
                                    ${idx === 0 ? 'rounded-l-md' : ''}
                                    ${idx === 2 ? 'rounded-r-md' : '-ml-px'}
                                    ${settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'cursor-not-allowed' : ''}
                                `}
                            >
                                {profile}
                                <div className="absolute bottom-full mb-2 w-64 rounded-lg bg-gray-900 border border-gray-700 p-3 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg"
                                    style={{ transform: 'translateX(-50%)', left: '50%' }}>
                                    {profileTooltips[profile]}
                                    <div className="absolute left-1/2 top-full h-2 w-2 -translate-x-1/2 bg-gray-900 border-b border-r border-gray-700" style={{ transform: 'translateX(-50%) rotate(45deg)' }}></div>
                                </div>
                            </button>
                        ))}
                    </div>
                    {activeProfile === 'PERSONNALISE' && !settings.USE_DYNAMIC_PROFILE_SELECTOR && <span className="ml-4 text-sm font-semibold text-sky-400">-- Profil Personnalisé Actif --</span>}
                    {settings.USE_DYNAMIC_PROFILE_SELECTOR && <span className="ml-4 text-sm font-semibold text-green-400">-- Le bot choisit la meilleure tactique --</span>}
                </div>
            </div>

            {/* Main Settings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">

                {/* Left Column */}
                <div className="space-y-6">
                    {/* Trading Parameters */}
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Gestion de Trade (ATR)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <InputField id="SL_ATR_MULTIPLIER" label="Multiplicateur ATR (SL)" step="0.1" children={<span className="text-gray-400 text-sm">x ATR</span>}/>
                             <InputField id="TP_ATR_MULTIPLIER" label="Multiplicateur ATR (TP)" step="0.1" children={<span className="text-gray-400 text-sm">x ATR</span>}/>
                             <InputField id="MAX_OPEN_POSITIONS" label="Positions Ouvertes Max" />
                             <InputField id="POSITION_SIZE_PCT" label="Taille de Position (%)" step="0.1" children={<span className="text-gray-400 text-sm">%</span>}/>
                             <InputField id="INITIAL_VIRTUAL_BALANCE" label="Solde Virtuel Initial" step="100" children={<span className="text-gray-400 text-sm">$</span>}/>
                             <InputField id="SLIPPAGE_PCT" label="Slippage Simulé (%)" step="0.01" children={<span className="text-gray-400 text-sm">%</span>}/>
                        </div>
                    </div>
                    {/* Advanced Strategy */}
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Stratégie & Filtres d'Entrée</h3>
                        <div className="space-y-4">
                            <ToggleField id="USE_MARKET_REGIME_FILTER" label="Filtre de Tendance Maître (Score > 50)" />
                            <ToggleField id="USE_VOLUME_CONFIRMATION" label="Confirmation par Volume (1m)" />
                            <ToggleField id="USE_RSI_SAFETY_FILTER" label="Filtre de Sécurité RSI (1h)" />
                             <div className={`transition-opacity ${settings.USE_RSI_SAFETY_FILTER ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <InputField id="RSI_OVERBOUGHT_THRESHOLD" label="Seuil de Surchauffe RSI" />
                            </div>
                            <ToggleField id="REQUIRE_STRONG_BUY" label="Exiger Confirmation de Structure (15m)" />
                            <InputField id="LOSS_COOLDOWN_HOURS" label="Cooldown après Perte (Heures)" children={<span className="text-gray-400 text-sm">h</span>}/>
                        </div>
                    </div>
                    
                     {/* Parabolic Filter */}
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Filtre Anti-Parabolique</h3>
                        <div className="space-y-4">
                             <ToggleField id="USE_PARABOLIC_FILTER" label="Activer le Filtre Anti-Mèches" />
                            <div className={`grid grid-cols-2 gap-4 transition-opacity ${settings.USE_PARABOLIC_FILTER ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                 <InputField id="PARABOLIC_FILTER_PERIOD_MINUTES" label="Période de Vérif. (min)" />
                                 <InputField id="PARABOLIC_FILTER_THRESHOLD_PCT" label="Seuil de Hausse (%)" step="0.1" />
                            </div>
                        </div>
                    </div>

                     {/* Global Circuit Breaker */}
                    <div className="bg-red-900/40 border border-red-700/50 rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-red-200 mb-4">Disjoncteur Global (Garde-Fou)</h3>
                         <div className="space-y-4">
                             <ToggleField id="USE_CIRCUIT_BREAKER" label="Activer le Disjoncteur Global" />
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${settings.USE_CIRCUIT_BREAKER ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                 <InputField id="CIRCUIT_BREAKER_SYMBOL" label="Symbole Surveillé" type="text" />
                                 <InputField id="CIRCUIT_BREAKER_THRESHOLD_PCT" label="Seuil de Chute (%)" step="0.1" />
                                 <InputField id="CIRCUIT_BREAKER_PERIOD_MINUTES" label="Période de Vérif. (min)" />
                                 <InputField id="CIRCUIT_BREAKER_COOLDOWN_HOURS" label="Pause Après (heures)" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    {/* Market Scanner */}
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Scanner de Marché</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <InputField id="MIN_VOLUME_USD" label="Volume 24h Minimum" step="1000000" children={<span className="text-gray-400 text-sm">$</span>}/>
                            <InputField id="SCANNER_DISCOVERY_INTERVAL_SECONDS" label="Intervalle de Scan (secondes)" children={<span className="text-gray-400 text-sm">s</span>}/>
                            <div>
                                <label htmlFor="EXCLUDED_PAIRS" className="flex items-center text-sm font-medium text-gray-300">
                                    Paires Exclues (séparées par des virgules)
                                    <Tooltip text={tooltips.EXCLUDED_PAIRS} />
                                </label>
                                <textarea
                                    id="EXCLUDED_PAIRS"
                                    value={settings.EXCLUDED_PAIRS}
                                    onChange={(e) => handleChange('EXCLUDED_PAIRS', e.target.value)}
                                    rows={2}
                                    className={inputClass + " font-mono"}
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Dynamic Risk Management */}
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Gestion Dynamique du Risque</h3>
                        <div className="space-y-4">
                            <ToggleField id="USE_AUTO_BREAKEVEN" label="Mise à Zéro Automatique (Break-Even)" />
                             <div className={`pl-4 space-y-4 mt-2 transition-opacity ${settings.USE_AUTO_BREAKEVEN ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <InputField id="BREAKEVEN_TRIGGER_PCT" label="Déclencheur Break-Even (%)" step="0.1" />
                                <ToggleField id="ADJUST_BREAKEVEN_FOR_FEES" label="Ajuster pour les Frais" />
                                <div className={`transition-opacity ${settings.ADJUST_BREAKEVEN_FOR_FEES ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                    <InputField id="TRANSACTION_FEE_PCT" label="Frais de Transaction (%)" step="0.01" />
                                </div>
                            </div>
                            <hr className="border-gray-700"/>
                            <ToggleField id="USE_PARTIAL_TAKE_PROFIT" label="Prise de Profit Partielle" />
                             <div className={`grid grid-cols-2 gap-4 transition-opacity ${settings.USE_PARTIAL_TAKE_PROFIT ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                 <InputField id="PARTIAL_TP_TRIGGER_PCT" label="Déclencheur Partiel (%)" step="0.1" />
                                 <InputField id="PARTIAL_TP_SELL_QTY_PCT" label="Quantité à Vendre (%)" />
                            </div>
                            <hr className="border-gray-700"/>
                            <ToggleField id="USE_TRAILING_STOP_LOSS" label="Stop Loss Suiveur (Trailing)" />
                            <div className={`transition-opacity ${settings.USE_TRAILING_STOP_LOSS ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <InputField id="TRAILING_STOP_ATR_MULTIPLIER" label="Distance Trailing (x ATR)" step="0.1" />
                            </div>
                             <hr className="border-gray-700"/>
                            <ToggleField id="USE_DYNAMIC_POSITION_SIZING" label="Dimensionnement Dynamique de Position" />
                            <div className={`transition-opacity ${settings.USE_DYNAMIC_POSITION_SIZING ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <InputField id="STRONG_BUY_POSITION_SIZE_PCT" label="Taille Position 'STRONG BUY' (%)" step="0.1" />
                            </div>
                        </div>
                    </div>
                     {/* Dynamic Profile Thresholds */}
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Seuils du Profil Dynamique</h3>
                        <div className={`space-y-4 transition-opacity ${settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                             <InputField id="ADX_THRESHOLD_RANGE" label="Seuil ADX (Marché en Range)" />
                             <InputField id="ATR_PCT_THRESHOLD_VOLATILE" label="Seuil ATR % (Marché Volatil)" step="0.1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* API and Security Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                 <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                     <h3 className="text-lg font-semibold text-white mb-4">Clés API & Actions</h3>
                     <div className="space-y-4">
                        <div>
                            <label htmlFor="BINANCE_API_KEY" className="flex items-center text-sm font-medium text-gray-300">
                                Clé API Binance <Tooltip text={tooltips.BINANCE_API_KEY} />
                            </label>
                             <input type="text" id="BINANCE_API_KEY" value={settings.BINANCE_API_KEY} onChange={(e) => handleChange('BINANCE_API_KEY', e.target.value)} className={inputClass} />
                        </div>
                        <div>
                            <label htmlFor="BINANCE_SECRET_KEY" className="flex items-center text-sm font-medium text-gray-300">
                                Clé Secrète Binance <Tooltip text={tooltips.BINANCE_SECRET_KEY} />
                            </label>
                            <input type="password" id="BINANCE_SECRET_KEY" value={settings.BINANCE_SECRET_KEY} onChange={(e) => handleChange('BINANCE_SECRET_KEY', e.target.value)} className={inputClass} />
                        </div>
                         <button onClick={handleTestBinanceConnection} disabled={isTestingBinance} className="w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50">
                             {isTestingBinance ? <Spinner size="sm" /> : 'Tester la Connexion Binance'}
                         </button>
                         <div className="bg-red-900/50 border border-red-700 rounded-lg p-4">
                            <h4 className="text-md font-semibold text-red-200">Zone de Danger</h4>
                            <p className="text-sm text-red-300 my-2">Cette action est irréversible et effacera tout votre historique de transactions.</p>
                            <button onClick={() => setIsClearModalOpen(true)} className="w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                               Effacer Toutes les Données de Transaction
                            </button>
                        </div>
                     </div>
                 </div>

                 <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                     <h3 className="text-lg font-semibold text-white mb-4">Sécurité</h3>
                     <div className="space-y-4">
                         <div>
                             <label htmlFor="newPassword" className="text-sm font-medium text-gray-300">Nouveau Mot de Passe</label>
                             <input type="password" id="newPassword" value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} placeholder="Au moins 8 caractères"/>
                         </div>
                         <div>
                             <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-300">Confirmer le Mot de Passe</label>
                             <input type="password" id="confirmPassword" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={inputClass} />
                         </div>
                         <button onClick={handleUpdatePassword} disabled={isSaving} className="w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-black bg-sky-400 hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 disabled:opacity-50">
                             Mettre à Jour le Mot de Passe
                         </button>
                     </div>
                </div>
            </div>
            
            <Modal
                isOpen={isClearModalOpen}
                onClose={() => setIsClearModalOpen(false)}
                onConfirm={handleClearAllData}
                title="Confirmer l'effacement des données ?"
                confirmText="Oui, tout effacer"
                confirmVariant="danger"
            >
                Êtes-vous absolument certain ? Toutes vos positions, votre historique de transactions et votre P&L seront définitivement supprimés. Votre solde sera réinitialisé.
            </Modal>
        </div>
    );
};

export default SettingsPage;
