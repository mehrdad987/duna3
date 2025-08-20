import { useState, useEffect } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { useTonConnect } from "@/hooks/useTonConnect";
import { dbOperations } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Coins, Wallet, ArrowUpRight, ArrowDownLeft, Check } from "lucide-react";

// Read Vite env safely at runtime
const TON_WALLET_ADDRESS =
  (import.meta as any).env?.VITE_TON_WALLET_ADDRESS || "";

// Debug visibility to help runtime diagnosis
try {
  console.debug("TonPayment - TON_WALLET_ADDRESS:", TON_WALLET_ADDRESS);
} catch (e) {
  /* ignore in environments without console */
}

// Local fallback queue for payments that fail to be recorded server-side
const enqueuePendingPayment = (payload: any) => {
  try {
    const key = "pending_ton_payments";
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    arr.push(payload);
    localStorage.setItem(key, JSON.stringify(arr));
    console.debug("Enqueued pending payment", payload);
  } catch (e) {
    console.warn("Failed to enqueue pending payment:", e);
  }
};

export function TonPayment() {
  const { user } = useTelegram();
  const { sendTransaction, isConnecting, isTonkeeperAvailable, error } =
    useTonConnect();
  const [selectedAmount, setSelectedAmount] = useState(10);
  const [lastPayment, setLastPayment] = useState<any>(null);

  // Withdrawal states
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState(1);
  const [userAddress, setUserAddress] = useState("");
  const [savedAddresses, setSavedAddresses] = useState<string[]>([]);
  const [tonBalance, setTonBalance] = useState<number>(0);
  const [pendingWithdrawTotal, setPendingWithdrawTotal] = useState<number>(0);
  const MIN_WITHDRAW = 0.1;
  const availableTon = Math.max(0, tonBalance - pendingWithdrawTotal);

  // Predefined amount buttons
  const quickAmounts = [1, 5, 10, 50, 100];

  // Load user's saved addresses
  const loadUserAddresses = async () => {
    if (!user) return;

    try {
      const addresses = localStorage.getItem(`userAddresses_${user.id}`);
      if (addresses) {
        setSavedAddresses(JSON.parse(addresses));
      }
    } catch (error) {
      console.error("Error loading user addresses:", error);
    }
  };

  // Save user address
  const saveUserAddress = (address: string) => {
    if (!user || !address) return;

    const currentAddresses = [...savedAddresses];
    if (!currentAddresses.includes(address)) {
      currentAddresses.push(address);
      setSavedAddresses(currentAddresses);
      localStorage.setItem(
        `userAddresses_${user.id}`,
        JSON.stringify(currentAddresses),
      );
    }
  };

  // Handle withdrawal REQUEST (not actual sending - admin will send manually)
  const handleWithdrawRequest = async () => {
    if (!user || !userAddress || withdrawAmount <= 0) return;

    try {
      // Save the address for future use
      saveUserAddress(userAddress);

      // Ensure user exists in database first
      let userData = await dbOperations.getUser(user.id);
      if (!userData) {
        // Create user if doesn't exist
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

      // Calculate available TON = on-chain TON balance tracked - pending withdrawals
      let currentTonBalance = Number(userData.ton_balance || 0);
      try {
        const payments = await dbOperations.getTonPayments(user.id);
        const pending = payments
          .filter(
            (p: any) => p.status === "pending" && Number(p.ton_amount) < 0,
          )
          .reduce(
            (sum: number, p: any) => sum + Math.abs(Number(p.ton_amount)),
            0,
          );
        currentTonBalance = Math.max(0, currentTonBalance - pending);
      } catch (_) {
        // ignore, fall back to raw ton_balance
      }

      if (withdrawAmount > currentTonBalance) {
        alert(
          `Insufficient TON balance. You have ${currentTonBalance.toFixed(2)} TON available after pending withdrawals.`,
        );
        return;
      }

      // Record withdrawal REQUEST in database
      try {
        await dbOperations.createTonPayment({
          user_id: userData.id, // Use the database user ID
          ton_amount: -withdrawAmount, // Negative for withdrawal request
          duna_amount: 0,
          transaction_id: `withdraw_request_${Date.now()}`,
          withdrawal_address: userAddress,
          status: "pending", // Admin will manually change to 'completed' after sending
        });

        console.log(
          `Withdrawal REQUEST recorded: ${withdrawAmount} TON to ${userAddress}`,
        );
      } catch (dbErr) {
        console.error("Failed to record withdrawal request (will enqueue):", dbErr);
        enqueuePendingPayment({
          user_id: userData.id,
          ton_amount: -withdrawAmount,
          duna_amount: 0,
          transaction_id: `withdraw_request_${Date.now()}`,
          withdrawal_address: userAddress,
          status: "pending",
          type: "withdrawal_request",
          timestamp: Date.now(),
        });
        alert("⚠️ Withdrawal request saved locally and will be retried when the app reconnects.");
      }

      const withdrawalData = {
        amount: withdrawAmount,
        address: userAddress,
        timestamp: Date.now(),
        user_id: user.id,
        transactionId: `withdraw_request_${Date.now()}`,
        type: "withdrawal_request",
      };

      setLastPayment(withdrawalData);
      setShowWithdraw(false);
      setUserAddress("");
      setWithdrawAmount(1);
      // Optimistically bump pending total to reflect the new request in UI
      setPendingWithdrawTotal((prev) => prev + withdrawAmount);
    } catch (error) {
      console.error("Error recording withdrawal request:", error);
    }
  };

  useEffect(() => {
    loadUserAddresses();
    const loadTonBalance = async () => {
      if (!user) {
        setTonBalance(0);
        setPendingWithdrawTotal(0);
        return;
      }
      try {
        const [userData, payments] = await Promise.all([
          dbOperations.getUser(user.id),
          dbOperations.getTonPayments(user.id),
        ]);
        const rawTon = Number(userData?.ton_balance || 0);
        const pending = (payments || [])
          .filter(
            (p: any) => p.status === "pending" && Number(p.ton_amount) < 0,
          )
          .reduce(
            (sum: number, p: any) => sum + Math.abs(Number(p.ton_amount)),
            0,
          );
        setTonBalance(rawTon);
        setPendingWithdrawTotal(pending);
      } catch (e) {
        setTonBalance(0);
        setPendingWithdrawTotal(0);
      }
    };
    loadTonBalance();
  }, [user]);

  useEffect(() => {
    if (withdrawAmount > availableTon) {
      setWithdrawAmount(
        Math.max(MIN_WITHDRAW, Number(availableTon.toFixed(1))),
      );
    }
  }, [availableTon]);

  const handleTonPayment = async (amount: number) => {
    if (!user) return;

    try {
      // Only initiate the transaction, don't add balance immediately
      const result = await sendTransaction({
        amount: amount.toString(),
        to: TON_WALLET_ADDRESS,
      });

      if (result.success) {
        const dunaAmount = getDunaCoins(amount);

        // Only record as PENDING - require manual admin verification
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

          // Record as PENDING status - admin must verify and approve
          try {
            await dbOperations.createTonPayment({
              user_id: userData.id,
              ton_amount: amount,
              duna_amount: dunaAmount,
              transaction_id: result.transactionId || `pending_${Date.now()}`,
              status: "pending", // CRITICAL: Mark as pending, not completed
            });

            console.log(
              `Payment request submitted: ${amount} TON → ${dunaAmount} Duna coins (PENDING VERIFICATION)`,
            );

            // Show warning that verification is required
            alert(
              `⚠️ Payment Submitted!\n\nYour payment request for ${amount} TON has been submitted.\n\n🔄 Status: PENDING VERIFICATION\n\n✅ Admin will verify the blockchain transaction and credit your coins within 24 hours.\n\n📧 You'll be notified once verified.`,
            );
          } catch (dbErrorInner) {
            console.error("Error recording payment request (will enqueue):", dbErrorInner);
            enqueuePendingPayment({
              user_id: userData.id,
              ton_amount: amount,
              duna_amount: dunaAmount,
              transaction_id: result.transactionId || `pending_${Date.now()}`,
              status: "pending",
              timestamp: Date.now(),
            });
            alert("⚠️ Payment recorded locally and will be retried when the app reconnects.");
          }
        } catch (dbError) {
          console.error("Error recording payment request:", dbError);
          alert(
            `❌ Failed to record payment request: ${dbError?.message || "Unknown error"}`,
          );
        }

        const paymentData = {
          amount,
          dunaAmount,
          timestamp: Date.now(),
          user_id: user.id,
          username: user.username,
          transactionId: result.transactionId || `pending_${Date.now()}`,
          status: "pending",
        };

        setLastPayment(paymentData);
      } else {
        alert("❌ Transaction failed or was cancelled.");
      }
    } catch (error) {
      console.error("Error initiating TON payment:", error);
      alert(`❌ Payment error: ${error?.message || "Transaction failed"}`);
    }
  };

  // Note: Buying TON only gives you TON balance, not Duna coins
  // Duna coins are earned through games and activities
  const getDunaCoins = (tonAmount: number) => 0; // No Duna coins from TON purchase

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <Wallet className="w-6 h-6" />
          Recieve Duna Coins with TON
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
 {/*       
        // Exchange Rate Display 
        <div className="text-center">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mb-4">
            <Coins className="w-10 h-10 text-white" />
          </div>
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-center gap-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {selectedAmount} TON
                </p>
                <p className="text-sm text-blue-600/70">
                  ≈ ${(selectedAmount * 3.5).toFixed(1)}
                </p>
              </div>
              <ArrowRight className="w-5 h-5 text-blue-500" />
              <div className="text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {selectedAmount} TON
                </p>
                <p className="text-sm text-blue-600/70">TON Coins Only</p>
              </div>
            </div>
          </div>
        </div>
*/}
        {/* Quick Amount Selection */}
        <div>
          <p className="text-sm font-medium mb-3">Quick Select:</p>
          <div className="grid grid-cols-5 gap-2">
            {quickAmounts.map((amount) => (
              <Button
                key={amount}
                variant={selectedAmount === amount ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAmount(amount)}
                className="text-xs"
              >
                {amount} TON
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Amount Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium">Custom Amount:</p>
            <Badge variant="secondary">{selectedAmount} TON</Badge>
          </div>
          <Slider
            value={[selectedAmount]}
            onValueChange={(value) => setSelectedAmount(value[0])}
            max={100}
            min={5}
            step={1}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>5 TON</span>
            <span>100 TON</span>
          </div>
        </div>

        {/* Payment & Withdrawal Buttons */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Payment Button */}
            <Button
              onClick={() => handleTonPayment(selectedAmount)}
              disabled={isConnecting || !user}
              size="lg"
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white"
            >
              {isConnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Opening...
                </>
              ) : (
                <>
                  <ArrowUpRight className="w-4 h-4 mr-2" />
                  ADD {selectedAmount} TON
                </>
              )}
            </Button>

            {/* Withdrawal Request Button */}
            <Button
              onClick={() => setShowWithdraw(!showWithdraw)}
              disabled={!user}
              size="lg"
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <ArrowDownLeft className="w-4 h-4 mr-2" />
              Withdraw
            </Button>
          </div>

          {/* Wallet Status */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <div
              className={`w-2 h-2 rounded-full ${isTonkeeperAvailable ? "bg-green-500" : "bg-orange-500"}`}
            />
            <span className="text-muted-foreground">
              {isTonkeeperAvailable
                ? "Tonkeeper compatible device"
                : "Install Tonkeeper for best experience"}
            </span>
          </div>

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* Withdrawal Request Form */}
        {showWithdraw && (
          <Card className="bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <ArrowDownLeft className="w-5 h-5" />
                Request TON Withdrawal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Withdrawal Amount */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Withdrawal Amount
                </label>
                <div className="text-xs text-muted-foreground mb-2 space-x-2">
                  <span>
                    Balance:{" "}
                    <span className="font-medium">
                      {tonBalance.toFixed(2)} TON
                    </span>
                  </span>
                  <span>
                    Pending:{" "}
                    <span className="font-medium">
                      {pendingWithdrawTotal.toFixed(2)} TON
                    </span>
                  </span>
                  <span>
                    Available:{" "}
                    <span className="font-medium">
                      {availableTon.toFixed(2)} TON
                    </span>
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-2 mb-3">
                  {[0.5, 1, 5, 10, 100].map((amount) => (
                    <Button
                      key={amount}
                      variant={
                        withdrawAmount === amount ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setWithdrawAmount(
                          Math.min(
                            amount,
                            Math.max(MIN_WITHDRAW, availableTon),
                          ),
                        )
                      }
                      className="text-xs"
                    >
                      {amount} TON
                    </Button>
                  ))}
                </div>
                <Slider
                  value={[withdrawAmount]}
                  onValueChange={(value) => setWithdrawAmount(value[0])}
                  max={Math.max(MIN_WITHDRAW, availableTon)}
                  min={MIN_WITHDRAW}
                  step={0.1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{MIN_WITHDRAW} TON</span>
                  <span className="font-medium">
                    {withdrawAmount.toFixed(1)} TON
                  </span>
                  <span>
                    {Math.max(MIN_WITHDRAW, availableTon).toFixed(1)} TON
                  </span>
                </div>
              </div>

              {/* TON Address Input */}
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Your TON Wallet Address
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="UQ... or EQ... (Your TON wallet address)"
                    value={userAddress}
                    onChange={(e) => setUserAddress(e.target.value)}
                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-mono bg-white dark:bg-gray-800"
                  />

                  {/* Saved Addresses */}
                  {savedAddresses.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Recent addresses:
                      </p>
                      <div className="space-y-1">
                        {savedAddresses.slice(-3).map((address, index) => (
                          <button
                            key={index}
                            onClick={() => setUserAddress(address)}
                            className="w-full text-left p-2 bg-gray-100 dark:bg-gray-700 rounded text-xs font-mono hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            {address.substring(0, 12)}...
                            {address.substring(address.length - 12)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Withdrawal Request */}
              <Button
                onClick={handleWithdrawRequest}
                disabled={
                  !userAddress ||
                  withdrawAmount < MIN_WITHDRAW ||
                  withdrawAmount > availableTon ||
                  availableTon < MIN_WITHDRAW
                }
                className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              >
                <ArrowDownLeft className="w-4 h-4 mr-2" />
                Request Withdrawal: {withdrawAmount.toFixed(1)} TON
              </Button>
              {(withdrawAmount > availableTon ||
                availableTon < MIN_WITHDRAW) && (
                <div className="mt-2 text-xs text-orange-600">
                  Insufficient TON balance for this withdrawal.
                </div>
              )}

              <div className="bg-orange-100 dark:bg-orange-900/20 p-3 rounded-lg">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  <strong>Manual Processing:</strong> Withdrawal requests are
                  processed manually by admin within 24 hours. Make sure your
                  TON address is correct as transactions cannot be reversed.
                  All withdrawals will be available starting 1Jan
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        

        {/* Payment Instructions */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <h4 className="font-semibold text-blue-700 dark:text-blue-300 mb-2">
            🔐 Secure Payment Process:
          </h4>
          <div className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                1
              </div>
              <p>Select your desired TON amount (minimum 1 TON)</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                2
              </div>
              <p>Click "ADD TON" to open your Tonkeeper wallet</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-blue-500/20 text-blue-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                3
              </div>
              <p>Complete the blockchain transaction in Tonkeeper or TON Wallet</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-yellow-500/20 text-yellow-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                4
              </div>
              <p>
                <strong>Admin verifies</strong> your transaction on the
                blockchain
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 bg-green-500/20 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold mt-0.5">
                5
              </div>
              <p>
                Duna coins are credited after verification
              </p>
            </div>
          </div>
          <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-700 dark:text-yellow-300">
            ⚠️ <strong>Important:</strong> All payments require manual
            verification to ensure security and prevent fraud. No coins are
            added automatically.
          </div>
        </div>

        {/* Last Payment Status */}
        {lastPayment && (
          <div
            className={`p-4 rounded-lg border ${
              lastPayment.type === "withdrawal_request"
                ? "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800"
                : lastPayment.status === "pending"
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              {lastPayment.type === "withdrawal_request" ? (
                <Check className="w-4 h-4 text-orange-600" />
              ) : lastPayment.status === "pending" ? (
                <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4 text-green-600" />
              )}
              <p
                className={`font-semibold ${
                  lastPayment.type === "withdrawal_request"
                    ? "text-orange-700 dark:text-orange-300"
                    : lastPayment.status === "pending"
                      ? "text-yellow-700 dark:text-yellow-300"
                      : "text-green-700 dark:text-green-300"
                }`}
              >
                {lastPayment.type === "withdrawal_request"
                  ? "Withdrawal Request Submitted"
                  : lastPayment.status === "pending"
                    ? "Payment Pending Verification"
                    : "Payment Completed"}
              </p>
            </div>
            <p
              className={`text-sm ${
                lastPayment.type === "withdrawal_request"
                  ? "text-orange-600 dark:text-orange-400"
                  : lastPayment.status === "pending"
                    ? "text-yellow-600 dark:text-yellow-400"
                    : "text-green-600 dark:text-green-400"
              }`}
            >
              {lastPayment.type === "withdrawal_request"
                ? `${lastPayment.amount} TON withdrawal request submitted. Admin will process manually within 24 hours.`
                : lastPayment.status === "pending"
                  ? `⏳ ${lastPayment.amount} TON payment submitted. Admin is verifying the blockchain transaction. You'll receive ${lastPayment.amount} TON once verified (within 24 hours).`
                  : `✅ ${lastPayment.amount} TON payment verified! ${lastPayment.amount} TON has been added to your wallet.`}
            </p>
            <p
              className={`text-xs mt-1 ${
                lastPayment.type === "withdrawal_request"
                  ? "text-orange-500"
                  : lastPayment.status === "pending"
                    ? "text-yellow-500"
                    : "text-green-500"
              }`}
            >
              Transaction ID: {lastPayment.transactionId}
            </p>
            {lastPayment.status === "pending" && (
              <div className="mt-2 p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded text-xs text-yellow-700 dark:text-yellow-300">
                🔒 <strong>Security Note:</strong> All payments require
                blockchain verification to prevent fraud.
              </div>
            )}
          </div>
        )}

        {/* Wallet Support */}
        <div className="text-center text-xs text-muted-foreground">
          <p>Supports: Tonkeeper • Telegram Wallet • TON Wallet</p>
          <p className="mt-1">Secure payments powered by TON blockchain</p>
        </div>
      </CardContent>
    </Card>
  );
}
