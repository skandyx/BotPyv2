
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { TradingMode } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from './AuthContext';
import { logService } from '../services/logService';

interface BotStateContextType {
  isBotRunning: boolean;
  setIsBotRunning: React.Dispatch<React.SetStateAction<boolean>>;
  isCircuitBreakerActive: boolean;
  setIsCircuitBreakerActive: React.Dispatch<React.SetStateAction<boolean>>;
  toggleBot: () => void;
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => void;
}

const BotStateContext = createContext<BotStateContextType | undefined>(undefined);

export const BotStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBotRunning, setIsBotRunning] = useState<boolean>(true);
  const [isCircuitBreakerActive, setIsCircuitBreakerActive] = useState<boolean>(false);
  const [tradingMode, setTradingModeState] = useState<TradingMode>(TradingMode.VIRTUAL);
  const { isAuthenticated } = useAuth();

  // Effect to fetch initial bot state (run status and trading mode) when authenticated
  useEffect(() => {
    const fetchInitialState = async () => {
        try {
            // Updated to fetch global status which includes circuit breaker
            const [statusData, modeData] = await Promise.all([
                api.getBotRunStatus(), // This should be updated to a global status endpoint
                api.fetchTradingMode()
            ]);
            setIsBotRunning(statusData.isRunning);
            // The initial circuit breaker state will be false, updated by WebSocket.
            setIsCircuitBreakerActive(false); 
            setTradingModeState(modeData.mode);
            logService.log('INFO', `Initial bot state loaded. Running: ${statusData.isRunning}, Mode: ${modeData.mode}`);
        } catch (err) {
            console.error("Could not fetch initial bot state:", err);
            logService.log('ERROR', 'Failed to fetch initial bot state from server.');
        }
    };

    if (isAuthenticated) {
        fetchInitialState();
    }
  }, [isAuthenticated]);

  const toggleBot = useCallback(async () => {
    try {
        if (isBotRunning) {
            await api.stopBot();
            setIsBotRunning(false);
        } else {
            await api.startBot();
            setIsBotRunning(true);
        }
    } catch (error) {
        console.error("Failed to toggle bot state:", error);
    }
  }, [isBotRunning]);

  // This function now synchronizes with the backend
  const setTradingMode = useCallback(async (mode: TradingMode) => {
    try {
        logService.log('INFO', `Attempting to switch mode to ${mode}...`);
        const result = await api.updateTradingMode(mode);
        if (result.success) {
            setTradingModeState(result.mode);
            logService.log('INFO', `Successfully switched mode to ${result.mode}`);
        }
    } catch (error) {
        console.error("Failed to set trading mode:", error);
        logService.log('ERROR', `Failed to switch mode: ${error}`);
    }
  }, []);

  return (
    <BotStateContext.Provider value={{ isBotRunning, setIsBotRunning, isCircuitBreakerActive, setIsCircuitBreakerActive, toggleBot, tradingMode, setTradingMode }}>
      {children}
    </BotStateContext.Provider>
  );
};

export const useBotState = (): BotStateContextType => {
  const context = useContext(BotStateContext);
  if (context === undefined) {
    throw new Error('useBotState must be used within a BotStateProvider');
  }
  return context;
};
