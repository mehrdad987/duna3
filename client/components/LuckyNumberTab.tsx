import { useState, useEffect } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Trophy, Target, RefreshCcw } from "lucide-react";

interface Bet {
  type: string;
  value: string | number;
  amount: number;
  position: { x: number; y: number };
}

interface GameResult {
  winningNumber: number;
  winningColor: "red" | "black" | "green";
  totalWin: number;
  bets: Bet[];
}

// Roulette number colors
const numberColors: { [key: number]: "red" | "black" | "green" } = {
  0: "green",
  1: "red",
  2: "black",
  3: "red",
  4: "black",
  5: "red",
  6: "black",
  7: "red",
  8: "black",
  9: "red",
  10: "black",
  11: "black",
  12: "red",
  13: "black",
  14: "red",
  15: "black",
  16: "red",
  17: "black",
  18: "red",
  19: "red",
  20: "black",
  21: "red",
  22: "black",
  23: "red",
  24: "black",
  25: "red",
  26: "black",
  27: "red",
  28: "black",
  29: "black",
  30: "red",
  31: "black",
  32: "red",
  33: "black",
  34: "red",
  35: "black",
  36: "red",
};

export function LuckyNumberTab() {
  const { user } = useTelegram();
  const [selectedChip, setSelectedChip] = useState(1);
  const [betCount, setBetCount] = useState(1);
  const [bets, setBets] = useState<Bet[]>([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [balance, setBalance] = useState(0);
  const [gameHistory, setGameHistory] = useState<number[]>([]);

  const chipValues = [5, 10, 25, 50, 100];

  // Load user balance
  useEffect(() => {
    if (user) {
      loadUserBalance();
    }
  }, [user]);

  const loadUserBalance = async () => {
    if (!user) return;
    try {
      const userData = await dbOperations.getUser(user.id);
      if (userData) {
        setBalance(userData.duna_coins || 0);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
      setBalance(50);
    }
  };

  // Auto-refresh balance every 3 seconds to sync with wallet tab
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadUserBalance();
      }, 3000); // Refresh every 3 seconds for better sync

      return () => clearInterval(interval);
    }
  }, [user]);

  const placeBet = (type: string, value: string | number) => {
    if (isSpinning) return;

    // Check if chip value exceeds balance
    const addAmount = selectedChip * betCount;
    if (addAmount > balance) return;

    // Check if total bets + new chip would exceed balance
    const currentTotalBets = getTotalBets();
    if (currentTotalBets + addAmount > balance) return;

    const existingBetIndex = bets.findIndex(
      (bet) => bet.type === type && bet.value === value,
    );

    if (existingBetIndex >= 0) {
      // Add to existing bet
      const newBets = [...bets];
      newBets[existingBetIndex].amount += addAmount;
      setBets(newBets);
    } else {
      // Create new bet
      const newBet: Bet = {
        type,
        value,
        amount: addAmount,
        position: { x: Math.random() * 10, y: Math.random() * 10 },
      };
      setBets([...bets, newBet]);
    }
  };

  const clearBets = () => {
    setBets([]);
    setGameResult(null);
  };

  const spin = async () => {
    if (bets.length === 0 || isSpinning) return;

    setIsSpinning(true);
    setGameResult(null);

    // Simulate spin delay
    setTimeout(async () => {
      const winningNumber = Math.floor(Math.random() * 37); // 0-36
      const winningColor = numberColors[winningNumber];

      let totalWin = 0;

      // Calculate winnings
      bets.forEach((bet) => {
        let win = 0;

        if (bet.type === "number" && bet.value === winningNumber) {
          win = bet.amount * 35; // 35:1 payout
        } else if (bet.type === "color" && bet.value === winningColor) {
          win = bet.amount * 2; // 2:1 payout
        } else if (
          bet.type === "odd" &&
          winningNumber % 2 === 1 &&
          winningNumber !== 0
        ) {
          win = bet.amount * 2;
        } else if (
          bet.type === "even" &&
          winningNumber % 2 === 0 &&
          winningNumber !== 0
        ) {
          win = bet.amount * 2;
        } else if (
          bet.type === "low" &&
          winningNumber >= 1 &&
          winningNumber <= 18
        ) {
          win = bet.amount * 2;
        } else if (
          bet.type === "high" &&
          winningNumber >= 19 &&
          winningNumber <= 36
        ) {
          win = bet.amount * 2;
        } else if (
          bet.type === "dozen1" &&
          winningNumber >= 1 &&
          winningNumber <= 12
        ) {
          win = bet.amount * 3;
        } else if (
          bet.type === "dozen2" &&
          winningNumber >= 13 &&
          winningNumber <= 24
        ) {
          win = bet.amount * 3;
        } else if (
          bet.type === "dozen3" &&
          winningNumber >= 25 &&
          winningNumber <= 36
        ) {
          win = bet.amount * 3;
        }

        totalWin += win;
      });

      const totalBet = bets.reduce((sum, bet) => sum + bet.amount, 0);
      const netWin = totalWin - totalBet;

      const result: GameResult = {
        winningNumber,
        winningColor,
        totalWin: netWin,
        bets: [...bets],
      };

      setGameResult(result);
      setGameHistory((prev) => [winningNumber, ...prev.slice(0, 9)]);

      // Update balance and reload from database to ensure sync
      const newBalance = balance + netWin;
      setBalance(newBalance);

      // Reload from database after a short delay to ensure sync
      setTimeout(() => {
        loadUserBalance();
      }, 1000);

      // Record in database
      if (user) {
        try {
          // Ensure user exists in database first
          let userData: any = await dbOperations.getUser(user.id);
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

          if (userData) {
            if (netWin > 0) {
              await dbOperations.addCoinsByUserId(
                userData.id,
                user.id,
                netWin,
                "earn",
                `Roulette win: ${winningNumber}`,
              );
            } else if (netWin < 0) {
              await dbOperations.addCoinsByUserId(
                userData.id,
                user.id,
                netWin,
                "spend",
                `Roulette bet: ${winningNumber}`,
              );
            }
          }
        } catch (error) {
          console.error("Error recording transaction:", {
            message: error?.message || "Unknown transaction error",
            name: error?.name,
            stack: error?.stack,
            // userData may be undefined if we failed before fetch
            // Use optional chaining safely due to scope
            userDataId: (error as any)?.userDataId || undefined,
            telegramId: user.id,
            netWin,
            details: JSON.stringify(error, null, 2),
          });
        }
      }

      // Clear bets for next round
      setBets([]);
      setIsSpinning(false);
    }, 3000);
  };

  const getBetAmount = (type: string, value: string | number) => {
    const bet = bets.find((bet) => bet.type === type && bet.value === value);
    return bet ? bet.amount : 0;
  };

  const getTotalBets = () => bets.reduce((sum, bet) => sum + bet.amount, 0);

  const isBettingDisabled = () => {
    return (
      isSpinning ||
      selectedChip * betCount > balance ||
      getTotalBets() + selectedChip * betCount > balance
    );
  };

  // Generate number grid (3 rows x 12 columns)
  const numberGrid = [];
  for (let row = 0; row < 3; row++) {
    const rowNumbers = [];
    for (let col = 0; col < 12; col++) {
      const number = col * 3 + (3 - row);
      rowNumbers.push(number);
    }
    numberGrid.push(rowNumbers);
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header */}
      <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardHeader className="text-center pb-3">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Target className="w-6 h-6" />
            Roulette Table
          </CardTitle>
          <div className="flex items-center justify-center gap-4">
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
            >
              <Coins className="w-3 h-3 mr-1" />
              Balance: {balance}
            </Badge>
            <Badge variant="outline">Total Bet: {getTotalBets()}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Chip Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-sm font-medium">Select Chip:</span>
            {chipValues.map((value) => (
              <button
                key={value}
                onClick={() => setSelectedChip(value)}
                disabled={value > balance}
                className={`w-12 h-12 sm:w-10 sm:h-10 rounded-full border-2 font-bold text-xs transition-all touch-manipulation ${
                  selectedChip === value
                    ? "border-yellow-500 bg-yellow-500 text-black shadow-lg"
                    : value > balance
                      ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "border-gray-400 bg-black hover:border-yellow-400"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-medium">Bet Count:</span>
            {[1, 2, 5, 10, 100].map((count) => (
              <button
                key={count}
                onClick={() => setBetCount(count)}
                className={`px-3 h-8 rounded-md border-2 text-xs font-bold transition-all ${
                  betCount === count
                    ? "border-yellow-500 bg-yellow-500 text-black shadow"
                    : "border-gray-400 bg-black hover:border-yellow-400"
                }`}
              >
                {count}
              </button>
            ))}
            <span className="ml-2 text-xs text-gray-600 dark:text-gray-300">Per click: {selectedChip * betCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Roulette Table */}
      <Card className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 p-2 border-2 border-yellow-600 shadow-2xl">
        <CardContent
          className="p-3 bg-gradient-to-br from-green-800 via-green-700 to-green-800 rounded-xl space-y-2 border border-yellow-500/50 shadow-inner"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)",
          }}
        >
          {/* Zero */}
          <div className="flex justify-center mb-3">
            <button
              onClick={() => placeBet("number", 0)}
              disabled={isBettingDisabled()}
              className={`relative w-10 h-12 bg-gradient-to-b from-green-500 to-green-600 text-white font-bold text-sm border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-400 hover:to-green-500 hover:scale-105"
              }`}
            >
              0
              {getBetAmount("number", 0) > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("number", 0)}
                </div>
              )}
            </button>
          </div>

          {/* Number Grid */}
          <div className="grid grid-cols-12 gap-0.5 p-2 bg-gradient-to-b from-green-600/30 to-green-800/30 rounded-lg border border-yellow-500/20">
            {numberGrid.map((row, rowIndex) =>
              row.map((number, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={() => placeBet("number", number)}
                  disabled={isBettingDisabled()}
                  className={`relative w-6 h-6 sm:w-5 sm:h-5 text-white font-bold text-xs border-2 border-white/90 rounded-sm shadow-lg transition-all transform ${
                    numberColors[number] === "red"
                      ? "bg-gradient-to-b from-red-500 to-red-700"
                      : "bg-gradient-to-b from-gray-800 to-black"
                  } ${isBettingDisabled() ? "opacity-50 cursor-not-allowed" : "hover:scale-110 hover:shadow-xl hover:z-20"}`}
                >
                  {number}
                  {getBetAmount("number", number) > 0 && (
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 text-black text-[10px] rounded-full flex items-center justify-center font-bold z-30 border border-yellow-600 shadow-md">
                      {getBetAmount("number", number)}
                    </div>
                  )}
                </button>
              )),
            )}
          </div>

          {/* Dozens */}
          <div className="grid grid-cols-3 gap-1 mt-3 p-2 bg-gradient-to-r from-green-700/30 via-green-600/30 to-green-700/30 rounded-lg border border-yellow-500/20">
            <button
              onClick={() => placeBet("dozen1", "1st 12")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              1st 12
              {getBetAmount("dozen1", "1st 12") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("dozen1", "1st 12")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("dozen2", "2nd 12")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              2nd 12
              {getBetAmount("dozen2", "2nd 12") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("dozen2", "2nd 12")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("dozen3", "3rd 12")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              3rd 12
              {getBetAmount("dozen3", "3rd 12") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("dozen3", "3rd 12")}
                </div>
              )}
            </button>
          </div>

          {/* Bottom Betting Area */}
          <div className="grid grid-cols-6 gap-1 mt-3 p-2 bg-gradient-to-r from-green-700/30 via-green-600/30 to-green-700/30 rounded-lg border border-yellow-500/20">
            <button
              onClick={() => placeBet("low", "1-18")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              1 to 18
              {getBetAmount("low", "1-18") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("low", "1-18")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("even", "EVEN")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              EVEN
              {getBetAmount("even", "EVEN") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("even", "EVEN")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("color", "red")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-red-600 to-red-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-red-500 hover:to-red-600 hover:scale-105"
              }`}
            >
              RED
              {getBetAmount("color", "red") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("color", "red")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("color", "black")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-gray-800 to-black text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-gray-700 hover:to-gray-900 hover:scale-105"
              }`}
            >
              BLACK
              {getBetAmount("color", "black") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("color", "black")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("odd", "ODD")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              ODD
              {getBetAmount("odd", "ODD") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("odd", "ODD")}
                </div>
              )}
            </button>
            <button
              onClick={() => placeBet("high", "19-36")}
              disabled={isBettingDisabled()}
              className={`relative h-8 bg-gradient-to-b from-green-600 to-green-700 text-white text-xs font-bold border-2 border-white/80 rounded-md shadow-lg transition-all transform ${
                isBettingDisabled()
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:bg-gradient-to-b hover:from-green-500 hover:to-green-600 hover:scale-105"
              }`}
            >
              19 to 36
              {getBetAmount("high", "19-36") > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 text-black text-xs rounded-full flex items-center justify-center font-bold border border-yellow-600 shadow-md">
                  {getBetAmount("high", "19-36")}
                </div>
              )}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <Button
          onClick={clearBets}
          disabled={bets.length === 0 || isSpinning}
          variant="outline"
          className="flex items-center gap-2"
        >
          <RefreshCcw className="w-4 h-4" />
          Clear Bets
        </Button>
        <Button
          onClick={spin}
          disabled={bets.length === 0 || isSpinning}
          className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
        >
          {isSpinning ? "Spinning..." : "Spin"}
        </Button>
      </div>

      {/* Game Result */}
      {gameResult && (
        <Card
          className={`${
            gameResult.totalWin > 0
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trophy
                className={`w-5 h-5 ${gameResult.totalWin > 0 ? "text-green-600" : "text-red-600"}`}
              />
              <h3
                className={`font-semibold ${gameResult.totalWin > 0 ? "text-green-700" : "text-red-700"}`}
              >
                Winning Number: {gameResult.winningNumber} (
                {gameResult.winningColor})
              </h3>
            </div>
            <p
              className={`text-sm ${gameResult.totalWin > 0 ? "text-green-600" : "text-red-600"}`}
            >
              {gameResult.totalWin > 0
                ? `You won ${gameResult.totalWin} coins!`
                : `You lost ${Math.abs(gameResult.totalWin)} coins.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Recent Numbers */}
      {gameHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Recent Numbers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 flex-wrap">
              {gameHistory.map((number, index) => (
                <div
                  key={index}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                    numberColors[number] === "red"
                      ? "bg-red-600"
                      : numberColors[number] === "black"
                        ? "bg-black"
                        : "bg-green-600"
                  }`}
                >
                  {number}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
