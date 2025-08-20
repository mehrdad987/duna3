import { useState, useEffect } from 'react';

interface TonWallet {
  address: string;
  balance: string;
  connected: boolean;
}

interface TonTransaction {
  amount: string;
  to: string;
}

export const useTonConnect = () => {
  const [wallet, setWallet] = useState<TonWallet | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if Tonkeeper is available
  const isTonkeeperAvailable = () => {
    return typeof window !== 'undefined' && (
      // Check for Tonkeeper browser extension
      !!(window as any).tonkeeper ||
      // Check for Telegram WebApp environment
      !!(window as any).Telegram?.WebApp ||
      // Mobile detection
      /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    );
  };

  // Generate Tonkeeper deep link
  const generateTonkeeperLink = (transaction: TonTransaction) => {
    const { amount, to } = transaction;
    const amountInNanotons = parseFloat(amount) * 1000000000;

    // Tonkeeper deep link format
    const params = new URLSearchParams({
      amount: amountInNanotons.toString()
    });

    return `https://app.tonkeeper.com/transfer/${to}?${params.toString()}`;
  };

  // Generate universal TON link
  const generateUniversalTonLink = (transaction: TonTransaction) => {
    const { amount, to } = transaction;
    const amountInNanotons = parseFloat(amount) * 1000000000;

    const params = new URLSearchParams({
      amount: amountInNanotons.toString()
    });

    return `ton://transfer/${to}?${params.toString()}`;
  };

  // Send transaction
  const sendTransaction = async (transaction: TonTransaction) => {
    setIsConnecting(true);
    setError(null);

    try {
      const tonkeeperLink = generateTonkeeperLink(transaction);
      const universalLink = generateUniversalTonLink(transaction);

      // Try different methods to open the wallet
      if ((window as any).Telegram?.WebApp?.openLink) {
        // Use Telegram's openLink for better integration in Telegram
        (window as any).Telegram.WebApp.openLink(tonkeeperLink);
      } else if ((window as any).tonkeeper) {
        // If Tonkeeper extension is available
        await (window as any).tonkeeper.send(transaction);
      } else {
        // Fallback to opening the app directly
        const userAgent = navigator.userAgent;
        
        if (/iPhone|iPad|iPod/i.test(userAgent)) {
          // iOS - try universal link first, then app store
          window.location.href = universalLink;
          setTimeout(() => {
            window.location.href = 'https://apps.apple.com/app/tonkeeper/id1587742107';
          }, 2000);
        } else if (/Android/i.test(userAgent)) {
          // Android - try universal link first, then play store
          window.location.href = universalLink;
          setTimeout(() => {
            window.location.href = 'https://play.google.com/store/apps/details?id=com.ton_keeper';
          }, 2000);
        } else {
          // Desktop - open Tonkeeper web
          window.open(tonkeeperLink, '_blank');
        }
      }

      return {
        success: true,
        transactionId: `txn_${Date.now()}`,
        link: tonkeeperLink
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send transaction';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsConnecting(false);
    }
  };

  // Check wallet connection status
  const checkConnection = async () => {
    try {
      // This would typically check if wallet is connected
      // For now, we'll simulate based on localStorage
      const savedWallet = localStorage.getItem('tonWallet');
      if (savedWallet) {
        setWallet(JSON.parse(savedWallet));
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  };

  // Connect wallet
  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      // In a real implementation, this would open wallet connection flow
      // For now, we'll simulate the connection
      const mockWallet: TonWallet = {
        address: 'UQ...' + Math.random().toString(36).substring(7),
        balance: '0',
        connected: true
      };
      
      setWallet(mockWallet);
      localStorage.setItem('tonWallet', JSON.stringify(mockWallet));
      
      return mockWallet;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect wallet');
      return null;
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect wallet
  const disconnectWallet = () => {
    setWallet(null);
    localStorage.removeItem('tonWallet');
  };

  useEffect(() => {
    checkConnection();
  }, []);

  return {
    wallet,
    isConnecting,
    error,
    isTonkeeperAvailable: isTonkeeperAvailable(),
    sendTransaction,
    connectWallet,
    disconnectWallet
  };
};
