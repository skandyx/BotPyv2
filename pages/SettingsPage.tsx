import React, { useState, useEffect } from 'react';
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
    'Le Sniper': "PRUDENT : Vise la qualité maximale et les grandes tendances. Utilise un SL et un TP larges basés sur l'ATR, un trailing stop adaptatif pour maximiser les gains, et exige une confirmation structurelle pour entrer.",
    'Le Scalpeur': "ÉQUILIBRÉ : Optimisé pour des gains rapides et constants. Vise des objectifs de profit serrés (1.5x le risque ATR) sans trailing stop. Idéal pour les marchés en range. Exige une confirmation structurelle.",
    'Le Chasseur de Volatilité': "AGRESSIF : Conçu pour les marchés explosifs. Entre de manière agressive sur le momentum pur (sans confirmation 15m). Utilise un SL ATR très large pour survivre au bruit, et un trailing stop serré pour sécuriser les gains rapidement."
};

const settingProfiles: Record<ProfileName, Partial<BotSettings>> = {
    'Le Sniper': {
        SL_ATR_MULTIPLIER: 1.5,
        TP_ATR_MULTIPLIER: 4.0,
        USE_TRAILING_STOP_LOSS: true,
        TRAILING_STOP_ATR_MULTIPLIER: 2.0,
        USE_ADAPTIVE_TRAILING_STOP: true,
        ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: 1.2,
    },
    'Le Scalpeur': {
        SL_ATR_MULTIPLIER: 1.2,
        TP_ATR_MULTIPLIER: 1.5,
        USE_TRAILING_STOP_LOSS: false,
        USE_ADAPTIVE_TRAILING_STOP: false,
    },
    'Le Chasseur de Volatilité': {
        SL_ATR_MULTIPLIER: 2.5,
        TP_ATR_MULTIPLIER: 6.0,
        USE_TRAILING_STOP_LOSS: true,
        TRAILING_STOP_ATR_MULTIPLIER: 1.2,
        USE_ADAPTIVE_TRAILING_STOP: true,
        ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: 1.0,
    }
};

