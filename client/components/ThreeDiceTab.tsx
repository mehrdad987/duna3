import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Zap, Coins, Star, Dice2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations, UserRecord } from "@/lib/supabase";

interface DiceResult {
  dice1: number;
  dice2: number;
  dice3: number;
  sum: number;
  isOdd: boolean;
  isOver10: boolean;
}

interface BetResult {
  betType: "odd" | "even" | "over10" | "under10";
  amount: number;
  won: boolean;
  multiplier: number;
  winnings: number;
}

export function ThreeDiceTab() {
  const { user, hapticFeedback } = useTelegram();
  const [userData, setUserData] = useState<UserRecord | null>(null);
  const [dice, setDice] = useState<DiceResult>({
    dice1: 1,
    dice2: 1,
    dice3: 1,
    sum: 3,
    isOdd: true,
    isOver10: false,
  });
  const [isRolling, setIsRolling] = useState(false);
  const [balance, setBalance] = useState(0);
  const [selectedBets, setSelectedBets] = useState<string[]>([]);
  const [betAmount, setBetAmount] = useState(10);
  const [gameHistory, setGameHistory] = useState<BetResult[]>([]);
  const [betCount, setBetCount] = useState(1);
  // Track active timers so we can clear them on unmount
  const timersRef = useRef<number[]>([]);
  

  // Load user data when component mounts
  useEffect(() => {
    if (user) {
      loadUserData();
    }
  }, [user]);

  // Auto-refresh balance every 3 seconds to sync with other tabs
  useEffect(() => {
    if (user) {
      const interval = setInterval(() => {
        loadUserData();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const userData = await dbOperations.getUser(user.id);
      if (userData) {
        setUserData(userData);
        setBalance(userData.duna_coins || 0);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const getDiceIcon = (value: number) => {
    // Legacy icon renderer replaced by 3D cube renderer
    return getDiceCube(value);
  };

  // Map face value to a 3D rotation so the desired face faces the viewer
  const faceTransform = (face: number) => {
    switch (face) {
      case 1:
        return "rotateX(0deg) rotateY(0deg)";
      case 2:
        return "rotateY(90deg) rotateX(0deg)";
      case 3:
        return "rotateY(180deg) rotateX(0deg)";
      case 4:
        return "rotateY(-90deg) rotateX(0deg)";
      case 5:
        return "rotateX(90deg) rotateY(0deg)";
      case 6:
        return "rotateX(-90deg) rotateY(0deg)";
      default:
        return "rotateX(0deg) rotateY(0deg)";
    }
  };

  // Inject CSS for dice cube once
  useEffect(() => {
    if (document.getElementById("three-dice-styles")) return;
    const style = document.createElement("style");
  style.id = "three-dice-styles";
  style.innerHTML = `
  .dice-scene { perspective: 600px; }
  .dice-cube { width:72px; height:72px; position:relative; transform-style: preserve-3d; transition: transform 700ms cubic-bezier(.22,.9,.24,1); margin:0 auto }
  /* Rounded, slightly shaded faces for a softer look */
  .dice-face { position:absolute; inset:0; display:block; border-radius:12px; overflow:hidden; box-shadow: inset 0 -6px 12px rgba(0,0,0,0.12), 0 6px 14px rgba(0,0,0,0.22); border:1px solid rgba(0,0,0,0.06); }
  .dice-face.bg-white { background: linear-gradient(180deg,#ffffff 0%,#f7f7f8 100%); }
  .dice-face.bg-gray { background:#f3f4f6; }
  /* Bigger, darker pips with a subtle highlight and drop shadow for visibility */
  .dice-face .pip { position:absolute; width:12px; height:12px; border-radius:999px; background: radial-gradient(circle at 30% 30%, #111827 0%, #000 60%); transform:translate(-50%,-50%); box-shadow: 0 2px 3px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08); }
  .dice-face .pip::after { content: ""; position:absolute; inset:0; border-radius:999px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05); }
  .dice-cube .face-1 { transform: translateZ(36px); }
  .dice-cube .face-2 { transform: rotateY(90deg) translateZ(36px); }
  .dice-cube .face-3 { transform: rotateY(180deg) translateZ(36px); }
  .dice-cube .face-4 { transform: rotateY(-90deg) translateZ(36px); }
  .dice-cube .face-5 { transform: rotateX(90deg) translateZ(36px); }
  .dice-cube .face-6 { transform: rotateX(-90deg) translateZ(36px); }
  .dice-rolling { animation: dice-roll 0.9s cubic-bezier(.2,.7,.2,1) infinite; }
  @keyframes dice-roll { 0% { transform: rotateX(0) rotateY(0); } 50% { transform: rotateX(720deg) rotateY(540deg); } 100% { transform: rotateX(0) rotateY(0); } }
  `;
    document.head.appendChild(style);
  }, []);

  const getDiceCube = (value: number) => {
    const transform = faceTransform(value);
    return (
      <div className="dice-scene">
        <div
          className={cn("dice-cube", isRolling ? "dice-rolling" : "")}
          style={{ transform }}
          aria-hidden={false}
        >
          <div className="dice-face face-1 bg-white">
            <span className="pip" style={{ left: "50%", top: "50%" }} />
          </div>
          <div className="dice-face face-2 bg-white">
            <span className="pip" style={{ left: "28%", top: "28%" }} />
            <span className="pip" style={{ left: "72%", top: "72%" }} />
          </div>
          <div className="dice-face face-3 bg-white">
            <span className="pip" style={{ left: "28%", top: "28%" }} />
            <span className="pip" style={{ left: "50%", top: "50%" }} />
            <span className="pip" style={{ left: "72%", top: "72%" }} />
          </div>
          <div className="dice-face face-4 bg-white">
            <span className="pip" style={{ left: "28%", top: "28%" }} />
            <span className="pip" style={{ left: "72%", top: "28%" }} />
            <span className="pip" style={{ left: "28%", top: "72%" }} />
            <span className="pip" style={{ left: "72%", top: "72%" }} />
          </div>
          <div className="dice-face face-5 bg-white">
            <span className="pip" style={{ left: "28%", top: "28%" }} />
            <span className="pip" style={{ left: "72%", top: "28%" }} />
            <span className="pip" style={{ left: "50%", top: "50%" }} />
            <span className="pip" style={{ left: "28%", top: "72%" }} />
            <span className="pip" style={{ left: "72%", top: "72%" }} />
          </div>
          <div className="dice-face face-6 bg-white">
            <span className="pip" style={{ left: "28%", top: "24%" }} />
            <span className="pip" style={{ left: "50%", top: "24%" }} />
            <span className="pip" style={{ left: "72%", top: "24%" }} />
            <span className="pip" style={{ left: "28%", top: "76%" }} />
            <span className="pip" style={{ left: "50%", top: "76%" }} />
            <span className="pip" style={{ left: "72%", top: "76%" }} />
          </div>
        </div>
      </div>
    );
  };

  const rollDice = (): DiceResult => {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    const dice3 = Math.floor(Math.random() * 6) + 1;
    const sum = dice1 + dice2 + dice3;

    return {
      dice1,
      dice2,
      dice3,
      sum,
      isOdd: sum % 2 === 1,
      isOver10: sum > 10,
    };
  };

  type DieKey = "dice1" | "dice2" | "dice3";

  // Animate a single die to a final face with a realistic slow-down effect
  const animateSingleDie = (
    dieKey: DieKey,
    finalFace: number,
    totalDurationMs: number,
    startDelayMs: number,
  ) => {
    const startAt = Date.now() + startDelayMs;
    let currentDelayMs = 50; // start fast

  const tick = () => {
      const now = Date.now();
      if (now < startAt) {
    const id = window.setTimeout(tick, 16);
    timersRef.current.push(id as unknown as number);
    return id as unknown as number;
      }

      const elapsed = now - startAt;
      if (elapsed >= totalDurationMs) {
        setDice((prev) => ({ ...prev, [dieKey]: finalFace } as DiceResult));
        return undefined;
      }

      // show a random face during roll
      const randomFace = Math.floor(Math.random() * 6) + 1;
      setDice((prev) => ({ ...prev, [dieKey]: randomFace } as DiceResult));

      // gradually slow down
      currentDelayMs = Math.min(240, Math.floor(currentDelayMs * 1.18));
  const id = window.setTimeout(tick, currentDelayMs);
  timersRef.current.push(id as unknown as number);
  return id as unknown as number;
    };

    tick();
  };

  const calculateWinnings = (
    betType: string,
    result: DiceResult,
  ): { won: boolean; multiplier: number } => {
    switch (betType) {
      case "odd":
        return { won: result.isOdd, multiplier: 2 };
      case "even":
        return { won: !result.isOdd, multiplier: 2 };
      case "over10":
        return { won: result.isOver10, multiplier: 2 };
      case "under10":
        return { won: !result.isOver10, multiplier: 2 };
      default:
        return { won: false, multiplier: 0 };
    }
  };

  const handleBetToggle = (betType: string) => {
    hapticFeedback("light");
    setSelectedBets((prev) => (prev[0] === betType ? [] : [betType]));
  };

  const handleRoll = async () => {
    if (selectedBets.length === 0) {
      hapticFeedback("error");
      return;
    }

    const totalBet = betAmount * betCount;
    if (totalBet > balance) {
      hapticFeedback("error");
      return;
    }

    if (!user || !userData) {
      hapticFeedback("error");
      return;
    }

    hapticFeedback("medium");
    setIsRolling(true);

    try {
      // Deduct bet amount from Supabase
      await dbOperations.addCoinsByUserId(
        userData.id,
        user.id,
        -totalBet,
        "spend",
        "3Dice Game Bet",
      );

      // Update local balance
      setBalance((prev) => prev - totalBet);

      // Precompute the final fair roll and animate towards it with a slow-down effect
      const finalResult = rollDice();

      // Slightly different durations for each die to feel natural
      const dur1 = 1100 + Math.floor(Math.random() * 400); // 1.1s - 1.5s
      const dur2 = 1250 + Math.floor(Math.random() * 400); // 1.25s - 1.65s
      const dur3 = 1400 + Math.floor(Math.random() * 450); // 1.4s - 1.85s

      // Start dice animations with small staggering
      animateSingleDie("dice1", finalResult.dice1, dur1, 0);
      animateSingleDie("dice2", finalResult.dice2, dur2, 150);
      animateSingleDie("dice3", finalResult.dice3, dur3, 300);

      // When all dice have finished, set the full final result and resolve bets
      const maxEnd = Math.max(dur1 + 0, dur2 + 150, dur3 + 300) + 120;
  const endTimeout = window.setTimeout(async () => {
        setDice(finalResult);

        // Calculate result for the selected bet with count
        const betType = selectedBets[0];
        const { won, multiplier } = calculateWinnings(betType, finalResult);
        const winnings = won ? betAmount * multiplier * betCount : 0;
        const results: BetResult[] = [
          {
            betType: betType as any,
            amount: betAmount * betCount,
            won,
            multiplier,
            winnings,
          },
        ];

        // Add winnings to balance and update Supabase
        const totalWinnings = results.reduce(
          (sum, result) => sum + result.winnings,
          0,
        );

        if (totalWinnings > 0) {
          await dbOperations.addCoinsByUserId(
            userData.id,
            user.id,
            totalWinnings,
            "earn",
            "3Dice Game Win",
          );
          setBalance((prev) => prev + totalWinnings);
        }

        setGameHistory((prev) => [...results, ...prev].slice(0, 20));

        setIsRolling(false);
        setSelectedBets([]);

        // Haptic feedback based on result
        if (totalWinnings > 0) {
          hapticFeedback("success");
        } else {
          hapticFeedback("error");
        }
      }, maxEnd);
      timersRef.current.push(endTimeout as unknown as number);
    } catch (error) {
      console.error("Error updating balance:", error);
      setIsRolling(false);
      hapticFeedback("error");
    }
  };

  // Clear timers on unmount to avoid stray callbacks
  useEffect(() => {
    return () => {
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];
    };
  }, []);

  const betOptions = [
    {
      id: "odd",
      label: "ODD",
      color: "from-red-500 to-red-600",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "even",
      label: "EVEN",
      color: "from-blue-500 to-blue-600",
      icon: <TrendingDown className="w-4 h-4" />,
    },
    {
      id: "over10",
      label: ">10",
      color: "from-green-500 to-green-600",
      icon: <TrendingUp className="w-4 h-4" />,
    },
    {
      id: "under10",
      label: "<10",
      color: "from-purple-500 to-purple-600",
      icon: <TrendingDown className="w-4 h-4" />,
    },
  ];

  const betAmountOptions = [10, 25, 50, 100];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="overflow-hidden bg-gradient-to-br from-red-900 via-red-800 to-red-900 border-2 border-yellow-600 shadow-2xl">
          <CardHeader
            className="text-center pb-3 border border-yellow-500/50"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(0,0,0,0.42), rgba(0,0,0,0.42)), url('https://i.postimg.cc/d1Hn0WHD/Capture01.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
                backgroundRepeat: "no-repeat",
                backgroundBlendMode: "overlay",
                filter: 'saturate(0.95)',
              }}
          >
            <CardTitle
              className="flex items-center justify-center gap-3 text-green-400"
              style={{ fontFamily: "Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial", fontWeight: 800, fontSize: '2.15rem', textShadow: '0 4px 18px rgba(0,0,0,0.6)' }}
            >
             
              <span className="leading-tight">3 Dice Duna</span>
            </CardTitle>
          <div className="flex items-center justify-center gap-4">
            <Badge
              variant="secondary"
              className="bg-yellow-400 text-black border border-yellow-600 shadow-lg"
            >
              <Coins className="w-3 h-3 mr-1" />
              Balance: {balance}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Dice + Betting (merged) */}
      <Card className="bg-gradient-to-br from-green-900 via-green-800 to-green-900 border-2 border-yellow-600 shadow-2xl">
        <CardContent
          className="p-6 space-y-4 bg-gradient-to-br from-green-800/80 via-green-700/80 to-green-800/80 rounded-xl border border-yellow-500/50 shadow-inner"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)",
          }}
        >
          <div className="flex justify-center items-center gap-3 sm:gap-4 mb-6 p-4 bg-gradient-to-b from-green-600/30 to-green-800/30 rounded-xl border border-yellow-500/20">
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-2xl border-2 border-white/80 transition-all duration-200",
                isRolling && "animate-bounce scale-110",
              )}
            >
              {getDiceIcon(dice.dice1)}
            </div>
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-2xl border-2 border-white/80 transition-all duration-200",
                isRolling && "animate-bounce delay-75 scale-110",
              )}
            >
              {getDiceIcon(dice.dice2)}
            </div>
            <div
              className={cn(
                "flex items-center justify-center w-16 h-16 sm:w-18 sm:h-18 rounded-xl bg-gradient-to-br from-green-600 to-green-700 shadow-2xl border-2 border-white/80 transition-all duration-200",
                isRolling && "animate-bounce delay-150 scale-110",
              )}
            >
              {getDiceIcon(dice.dice3)}
            </div>
          </div>

          {/* Sum Display */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 text-black px-6 py-3 rounded-full font-bold text-xl shadow-2xl border-2 border-yellow-600 transform hover:scale-105 transition-all">
              <Star className="w-6 h-6 text-yellow-700" />
               {dice.sum}
            </div>
          </div>

          {/* Betting Interface (merged) */}
          <div className="space-y-3 bg-gradient-to-br from-purple-800/40 via-purple-700/40 to-purple-800/40 border border-yellow-500/20 rounded-xl p-4">
            {/* Bet Amount Selection */
            }
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-200">
                  Bet Amount
                </label>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {betAmountOptions.map((amount) => (
                  <Button
                    key={amount}
                    variant={betAmount === amount ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBetAmount(amount)}
                    className={cn(
                      "transition-all duration-200 h-8 text-xs font-bold border-2 rounded-md shadow-md",
                      betAmount === amount
                        ? "bg-gradient-to-b from-yellow-400 to-yellow-500 text-black border-yellow-600 shadow-lg"
                        : "border-yellow-600/50 text-yellow-300 hover:border-yellow-500",
                    )}
                  >
                    {amount}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bet Count Selection */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-200">
                  Bet Count
                </label>
              </div>
              <div className="grid grid-cols-5 gap-1.5">
                {[1, 2, 5, 10, 100].map((count) => (
                  <Button
                    key={count}
                    variant={betCount === count ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBetCount(count)}
                    className={cn(
                      "transition-all duration-200 h-8 text-xs font-bold border-2 rounded-md shadow-md",
                      betCount === count
                        ? "bg-gradient-to-b from-yellow-400 to-yellow-500 text-black border-yellow-600 shadow-lg"
                        : "border-yellow-600/50 text-yellow-300 hover:border-yellow-500",
                    )}
                  >
                    {count}
                  </Button>
                ))}
              </div>
            </div>

            {/* Bet Options (single selection) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-200">
                  Select Bet (2x payout)
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {betOptions.map((option) => (
                  <Button
                    key={option.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleBetToggle(option.id)}
                    className={cn(
                      "h-10 text-white border-2 transition-all duration-300 rounded-lg shadow-lg",
                      selectedBets[0] === option.id
                        ? `bg-gradient-to-br ${option.color} border-white/80 shadow-2xl scale-[1.02]`
                        : "border-yellow-600/50 hover:border-yellow-500 bg-gradient-to-br from-purple-700/50 to-purple-800/50",
                    )}
                  >
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-base">{option.icon}</span>
                      <span className="font-bold text-xs">{option.label}</span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>

            {/* Total Bet Display */}
            {selectedBets.length > 0 && (
              <div className="bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-xl p-2 text-center border border-yellow-500/30 shadow-inner">
                <p className="text-white text-sm">
                  Total: {" "}
                  <span className="font-bold text-yellow-400 text-base">
                    {betAmount * betCount}
                  </span>{" "}
                  <span className="text-xs text-yellow-300">
                    ({selectedBets[0]?.toUpperCase()} x {betCount})
                  </span>
                </p>
              </div>
            )}

            {/* Roll Button */}
            <Button
              onClick={handleRoll}
              disabled={
                isRolling || selectedBets.length === 0 || betAmount * betCount > balance
              }
              className={cn(
                "w-full h-11 text-base font-bold transition-all duration-300 rounded-xl shadow-2xl border-2",
                "bg-gradient-to-r from-yellow-500 via-orange-500 to-yellow-500 hover:from-yellow-400 hover:via-orange-400 hover:to-yellow-400 text-black border-yellow-600",
                (isRolling || selectedBets.length === 0 || betAmount * betCount > balance) &&
                  "opacity-50",
              )}
            >
              {isRolling ? (
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 animate-pulse" />
                  Rolling...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5">🎲</span>
                  ROLL DICE
                  <span className="w-5 h-5">🎲</span>
                </div>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      

      {/* Game History */}
      {gameHistory.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-yellow-600 shadow-2xl">
          <CardHeader
            className="bg-gradient-to-br from-slate-800/80 via-slate-700/80 to-slate-800/80 border border-yellow-500/50 rounded-t-xl"
            style={{
              backgroundImage:
                "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)",
            }}
          >
            <CardTitle className="text-yellow-300 text-center font-bold drop-shadow-lg">
              Recent Games
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-slate-800/60 via-slate-700/60 to-slate-800/60 border border-yellow-500/30 rounded-b-xl">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {gameHistory.slice(0, 10).map((bet, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex justify-between items-center p-3 rounded-lg text-sm font-medium border-2 shadow-md",
                    bet.won
                      ? "bg-gradient-to-r from-green-600/20 to-green-500/20 text-green-300 border-green-400/50"
                      : "bg-gradient-to-r from-red-600/20 to-red-500/20 text-red-300 border-red-400/50",
                  )}
                >
                  <span className="font-bold">{bet.betType.toUpperCase()}</span>
                  <span className="font-bold">
                    {bet.won ? `+${bet.winnings}` : `-${bet.amount}`}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
