
import React, { useState, useEffect, useMemo } from 'react';
import { ScannedPair, StrategyConditions } from '../types';
import Spinner from '../components/common/Spinner';
import { scannerStore } from '../services/scannerStore';
import { useAppContext } from '../contexts/AppContext';
import TradingViewWidget from '../components/common/TradingViewWidget';
import { SearchIcon } from '../components/icons/Icons';

type SortableKeys = keyof ScannedPair | 'vol_spike'; // Add custom sort key
type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: SortableKeys;
  direction: SortDirection;
}

const formatPrice = (price: number | undefined | null): string => {
    if (price === undefined || price === null) return 'N/A';
    if (price >= 1000) return price.toFixed(2);
    if (price >= 10) return price.toFixed(3);
    if (price >= 0.1) return price.toFixed(4);
    if (price >= 0.001) return price.toFixed(6);
    return price.toFixed(8);
};

const formatVolume = (volume: number | undefined | null): string => {
    if (volume === undefined || volume === null) return 'N/A';
    if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(2)}M`;
    if (volume >= 1_000) return `${(volume / 1_000).toFixed(1)}k`;
    return volume.toFixed(0);
};

const SortableHeader: React.FC<{
    sortConfig: SortConfig | null;
    requestSort: (key: SortableKeys) => void;
    sortKey: SortableKeys;
    children: React.ReactNode;
    className?: string;
}> = ({ sortConfig, requestSort, sortKey, children, className }) => {
    const isSorted = sortConfig?.key === sortKey;
    const directionIcon = isSorted ? (sortConfig?.direction === 'asc' ? '▲' : '▼') : '';
    const baseClasses = "px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-[#14181f] transition-colors";

    return (
        <th 
            scope="col" 
            className={`${baseClasses} ${className || ''}`}
            onClick={() => requestSort(sortKey)}
        >
            <div className="flex items-center">
                <span>{children}</span>
                <span className="ml-2 text-[#f0b90b]">{directionIcon}</span>
            </div>
        </th>
    );
};

const EmptyScannerIcon = () => (
    <svg className="mx-auto h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" strokeWidth="1" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.042 21.672L13.684 16.6m0 0l-2.51 2.225.569-9.47 5.227 7.917-3.286-.672zm-7.518-.267A8.25 8.25 0 1120.25 10.5M8.288 14.212A5.25 5.25 0 1117.25 10.5" />
    </svg>
);

const Dot: React.FC<{ active: boolean; tooltip: string }> = ({ active, tooltip }) => (
    <div
      className={`h-3 w-3 rounded-full transition-colors ${active ? 'bg-green-500' : 'bg-red-500'}`}
      title={tooltip}
    />
);

const ConditionDots: React.FC<{ conditions?: StrategyConditions }> = ({ conditions }) => {
    const conditionTooltips = {
        trend: 'Tendance 4h (Prix > EMA50)',
        squeeze: 'Compression 15m (BB Squeeze)',
        breakout: 'Cassure 15m (Clôture > BB Sup.)',
        volume: 'Volume 15m (Volume > 2x Moyenne)',
        safety: 'Sécurité 1h (RSI < Seuil)',
    };

    return (
        <div className="flex items-center space-x-2">
            <Dot active={conditions?.trend ?? false} tooltip={conditionTooltips.trend} />
            <Dot active={conditions?.squeeze ?? false} tooltip={conditionTooltips.squeeze} />
            <Dot active={conditions?.breakout ?? false} tooltip={conditionTooltips.breakout} />
            <Dot active={conditions?.volume ?? false} tooltip={conditionTooltips.volume} />
            <Dot active={conditions?.safety ?? false} tooltip={conditionTooltips.safety} />
        </div>
    );
};


const ScannerPage: React.FC = () => {
  const [pairs, setPairs] = useState<ScannedPair[]>(() => scannerStore.getScannedPairs());
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'score_value', direction: 'desc' });
  const [selectedPair, setSelectedPair] = useState<ScannedPair | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { settings } = useAppContext();

  useEffect(() => {
    const handleStoreUpdate = (updatedPairs: ScannedPair[]) => {
      setPairs(updatedPairs);
    };

    const unsubscribe = scannerStore.subscribe(handleStoreUpdate);
    setPairs(scannerStore.getScannedPairs());

    return () => {
      unsubscribe();
    };
  }, []);


  const requestSort = (key: SortableKeys) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedPairs = useMemo(() => {
    const filtered = searchQuery
        ? pairs.filter(p => p.symbol.toLowerCase().includes(searchQuery.toLowerCase()))
        : pairs;

    let sortablePairs = [...filtered];
    if (sortConfig !== null) {
      sortablePairs.sort((a, b) => {
        let aVal, bVal;
        const key = sortConfig.key;
        
        // --- Custom sort logic for nested/derived properties ---
        if (key === 'bollinger_bands_15m') {
            aVal = a.bollinger_bands_15m?.width_pct;
            bVal = b.bollinger_bands_15m?.width_pct;
        } else if (key === 'vol_spike') {
            aVal = a.conditions?.volume ?? false;
            bVal = b.conditions?.volume ?? false;
        } else {
            aVal = a[key as keyof ScannedPair];
            bVal = b[key as keyof ScannedPair];
        }
        
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        
        if (aVal < bVal) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortablePairs;
  }, [pairs, sortConfig, searchQuery]);
  
    const getScoreValueBadgeClass = (scoreValue: number | undefined) => {
        if (scoreValue === undefined) return 'bg-gray-700 text-gray-200';
        if (scoreValue >= 99) return 'bg-green-600 text-green-100'; // 5/5
        if (scoreValue >= 80) return 'bg-sky-600 text-sky-100'; // 4/5
        if (scoreValue >= 60) return 'bg-yellow-600 text-yellow-100'; // 3/5
        return 'bg-gray-700 text-gray-200'; // 0-2/5
    };

  
  // --- COLOR CODING HELPERS ---
  const getTrendColorClass = (isAbove?: boolean): string => {
    if (isAbove === true) return 'text-green-400'; // Favorable
    if (isAbove === false) return 'text-red-400'; // Unfavorable
    return 'text-gray-500'; // Neutral / Not available
  };

  const getRsiColorClass = (rsi?: number): string => {
    if (!rsi || !settings) return 'text-gray-500';
    const threshold = settings.RSI_OVERBOUGHT_THRESHOLD;
    if (rsi >= threshold) return 'text-red-400 font-bold'; // Unfavorable
    if (rsi >= threshold - 10) return 'text-yellow-400'; // Warning
    return 'text-green-400'; // Favorable
  };

  const getBbWidthColorClass = (bbWidth?: number, isInSqueeze?: boolean): string => {
      if (isInSqueeze) return 'text-sky-300 font-semibold'; // Favorable Squeeze
      if (bbWidth === undefined || bbWidth === null) return 'text-gray-500';
      if (bbWidth < 2.0) return 'text-yellow-400'; // Warning: getting tight
      return 'text-gray-300'; // Neutral/Wide
  };


  if (!settings) {
    return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  }
  
  const totalColumnCount = 12;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl sm:text-3xl font-bold text-white">Scanner de Marché</h2>

      {selectedPair && (
        <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg p-3 sm:p-5 shadow-lg relative">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-white">Graphique : {selectedPair.symbol}</h3>
                <button 
                    onClick={() => setSelectedPair(null)} 
                    className="text-gray-400 hover:text-white text-2xl leading-none absolute top-3 right-4 z-10"
                    aria-label="Fermer le graphique"
                >
                   &times;
                </button>
            </div>
            <TradingViewWidget 
                symbol={selectedPair.symbol} 
                defaultInterval={selectedPair.is_on_hotlist ? '1' : '15'} 
            />
        </div>
      )}

      <div className="bg-[#14181f]/50 border border-[#2b2f38] rounded-lg shadow-lg overflow-hidden">
         <div className="p-4 bg-[#14181f]/30">
            <div className="relative w-full md:max-w-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    placeholder="Rechercher Symbole..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="block w-full rounded-md border-[#3e4451] bg-[#0c0e12]/50 pl-10 pr-4 py-2 shadow-sm focus:border-[#f0b90b] focus:ring-[#f0b90b] sm:text-sm text-white"
                />
            </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: 'calc(100vh - 20rem)' }}>
            <table className="min-w-full divide-y divide-[#2b2f38]">
                <thead className="bg-[#14181f] sticky top-0 z-10">
                    <tr>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="is_on_hotlist" className="text-center">Hotlist</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="symbol">Symbole</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="price">Prix</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="score_value">Score</SortableHeader>
                        <th scope="col" className="px-2 sm:px-4 lg:px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Conditions</th>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="price_above_ema50_4h">Tendance 4h</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="rsi_1h">RSI 1h</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="volume">Volume 24h</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="vol_spike" className="text-center">Vol Spike 15m</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="volume_20_period_avg_15m">Vol Moy 15m</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="bollinger_bands_15m">Largeur BB 15m</SortableHeader>
                        <SortableHeader sortConfig={sortConfig} requestSort={requestSort} sortKey="atr_15m">ATR 15m</SortableHeader>
                    </tr>
                </thead>
                <tbody className="bg-[#14181f]/50 divide-y divide-[#2b2f38]">
                    {filteredAndSortedPairs.length > 0 ? (
                        filteredAndSortedPairs.map(pair => {
                            const priceClass = pair.priceDirection === 'up' ? 'text-green-400' : (pair.priceDirection === 'down' ? 'text-red-400' : 'text-gray-300');
                            const bbWidth = pair.bollinger_bands_15m?.width_pct;

                            return (
                                <tr 
                                    key={pair.symbol}
                                    onClick={() => setSelectedPair(pair)}
                                    className="hover:bg-[#2b2f38]/50 cursor-pointer transition-colors"
                                >
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-center text-xl">
                                        <span title="Prêt pour entrée de précision 1m">
                                            {pair.is_on_hotlist ? '🎯' : ''}
                                        </span>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{pair.symbol}</td>
                                    <td className={`px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-mono transition-colors duration-200 ${priceClass}`}>${formatPrice(pair.price)}</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center space-x-2">
                                            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full w-12 text-center ${getScoreValueBadgeClass(pair.score_value)}`}>
                                                {pair.score_value?.toFixed(0) ?? 'N/A'}
                                            </span>
                                            <span className="font-mono text-gray-400 text-xs">
                                                ({pair.conditions_met_count ?? 0}/5)
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap">
                                        <ConditionDots conditions={pair.conditions} />
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold">
                                        <span className={getTrendColorClass(pair.price_above_ema50_4h)}>
                                            {pair.price_above_ema50_4h === true ? '▲ HAUSSIER' : (pair.price_above_ema50_4h === false ? '▼ BAISSIER' : '-')}
                                        </span>
                                    </td>
                                    <td className={`px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm ${getRsiColorClass(pair.rsi_1h)}`}>
                                        {pair.rsi_1h?.toFixed(1) || 'N/A'}
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-400">${(pair.volume / 1_000_000).toFixed(2)}M</td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm font-semibold text-center">
                                        {pair.conditions?.volume === true ? (
                                            <span className="text-green-400" title="Volume actuel > 2x la moyenne">▲ SPIKE</span>
                                        ) : pair.conditions?.volume === false ? (
                                            <span className="text-red-400" title="Volume actuel < 2x la moyenne">─ NORMAL</span>
                                        ) : (
                                            <span className="text-gray-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                                        {formatVolume(pair.volume_20_period_avg_15m)}
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm">
                                        <div className="flex items-center space-x-2">
                                            <span className={getBbWidthColorClass(bbWidth, pair.is_in_squeeze_15m)}>
                                                {bbWidth !== undefined ? `${bbWidth.toFixed(2)}%` : 'N/A'}
                                            </span>
                                            {pair.is_in_squeeze_15m && (
                                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-800 text-sky-200" title="Bollinger Bands Squeeze Detected">
                                                    SQUEEZE
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">
                                        {formatPrice(pair.atr_15m)}
                                    </td>
                                </tr>
                            )
                        })
                    ) : (
                         <tr>
                            <td colSpan={totalColumnCount} className="px-6 py-16 text-center text-gray-500">
                                <div className="flex flex-col items-center">
                                    <EmptyScannerIcon />
                                    <h3 className="mt-4 text-sm font-semibold text-gray-300">
                                        {searchQuery ? 'Aucun Résultat' : 'Aucune Paire Trouvée'}
                                    </h3>
                                    <p className="mt-1 text-sm text-gray-500">
                                        {searchQuery 
                                            ? `Aucune paire ne correspond à "${searchQuery}".`
                                            : "Aucune paire ne correspond actuellement aux critères du scanner."
                                        }
                                    </p>
                                     {!searchQuery && (
                                        <p className="mt-1 text-sm text-gray-500">
                                            Essayez d'ajuster vos filtres sur la page Paramètres ou attendez que les conditions du marché changent.
                                        </p>
                                     )}
                                </div>
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