const tooltips: Record<string, string> = {
    SL_ATR_MULTIPLIER: "Multiplicateur de l'ATR pour définir le Stop Loss initial. Base du calcul de risque (1R).",
    TP_ATR_MULTIPLIER: "Multiplicateur de l'ATR pour définir le Take Profit final. Un TP à 4.0 et un SL à 1.5 donnent un R:R de 2.66.",
    USE_TRAILING_STOP_LOSS: "Active un stop loss dynamique qui suit le prix à la hausse.",
    TRAILING_STOP_ATR_MULTIPLIER: "Distance (en multiple d'ATR) à laquelle le stop suiveur se maintient en dessous du plus haut prix atteint.",
    USE_ADAPTIVE_TRAILING_STOP: "Si activé, le 'Trailing Stop ATR Multiplier' sera resserré à la valeur 'Tighten Multiplier' une fois que le trade atteint +1R (profit = risque initial), pour protéger les gains plus agressivement.",
    ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER: "Le nouveau multiplicateur ATR, plus serré, à appliquer au stop suiveur une fois que le trade est gagnant de 1R.",
    AGGRESSIVE_ENTRY_PROFILES: "Liste des noms de profils (séparés par une virgule) qui sont autorisés à entrer en mode 'agressif' (cassure MME9 1m + volume) sans attendre la confirmation structurelle (cassure du plus haut 15m).",
    USE_DYNAMIC_PROFILE_SELECTOR: "Si activé, le bot choisira automatiquement le meilleur profil (Sniper, Scalpeur, Chasseur) pour chaque trade en fonction des conditions de marché (tendance, volatilité) au moment de l'entrée.",
    ADX_THRESHOLD_RANGE: "Le seuil ADX (15m) en dessous duquel un marché est considéré comme étant en 'range' (faible tendance), déclenchant le profil 'Scalpeur'.",
    ATR_PCT_THRESHOLD_VOLATILE: "Le seuil de l'ATR (en % du prix) au-dessus duquel un marché est considéré comme hyper-volatil, déclenchant le profil 'Chasseur de Volatilité'.",
    // FIX: Add a tooltip for the new RSI threshold setting.
    RSI_OVERBOUGHT_THRESHOLD: "Le seuil RSI (1h) au-dessus duquel une entrée est considérée comme risquée ('overbought'). Cela ne bloque pas un trade mais sert d'indicateur de sécurité.",
    USE_CIRCUIT_BREAKER: "Active le disjoncteur global, un garde-fou qui surveille un actif majeur (comme BTC) pour détecter un 'flash crash' du marché et préserver le capital.",
    CIRCUIT_BREAKER_SYMBOL: "Le symbole à surveiller pour le disjoncteur (ex: BTCUSDT).",
    CIRCUIT_BREAKER_PERIOD_MINUTES: "La période (en minutes) sur laquelle la chute de prix est mesurée.",
    CIRCUIT_BREAKER_ALERT_THRESHOLD_PCT: "Le pourcentage de chute qui déclenche le niveau 'ALERTE'. Le bot réduira la taille des nouvelles positions mais continuera à trader.",
    CIRCUIT_BREAKER_BLOCK_THRESHOLD_PCT: "Le pourcentage de chute qui déclenche le niveau 'BLOCAGE'. Le bot arrêtera tout trading et clôturera toutes les positions ouvertes.",
    CIRCUIT_BREAKER_ALERT_POSITION_SIZE_MULTIPLIER: "Le facteur par lequel la taille de position est multipliée en mode 'ALERTE' (ex: 0.5 pour la diviser par deux).",
    CIRCUIT_BREAKER_COOLDOWN_HOURS: "La durée (en heures) pendant laquelle le bot restera en pause après le déclenchement d'un BLOCAGE complet.",
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

    useEffect(() => {
        if (!settings || settings.USE_DYNAMIC_PROFILE_SELECTOR) {
            setActiveProfile('PERSONNALISE');
            return;
        }
        const checkProfile = (profile: Partial<BotSettings>): boolean => {
            return Object.keys(profile).every(key => {
                const settingKey = key as keyof BotSettings;
                if (!settings.hasOwnProperty(settingKey)) return false;
                if (typeof settings[settingKey] === 'number' && typeof profile[settingKey] === 'number') {
                     return Math.abs((settings[settingKey] as number) - (profile[settingKey] as number)) < 0.001;
                }
                return settings[settingKey] === profile[settingKey];
            });
        };
        let currentProfile: ActiveProfile = 'PERSONNALISE';
        if (checkProfile(settingProfiles['Le Sniper'])) currentProfile = 'Le Sniper';
        else if (checkProfile(settingProfiles['Le Scalpeur'])) currentProfile = 'Le Scalpeur';
        else if (checkProfile(settingProfiles['Le Chasseur de Volatilité'])) currentProfile = 'Le Chasseur de Volatilité';
        
        if (currentProfile !== activeProfile) setActiveProfile(currentProfile);
    }, [settings, activeProfile]);

    const handleProfileSelect = (profileName: ProfileName) => {
        if (!settings || settings.USE_DYNAMIC_PROFILE_SELECTOR) return;
        const profileSettings = settingProfiles[profileName];
        setSettings(prev => prev ? { ...prev, ...profileSettings } : null);
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
            showMessage(`Échec de la sauvegarde : ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleClearAllData = async () => {
        setIsClearModalOpen(false);
        setIsSaving(true);
        try {
            await api.clearAllTradeData();
            showMessage("Données de transaction effacées !");
            refreshData();
        } catch (error: any) {
             showMessage(`Erreur lors de l'effacement : ${error.message}`, 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const InputField: React.FC<{
        id: keyof BotSettings;
        label: string;
        type?: 'text' | 'number';
        step?: string;
    }> = ({ id, label, type = 'number', step }) => {
        if (!settings) return null;
        return (
            <div>
                <label htmlFor={id} className="flex items-center text-sm font-medium text-gray-300">
                    {label}
                    {tooltips[id] && <Tooltip text={tooltips[id]} />}
                </label>
                <input
                    type={type} id={id} step={step}
                    value={settings[id] as any}
                    onChange={(e) => handleChange(id, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
                    className={inputClass}
                />
            </div>
        );
    };

    const ToggleField: React.FC<{id: keyof BotSettings; label: string;}> = ({ id, label }) => {
        if (!settings) return null;
        return (
            <div className="flex justify-between items-center bg-[#0c0e12]/30 p-3 rounded-lg">
                <label htmlFor={id} className="flex items-center text-sm font-medium text-gray-300">
                    {label}
                    {tooltips[id] && <Tooltip text={tooltips[id]} />}
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
                         {isSaving ? <Spinner size="sm" /> : 'Sauvegarder'}
                    </button>
                    {saveMessage && (
                        <div className={`absolute top-full mt-2 right-0 text-xs px-3 py-1 rounded-md ${saveMessage.type === 'success' ? 'bg-green-800 text-green-200' : 'bg-red-800 text-red-200'}`}>
                           {saveMessage.text}
                        </div>
                    )}
                </div>
            </div>
            
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
                    <label className="flex items-center text-sm font-medium text-gray-300">Sélecteur de Profil Dynamique</label>
                </div>
                <div className={`transition-opacity ${settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'opacity-50' : ''}`}>
                    <div className="isolate inline-flex rounded-md shadow-sm">
                        {(['Le Sniper', 'Le Scalpeur', 'Le Chasseur de Volatilité'] as ProfileName[]).map((profile, idx) => (
                            <button key={profile} type="button" onClick={() => handleProfileSelect(profile)}
                                disabled={settings.USE_DYNAMIC_PROFILE_SELECTOR}
                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ring-1 ring-inset ring-[#3e4451] focus:z-10 transition-colors group
                                    ${activeProfile === profile && !settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'bg-[#f0b90b] text-black' : 'bg-[#14181f] text-gray-300 hover:bg-[#2b2f38]'}
                                    ${idx === 0 ? 'rounded-l-md' : ''} ${idx === 2 ? 'rounded-r-md' : '-ml-px'}
                                    ${settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'cursor-not-allowed' : ''}`}>
                                {profile}
                                <div className="absolute bottom-full mb-2 w-64 rounded-lg bg-gray-900 border border-gray-700 p-3 text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10 shadow-lg"
                                    style={{ transform: 'translateX(-50%)', left: '50%' }}>
                                    {profileTooltips[profile]}
                                </div>
                            </button>
                        ))}
                    </div>
                    {activeProfile === 'PERSONNALISE' && !settings.USE_DYNAMIC_PROFILE_SELECTOR && <span className="ml-4 text-sm font-semibold text-sky-400">-- Profil Personnalisé Actif --</span>}
                    {settings.USE_DYNAMIC_PROFILE_SELECTOR && <span className="ml-4 text-sm font-semibold text-green-400">-- Le bot choisit la meilleure tactique --</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-6">
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Gestion de Trade (ATR)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <InputField id="SL_ATR_MULTIPLIER" label="Multiplicateur ATR (SL)" step="0.1" />
                             <InputField id="TP_ATR_MULTIPLIER" label="Multiplicateur ATR (TP)" step="0.1" />
                        </div>
                    </div>
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Stop Suiveur (Trailing Stop)</h3>
                        <div className="space-y-4">
                            <ToggleField id="USE_TRAILING_STOP_LOSS" label="Activer le Stop Suiveur" />
                            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${settings.USE_TRAILING_STOP_LOSS ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                                <InputField id="TRAILING_STOP_ATR_MULTIPLIER" label="Distance Suivi (x ATR)" step="0.1" />
                                <div className="space-y-2">
                                    <ToggleField id="USE_ADAPTIVE_TRAILING_STOP" label="Resserrage Adaptatif" />
                                    <InputField id="ADAPTIVE_TRAILING_STOP_TIGHTEN_MULTIPLIER" label="Distance Resserée (x ATR)" step="0.1" />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Filtres & Stratégie</h3>
                         <InputField id="AGGRESSIVE_ENTRY_PROFILES" label="Profils à Entrée Agressive" type="text" />
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <InputField id="MAX_OPEN_POSITIONS" label="Positions Ouvertes Max" />
                             <InputField id="POSITION_SIZE_PCT" label="Taille de Position (%)" step="0.1"/>
                         </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Scanner & Paramètres Généraux</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField id="INITIAL_VIRTUAL_BALANCE" label="Solde Virtuel Initial" step="100"/>
                            <InputField id="MIN_VOLUME_USD" label="Volume 24h Minimum" step="1000000"/>
                            <InputField id="SCANNER_DISCOVERY_INTERVAL_SECONDS" label="Intervalle Scan (sec)"/>
                            <InputField id="SLIPPAGE_PCT" label="Slippage Simulé (%)" step="0.01"/>
                            {/* FIX: Add an input field for the new RSI threshold setting. */}
                            <InputField id="RSI_OVERBOUGHT_THRESHOLD" label="Seuil RSI Overbought (1h)" />
                        </div>
                         <div>
                            <label htmlFor="EXCLUDED_PAIRS" className="flex items-center text-sm font-medium text-gray-300">Paires Exclues</label>
                            <textarea id="EXCLUDED_PAIRS" value={settings.EXCLUDED_PAIRS} onChange={(e) => handleChange('EXCLUDED_PAIRS', e.target.value)} rows={2} className={inputClass + " font-mono"}/>
                        </div>
                    </div>
                     <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-6 shadow-lg">
                        <h3 className="text-lg font-semibold text-white mb-4">Seuils du Profil Dynamique</h3>
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${settings.USE_DYNAMIC_PROFILE_SELECTOR ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                             <InputField id="ADX_THRESHOLD_RANGE" label="Seuil ADX (Range)" />
                             <InputField id="ATR_PCT_THRESHOLD_VOLATILE" label="Seuil ATR % (Volatil)" step="0.1" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-red-900/40 border border-red-700/50 rounded-lg p-6 shadow-lg">
                <h3 className="text-lg font-semibold text-red-200 mb-4">Disjoncteur Global Gradué</h3>
                 <div className="space-y-4">
                     <ToggleField id="USE_CIRCUIT_BREAKER" label="Activer le Disjoncteur Global" />
                    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 transition-opacity ${settings.USE_CIRCUIT_BREAKER ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                         <InputField id="CIRCUIT_BREAKER_SYMBOL" label="Symbole Surveillé" type="text" />
                         <InputField id="CIRCUIT_BREAKER_PERIOD_MINUTES" label="Période (min)" />
                         <InputField id="CIRCUIT_BREAKER_COOLDOWN_HOURS" label="Pause Après (heures)" />
                         <InputField id="CIRCUIT_BREAKER_ALERT_THRESHOLD_PCT" label="Seuil Alerte (%)" step="0.1" />
                         <InputField id="CIRCUIT_BREAKER_BLOCK_THRESHOLD_PCT" label="Seuil Blocage (%)" step="0.1" />
                         <InputField id="CIRCUIT_BREAKER_ALERT_POSITION_SIZE_MULTIPLIER" label="Multiplicateur Taille (Alerte)" step="0.1" />
                    </div>
                     <div className="bg-red-950/50 p-4 rounded-md">
                        <h4 className="text-md font-semibold text-red-200">Zone de Danger</h4>
                        <p className="text-sm text-red-300 my-2">Cette action est irréversible et effacera tout votre historique de transactions.</p>
                        <button onClick={() => setIsClearModalOpen(true)} className="w-full text-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                           Effacer Toutes les Données de Transaction
                        </button>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={isClearModalOpen} onClose={() => setIsClearModalOpen(false)} onConfirm={handleClearAllData}
                title="Confirmer l'effacement des données ?" confirmText="Oui, tout effacer" confirmVariant="danger">
                Êtes-vous absolument certain ? Toutes vos positions, votre historique et votre P&L seront définitivement supprimés.
            </Modal>
        </div>
    );
};

export default SettingsPage;