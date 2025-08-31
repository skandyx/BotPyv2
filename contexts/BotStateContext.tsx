
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { TradingMode, CircuitBreakerStatus } from '../types';
import { api } from '../services/mockApi';
import { useAuth } from './AuthContext';
import { logService } from '../services/logService';

interface BotStateContextType {
  isBotRunning: boolean;
  setIsBotRunning: React.Dispatch<React.SetStateAction<boolean>>;
  circuitBreakerStatus: CircuitBreakerStatus;
  setCircuitBreakerStatus: React.Dispatch<React.SetStateAction<CircuitBreakerStatus>>;
  toggleBot: () => void;
  tradingMode: TradingMode;
  setTradingMode: (mode: TradingMode) => void;
}

const BotStateContext = createContext<BotStateContextType | undefined>(undefined);

export const BotStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBotRunning, setIsBotRunning] = useState<boolean>(true);
  const [circuitBreakerStatus, setCircuitBreakerStatus] = useState<CircuitBreakerStatus>(CircuitBreakerStatus.INACTIVE);
  const [tradingMode, setTradingModeState] = useState<TradingMode>(TradingMode.VIRTUAL);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchInitialState = async () => {
        try {
            // This endpoint will be updated in the backend to return the full status
            const [statusData, modeData] = await Promise.all([
                api.getBotRunStatus(),
                api.fetchTradingMode()
            ]);
            setIsBotRunning(statusData.isRunning);
            // The initial circuit breaker state will be INACTIVE, updated by WebSocket.
            setCircuitBreakerStatus(CircuitBreakerStatus.INACTIVE); 
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
    <BotStateContext.Provider value={{ isBotRunning, setIsBotRunning, circuitBreakerStatus, setCircuitBreakerStatus, toggleBot, tradingMode, setTradingMode }}>
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
