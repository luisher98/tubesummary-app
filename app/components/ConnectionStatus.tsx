'use client';

import { useState, useEffect } from 'react';
import { checkBackendConnection, type ConnectionStatus } from '@/lib/utils/connectionChecker';

interface Props {
  showOnlyWhenOffline?: boolean;
  className?: string;
}

export default function ConnectionStatus({ showOnlyWhenOffline = true, className = '' }: Props) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnection = async () => {
    setIsChecking(true);
    try {
      const connectionStatus = await checkBackendConnection();
      setStatus(connectionStatus);
    } catch (error) {
      setStatus({
        isConnected: false,
        error: 'Failed to check connection',
        timestamp: Date.now(),
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    void checkConnection();
    
    // Check connection every 30 seconds
    const interval = setInterval(() => void checkConnection(), 30000);
    
    return () => clearInterval(interval);
  }, []);

  // If we should only show when offline and we're connected, don't render
  if (showOnlyWhenOffline && status?.isConnected) {
    return null;
  }

  if (!status) {
    return null;
  }

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
      );
    }
    
    if (status.isConnected) {
      return (
        <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      );
    }
    
    return (
      <svg className="h-4 w-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
    );
  };

  const getStatusMessage = () => {
    if (isChecking) {
      return 'Checking connection...';
    }
    
    if (status.isConnected) {
      return `Connected${status.latency ? ` (${status.latency}ms)` : ''}`;
    }
    
    return status.error ?? 'Backend server not available';
  };

  const getStatusColor = () => {
    if (isChecking) return 'text-gray-600 dark:text-gray-400';
    if (status.isConnected) return 'text-green-600 dark:text-green-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {getStatusIcon()}
      <span className={`text-xs ${getStatusColor()}`}>
        {getStatusMessage()}
      </span>
      {!status.isConnected && !isChecking && (
        <button
          onClick={checkConnection}
          className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
        >
          Retry
        </button>
      )}
    </div>
  );
} 