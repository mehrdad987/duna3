import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations, StakingPool, StakingRecord } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TonPayment } from "./TonPayment";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wallet,
  Coins,
  TrendingUp,
  Gift,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  ArrowRight,
  Lock,
  Unlock,
  BarChart3,
} from "lucide-react";
import { format } from "date-fns";

interface WalletData {
  balance: number;
  tonBalance: number;
  transactions: Transaction[];
  tonPayments: TonPaymentRecord[];
}

interface TonPaymentRecord {
  id: string;
  ton_amount: number;
  duna_amount: number;
  status: string;
  date: string;
}

interface Transaction {
  id: string;
  type: "earn" | "spend" | "bonus";
  amount: number;
  description: string;
  date: string;
}

export function WalletTab() {
  const { user } = useTelegram();
  const [walletData, setWalletData] = useState<WalletData>({
    balance: 50, // Initial 50 Duna coins
    tonBalance: 0, // Initial TON balance
    transactions: [],
    tonPayments: [],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [exchangeAmount, setExchangeAmount] = useState(0.1);
  const [isExchanging, setIsExchanging] = useState(false);
  // Local enqueue fallback for failed server writes (helps when Supabase is unreachable)
  const enqueuePendingAction = (payload: any) => {
    try {
      const key = "pending_wallet_actions";
      const raw = localStorage.getItem(key);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(payload);
      localStorage.setItem(key, JSON.stringify(arr));
      console.debug("Enqueued pending wallet action", payload);
    } catch (e) {
      console.warn("Failed to enqueue wallet action:", e);
    }
  };
  
  // Staking state
  const [stakingPools, setStakingPools] = useState<StakingPool[]>([]);
  const [userStakingRecords, setUserStakingRecords] = useState<StakingRecord[]>([]);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingAmount, setStakingAmount] = useState<{ TON: number; DUNA: number }>({ TON: 0, DUNA: 0 });

  useEffect(() => {
    if (user) {
      loadWalletData();
      loadStakingData();
    }
  }, [user]);

  // Refresh wallet data every 3 seconds to show updates
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadWalletData();
        loadStakingData();
      }, 10000); // Refresh every 10 seconds for better sync

      return () => clearInterval(interval);
    }
  }, [user]);

  const loadStakingData = async () => {
    if (!user) return;
    
    try {
      // Debug: show supabase config at staking load time
      try {
        // @ts-ignore - runtime debug export from supabase module
        const { SUPABASE_DEBUG } = await import("@/lib/supabase");
        console.debug("LOAD_STAKING_DATA SUPABASE_DEBUG:", SUPABASE_DEBUG);
      } catch (dbgErr) {
        console.debug("LOAD_STAKING_DATA: could not load SUPABASE_DEBUG", dbgErr);
      }
      const pools = await dbOperations.getStakingPools();
      setStakingPools(pools);
      
      // Get user data to get user_id for staking records
      const userData = await dbOperations.getUser(user.id);
      if (userData?.id) {
        const stakingRecords = await dbOperations.getUserStakingRecords(userData.id);
        setUserStakingRecords(stakingRecords);
      }
    } catch (error) {
      console.error("Error loading staking data:", error);
    }
  };

  const loadWalletData = async (showRefreshState = false) => {
    if (!user) return;

    if (showRefreshState) setIsRefreshing(true);

    try {
      // Load user data including balances
      const userData = await dbOperations.getUser(user.id);
      const tonPayments = await dbOperations.getTonPayments(user.id);
      const coinTransactions = await dbOperations.getCoinTransactions(user.id);

      // Convert database transactions to UI format
      const transactions: Transaction[] =
        coinTransactions?.map((tx) => ({
          id: tx.id?.toString() || "",
          type: tx.type,
          amount: tx.amount,
          description: tx.description,
          date: tx.created_at || new Date().toISOString(),
        })) || [];

      // Convert TON payments to UI format
      const tonPaymentRecords: TonPaymentRecord[] =
        tonPayments?.map((payment) => ({
          id: payment.id?.toString() || "",
          ton_amount: payment.ton_amount,
          duna_amount: payment.duna_amount,
          status: payment.status,
          date: payment.created_at || new Date().toISOString(),
        })) || [];

      setWalletData({
        balance: userData?.duna_coins || 50,
        tonBalance: userData?.ton_balance || 0,
        transactions,
        tonPayments: tonPaymentRecords,
      });
    } catch (error) {
      console.error("Error loading wallet data:", error);
      // Fallback to mock data
      const mockTransactions: Transaction[] = [
        {
          id: "1",
          type: "bonus",
          amount: 50,
          description: "Welcome bonus - New user reward",
          date: new Date().toISOString(),
        },
      ];

      setWalletData({
        balance: 50,
        tonBalance: 0,
        transactions: mockTransactions,
        tonPayments: [],
      });
    } finally {
      if (showRefreshState) setIsRefreshing(false);
    }
  };

  const handleManualRefresh = () => {
    loadWalletData(true);
    loadStakingData();
  };

  const handleTonToDunaExchange = async () => {
    if (!user || exchangeAmount > walletData.tonBalance || exchangeAmount < 0.1)
      return;

    setIsExchanging(true);
    try {
      // Ensure user exists in database first
      let userData = await dbOperations.getUser(user.id);
      if (!userData) {
        userData = await dbOperations.upsertUser({
          telegram_id: user.id,
          username: user.username || "",
          first_name: user.first_name || "Unknown",
          last_name: user.last_name || "",
          login_date: new Date().toISOString(),
          duna_coins: 50,
          ton_balance: 0,
          welcome_bonus_claimed: true,
        });
      }

      if (!userData) {
        throw new Error("Failed to create or retrieve user");
      }

      // Calculate Duna coins (0.1 TON = 10 Duna)
      const dunaAmount = Math.floor(exchangeAmount * 1000); // 0.1 TON = 10 Duna

      // Update TON balance (subtract)
      const success = await dbOperations.updateTonBalance(
        user.id,
        -exchangeAmount,
      );
      if (!success) {
        throw new Error("Failed to update TON balance");
      }

      // Add Duna coins
      await dbOperations.addCoinsByUserId(
        userData.id,
        user.id,
        dunaAmount,
        "earn",
        `TON to Duna exchange: ${exchangeAmount} TON → ${dunaAmount} Duna`,
      );

      // Create exchange record
      try {
        await dbOperations.createTonPayment({
          user_id: userData.id,
          ton_amount: -exchangeAmount, // Negative for conversion
          duna_amount: dunaAmount,
          transaction_id: `exchange_${Date.now()}`,
          status: "completed",
        });
      } catch (dbErr) {
        console.error("Failed to create exchange record (will enqueue):", dbErr);
        enqueuePendingAction({
          action: "createTonPayment",
          payload: {
            user_id: userData.id,
            ton_amount: -exchangeAmount,
            duna_amount: dunaAmount,
            transaction_id: `exchange_${Date.now()}`,
            status: "completed",
          },
          timestamp: Date.now(),
        });
        alert("⚠️ Exchange recorded locally and will be retried when the app reconnects.");
      }

      // Update local state
      setWalletData((prev) => ({
        ...prev,
        balance: prev.balance + dunaAmount,
        tonBalance: prev.tonBalance - exchangeAmount,
        transactions: prev.transactions,
        tonPayments: prev.tonPayments,
      }));

      // Refresh data from database
      setTimeout(() => {
        loadWalletData();
      }, 1000);
    } catch (error) {
      console.error("Error during TON to Duna exchange:", error);
    } finally {
      setIsExchanging(false);
    }
  };

  const handleStake = async (coinType: "TON" | "DUNA") => {
    if (!user) return;
    
    const amount = stakingAmount[coinType];
    if (amount <= 0) {
      alert(`Please enter a valid amount to stake`);
      return;
    }

    setIsStaking(true);
    try {
      // Ensure user exists in database first
      let userData = await dbOperations.getUser(user.id);
      if (!userData) {
        userData = await dbOperations.upsertUser({
          telegram_id: user.id,
          username: user.username || "",
          first_name: user.first_name || "Unknown",
          last_name: user.last_name || "",
          login_date: new Date().toISOString(),
          duna_coins: 50,
          ton_balance: 0,
          welcome_bonus_claimed: true,
        });
      }

      if (!userData || !userData.id) {
        throw new Error("Failed to create or retrieve user");
      }

      // Check if user has enough coins
      if (coinType === "TON") {
        if ((userData.ton_balance || 0) < amount) {
          throw new Error(
            `Insufficient TON balance. You have ${userData.ton_balance || 0} TON but want to stake ${amount} TON.`,
          );
        }
        // Deduct TON balance
        await dbOperations.updateTonBalance(user.id, -amount);
      } else {
        if ((userData.duna_coins || 0) < amount) {
          throw new Error(
            `Insufficient Duna coins. You have ${userData.duna_coins || 0} but want to stake ${amount}.`,
          );
        }
        // Deduct Duna coins
        await dbOperations.addCoinsByUserId(
          userData.id,
          user.id,
          -amount,
          "spend",
          "Staking Duna coins",
        );
      }

      // Create staking record (now creates a coin transaction)
      try {
        await dbOperations.stakeCoins(userData.id, coinType, amount);
      } catch (stakeErr) {
        console.error("Failed to stake coins (will enqueue):", stakeErr);
        enqueuePendingAction({
          action: "stakeCoins",
          payload: { user_id: userData.id, coinType, amount },
          timestamp: Date.now(),
        });
        alert("⚠️ Staking request saved locally and will be retried when the app reconnects.");
      }

      // Reload data
      loadWalletData();
      loadStakingData();
      setStakingAmount(prev => ({ ...prev, [coinType]: 0 }));
      alert(`Successfully staked ${amount} ${coinType}! Lock period: 3 months, APY: 38%`);
    } catch (error) {
      console.error("Error staking coins:", error);
      let errorMessage = "Unknown error occurred";
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message);
      }
      
      alert(`Staking failed: ${errorMessage}`);
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnlock = async (stakingRecord: StakingRecord) => {
    if (!user) return;
    
    try {
      await dbOperations.unlockStakedCoins(stakingRecord.id!);
      
      // Reload staking data
      loadStakingData();
      alert(`Successfully unlocked staked ${stakingRecord.amount} ${stakingRecord.coin_type}!`);
    } catch (error) {
      console.error("Error unlocking staked coins:", error);
      alert(`Unlock failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const handleClaimWelcomeBonus = async () => {
    setIsLoading(true);
    try {
      // Simulate claiming welcome bonus
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        type: "bonus",
        amount: 50,
        description: "Welcome bonus claimed",
        date: new Date().toISOString(),
      };

      setWalletData((prev) => ({
        ...prev,
        balance: prev.balance + 50,
        transactions: [newTransaction, ...prev.transactions],
      }));
    } catch (error) {
      console.error("Error claiming bonus:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "earn":
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case "spend":
        return <ArrowDownLeft className="w-4 h-4 text-red-500" />;
      case "bonus":
        return <Gift className="w-4 h-4 text-purple-500" />;
      case "stake":
        return <Lock className="w-4 h-4 text-blue-500" />;
      default:
        return <Coins className="w-4 h-4" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "earn":
        return "text-green-600";
      case "spend":
        return "text-red-600";
      case "bonus":
        return "text-purple-600";
      case "stake":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Wallet className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Wallet Access</h3>
          <p className="text-muted-foreground">
            Please authenticate with Telegram to access your wallet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue="wallet" className="w-full">
        <TabsList className="grid w-full grid-cols-5 sm:grid-cols-5 gap-1">
          <TabsTrigger className="text-[11px] sm:text-sm" value="wallet">Duna Wallet</TabsTrigger>
          <TabsTrigger className="text-[11px] sm:text-sm" value="exchange">Exchange</TabsTrigger>
          <TabsTrigger className="text-[11px] sm:text-sm" value="staking">Staking</TabsTrigger>
          <TabsTrigger className="text-[11px] sm:text-sm" value="ton">TON Tx</TabsTrigger>
          <TabsTrigger className="text-[11px] sm:text-sm" value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="wallet">
          <Card className="overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Wallet className="w-6 h-6" />
                  Duna Wallet
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="text-purple-600 hover:text-purple-700"
                >
                  <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-2xl">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Coins className="w-6 h-6" /></div>
                  <div className="text-left">
                    <p className="text-sm opacity-90">Duna Coins</p>
                    <p className="text-2xl font-bold">{walletData.balance.toLocaleString()}</p>
                    
                  </div>
                </div>

                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white p-4 rounded-xl">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"><Coins className="w-6 h-6" /></div>
                  <div className="text-left">
                    <p className="text-sm opacity-90">TON Balance</p>
                    <p className="text-2xl font-bold">{walletData.tonBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-300">Duna Earned</span>
                  </div>
                  <p className="text-lg font-bold text-green-600">{walletData.balance}</p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">TON Deposits</span>
                  </div>
                  <p className="text-lg font-bold text-blue-600">{walletData.tonPayments.length}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Gift className="w-4 h-4 text-purple-600" />
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">Bonuses</span>
                  </div>
                  <p className="text-lg font-bold text-purple-600">{walletData.transactions.filter((t) => t.type === "bonus").length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-4">
              <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">About Duna Coins</h4>
              <div className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                <p>• Duna Coins (DC) are the official currency of Duna Lottery Center</p>
                <p>• Earn coins through activities, bonuses, and winning games</p>
                <p>• Use coins for special features and exclusive opportunities</p>
                <p>• Every new user gets 50 Duna Coins as a welcome bonus!</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exchange">
          <Card className="overflow-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                <ArrowUpRight className="w-6 h-6" />
                TON to Duna Exchange
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Exchange your TON balance for Duna coins at a rate of 0.1 TON = 1000 Duna</p>

                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mb-4">
                  <div className="flex items-center justify-center gap-3">
                    <div className="text-center">
                      <p className="text-lg font-bold text-blue-600">{exchangeAmount.toFixed(1)} TON</p>
                      <p className="text-xs text-blue-600/70">Available: {walletData.tonBalance.toFixed(2)}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-blue-500" />
                    <div className="text-center">
                      <p className="text-lg font-bold text-purple-600">{Math.floor(exchangeAmount * 1000)} Duna</p>
                      <p className="text-xs text-purple-600/70">You'll receive</p>
                    </div>
                  </div>
                </div>

                <div className="mb-4">
                  <label className="text-sm font-medium mb-2 block">TON Amount to Exchange</label>
                  <div className="flex items-center gap-2 mb-2">
                    {[0.1, 1, 10, 100].map((amount) => (
                      <Button
                        key={amount}
                        variant={exchangeAmount === amount ? "default" : "outline"}
                        size="sm"
                        onClick={() => setExchangeAmount(amount)}
                        disabled={amount > walletData.tonBalance}
                        className="text-xs"
                      >
                        {amount} TON
                      </Button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="0.1"
                    max={walletData.tonBalance}
                    step="0.1"
                    value={exchangeAmount}
                    onChange={(e) => setExchangeAmount(Number(e.target.value))}
                    className="w-full p-2 border rounded text-center"
                    placeholder="Custom amount"
                  />
                </div>

                <Button
                  onClick={handleTonToDunaExchange}
                  disabled={isExchanging || exchangeAmount > walletData.tonBalance || exchangeAmount < 0.1}
                  className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                >
                  {isExchanging ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Exchanging...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="w-4 h-4 mr-2" />
                      Exchange {exchangeAmount.toFixed(1)} TON → {Math.floor(exchangeAmount * 1000)} Duna
                    </>
                  )}
                </Button>

                {walletData.tonBalance < 0.1 && (
                  <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800 mt-4">
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      💰 You need at least 0.1 TON to exchange for Duna coins.
                      <br />
                      Use the TON Payment section to add more TON.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staking">
          <div className="space-y-4">
            {/* Balance Summary */}
            <Card className="overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <Wallet className="w-6 h-6" />
                  Your Balances
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {walletData.tonBalance.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-700 dark:text-blue-300">TON Available</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {walletData.balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-purple-700 dark:text-purple-300">Duna Available</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* TON Staking Pool */}
            <Card className="overflow-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                  <Lock className="w-6 h-6" />
                  TON Staking Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-xs text-muted-foreground mb-2">Pools computed from <code>coin_transactions</code> (type="stake"). Check DevTools console for computed totals.</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pool Capacity:</span>
                      <span className="text-sm font-bold">
                        {stakingPools.find(p => p.coin_type === "TON")?.max_capacity?.toLocaleString() || "10,000"} TON
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Staked:</span>
                      <span className="text-sm font-bold">
                        {stakingPools.find(p => p.coin_type === "TON")?.total_staked?.toLocaleString() || 0} TON
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">APY:</span>
                      <span className="text-sm font-bold text-green-600">
                        {stakingPools.find(p => p.coin_type === "TON")?.apy || 38}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Lock Period:</span>
                      <span className="text-sm font-bold">
                        {stakingPools.find(p => p.coin_type === "TON")?.lock_period_months || 3} months
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-cyan-500 h-4 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, ((stakingPools.find(p => p.coin_type === "TON")?.total_staked || 0) / (stakingPools.find(p => p.coin_type === "TON")?.max_capacity || 10000)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {((stakingPools.find(p => p.coin_type === "TON")?.total_staked || 0) / (stakingPools.find(p => p.coin_type === "TON")?.max_capacity || 10000) * 100).toFixed(1)}% filled
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount to Stake (TON)</label>
                      <input
                        type="number"
                        min="0.1"
                        max={walletData.tonBalance}
                        step="0.1"
                        value={stakingAmount.TON}
                        onChange={(e) => setStakingAmount(prev => ({ ...prev, TON: Number(e.target.value) }))}
                        className="w-full p-2 border rounded text-center"
                        placeholder="Enter TON amount"
                      />
                    </div>
                    
                    <Button
                      onClick={() => handleStake("TON")}
                      disabled={isStaking || stakingAmount.TON <= 0 || stakingAmount.TON > walletData.tonBalance}
                      className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
                    >
                      {isStaking ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Staking...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Stake {stakingAmount.TON || 0} TON
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Duna Staking Pool */}
            <Card className="overflow-hidden bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/30">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-purple-600 dark:text-purple-400">
                  <Lock className="w-6 h-6" />
                  Duna Staking Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Pool Capacity:</span>
                      <span className="text-sm font-bold">
                        {stakingPools.find(p => p.coin_type === "DUNA")?.max_capacity?.toLocaleString() || "1,000,000"} Duna
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total Staked:</span>
                      <span className="text-sm font-bold">
                        {stakingPools.find(p => p.coin_type === "DUNA")?.total_staked?.toLocaleString() || 0} Duna
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">APY:</span>
                      <span className="text-sm font-bold text-green-600">
                        {stakingPools.find(p => p.coin_type === "DUNA")?.apy || 38}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Lock Period:</span>
                      <span className="text-sm font-bold">
                        {stakingPools.find(p => p.coin_type === "DUNA")?.lock_period_months || 3} months
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                      <div 
                        className="bg-gradient-to-r from-purple-500 to-pink-500 h-4 rounded-full transition-all duration-300"
                        style={{ 
                          width: `${Math.min(100, ((stakingPools.find(p => p.coin_type === "DUNA")?.total_staked || 0) / (stakingPools.find(p => p.coin_type === "DUNA")?.max_capacity || 1000000)) * 100)}%` 
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-center text-muted-foreground">
                      {((stakingPools.find(p => p.coin_type === "DUNA")?.total_staked || 0) / (stakingPools.find(p => p.coin_type === "DUNA")?.max_capacity || 1000000) * 100).toFixed(1)}% filled
                    </p>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Amount to Stake (Duna)</label>
                      <input
                        type="number"
                        min="1"
                        max={walletData.balance}
                        step="1"
                        value={stakingAmount.DUNA}
                        onChange={(e) => setStakingAmount(prev => ({ ...prev, DUNA: Number(e.target.value) }))}
                        className="w-full p-2 border rounded text-center"
                        placeholder="Enter Duna amount"
                      />
                    </div>
                    
                    <Button
                      onClick={() => handleStake("DUNA")}
                      disabled={isStaking || stakingAmount.DUNA <= 0 || stakingAmount.DUNA > walletData.balance}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      {isStaking ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                          Staking...
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 mr-2" />
                          Stake {stakingAmount.DUNA || 0} Duna
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* User's Staking Records */}
            {userStakingRecords.length > 0 && (
              <Card className="overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <BarChart3 className="w-6 h-6" />
                    Your Staking Positions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {userStakingRecords.map((record) => (
                      <div
                        key={record.id}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg border border-green-200 dark:border-green-800"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            record.coin_type === "TON" 
                              ? "bg-blue-500 text-white" 
                              : "bg-purple-500 text-white"
                          }`}>
                            <Coins className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold">{record.amount} {record.coin_type}</p>
                            <p className="text-xs text-muted-foreground">
                              Staked on {format(new Date(record.staked_at), "MMM dd, yyyy")}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Unlocks on {format(new Date(record.unlock_date), "MMM dd, yyyy")}
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-semibold text-green-600">
                            +{((record.amount * 0.38) / 4).toFixed(2)} {record.coin_type}
                          </div>
                          <p className="text-xs text-muted-foreground">Quarterly profit</p>
                          {new Date(record.unlock_date) <= new Date() && !record.is_unlocked && (
                            <Button
                              onClick={() => handleUnlock(record)}
                              size="sm"
                              className="mt-2 bg-green-600 hover:bg-green-700"
                            >
                              <Unlock className="w-4 h-4 mr-1" />
                              Unlock
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Staking Info */}
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="p-4">
                <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">About Staking</h4>
                <div className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
                  <p>• Stake your TON or Duna coins to earn 38% APY</p>
                  <p>• Lock period: 3 months (quarterly profit distribution)</p>
                  <p>• TON pool capacity: 10,000 TON</p>
                  <p>• Duna pool capacity: 1,000,000 Duna</p>
                  <p>• Early withdrawal not allowed - plan your staking carefully!</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ton">
          <TonPayment />
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              {walletData.transactions.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">No Transactions Yet</h3>
                  <p className="text-muted-foreground mb-4">Start earning Duna coins by participating in lottery and other activities!</p>
                  <Button onClick={handleClaimWelcomeBonus} disabled={isLoading}>
                    <Gift className="w-4 h-4 mr-2" />
                    {isLoading ? "Claiming..." : "Claim Welcome Bonus"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {walletData.transactions.map((transaction, index) => (
                    <div key={transaction.id}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTransactionIcon(transaction.type)}
                          <div>
                            <p className="font-medium text-sm">{transaction.description}</p>
                            <p className="text-xs text-muted-foreground">{format(new Date(transaction.date), "MMM dd, yyyy 'at' HH:mm")}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                            {transaction.type === "spend" ? "-" : "+"}
                            {transaction.amount} DC
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">{transaction.type}</p>
                        </div>
                      </div>
                      {index < walletData.transactions.length - 1 && <Separator className="mt-3" />}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
