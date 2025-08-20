import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coins, Hand, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations, UserRecord } from "@/lib/supabase";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

interface PlayingCard {
  rank: Rank;
  suit: Suit;
}

type Phase = "betting" | "player" | "dealer" | "result";
type Outcome = "playerBlackjack" | "playerWin" | "dealerWin" | "push" | null;

const betAmountOptions = [10, 25, 50, 100];
const betCountOptions = [1, 2, 5, 10, 100]; // NEW

interface BJHistoryItem {
  timestamp: number;
  betAmount: number;
  payout: number;
  outcome: Exclude<Outcome, null>;
  playerTotal: number;
  dealerTotal: number;
  player: PlayingCard[];
  dealer: PlayingCard[];
}

function buildShuffledDeck(): PlayingCard[] {
  const suits: Suit[] = ["♠", "♥", "♦", "♣"];
  const ranks: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
  const deck: PlayingCard[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ rank, suit });
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function getCardValue(card: PlayingCard): number {
  if (card.rank === "A") return 11;
  if (["K", "Q", "J", "10"].includes(card.rank)) return 10;
  return parseInt(card.rank, 10);
}

function getHandValue(cards: PlayingCard[]): { total: number; isSoft: boolean } {
  let total = 0;
  let aceCount = 0;
  for (const c of cards) {
    total += getCardValue(c);
    if (c.rank === "A") aceCount += 1;
  }
  while (total > 21 && aceCount > 0) {
    total -= 10;
    aceCount -= 1;
  }
  return { total, isSoft: aceCount > 0 };
}

export function CardsTab() {
  const { user, hapticFeedback } = useTelegram();
  const [userData, setUserData] = useState<UserRecord | null>(null);
  const [balance, setBalance] = useState(0);

  const [deck, setDeck] = useState<PlayingCard[]>([]);
  const [playerHand, setPlayerHand] = useState<PlayingCard[]>([]);
  const [dealerHand, setDealerHand] = useState<PlayingCard[]>([]);
  const [phase, setPhase] = useState<Phase>("betting");
  const [outcome, setOutcome] = useState<Outcome>(null);

  const [betAmount, setBetAmount] = useState<number>(10);
  const [betCount, setBetCount] = useState<number>(1); // NEW

  const [isActing, setIsActing] = useState<boolean>(false);
  const [history, setHistory] = useState<BJHistoryItem[]>([]);

  const finalBet = betAmount * betCount; // NEW

  useEffect(() => {
    if (user) loadUserData();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => loadUserData(), 3000);
    return () => clearInterval(interval);
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    try {
      const data = await dbOperations.getUser(user.id);
      if (data) {
        setUserData(data);
        setBalance(data.duna_coins || 0);
      }
    } catch (e) {
      console.error("Error loading user data:", e);
    }
  };

  const playerTotal = useMemo(() => getHandValue(playerHand).total, [playerHand]);
  const dealerTotal = useMemo(() => getHandValue(dealerHand).total, [dealerHand]);

  const dealInitialHands = (freshDeck: PlayingCard[]) => {
    const next = [...freshDeck];
    const p1 = next.pop()!;
    const d1 = next.pop()!;
    const p2 = next.pop()!;
    const d2 = next.pop()!;
    setPlayerHand([p1, p2]);
    setDealerHand([d1, d2]);
    setDeck(next);

    // Blackjack check right after dealing — FIXED
    const pVal = getHandValue([p1, p2]).total;
    if (pVal === 21) {
      resolveRound("playerBlackjack");
    }
  };

  const handleDeal = async () => {
    if (!user || !userData) return;
    if (finalBet <= 0 || finalBet > balance) { // CHANGED
      hapticFeedback("error");
      return;
    }

    try {
      hapticFeedback("medium");
      setIsActing(true);

      await dbOperations.addCoinsByUserId(
        userData.id,
        user.id,
        -finalBet, // CHANGED
        "spend",
        "Blackjack Bet"
      );
      setBalance((b) => b - finalBet); // CHANGED

      const freshDeck = buildShuffledDeck();
      setOutcome(null);
      dealInitialHands(freshDeck);
      setPhase("player");
    } catch (e) {
      console.error("Deal error:", e);
      hapticFeedback("error");
    } finally {
      setIsActing(false);
    }
  };

  const drawCard = (): PlayingCard | null => {
    if (deck.length === 0) return null;
    const next = [...deck];
    const card = next.pop()!;
    setDeck(next);
    return card;
  };

  const handleHit = () => {
    if (phase !== "player") return;
    hapticFeedback("light");
    setPlayerHand((prev) => {
      const newHand = [...prev, drawCard()!];
      const { total } = getHandValue(newHand);
      if (total > 21) {
        resolveRound("dealerWin");
      }
      return newHand;
    });
  };

  const handleStand = async () => {
    if (phase !== "player") return;
    hapticFeedback("light");
    setPhase("dealer");

    let tempHand = [...dealerHand];
    let { total } = getHandValue(tempHand);
    while (total < 17) {
      const card = drawCard();
      if (!card) break;
      tempHand = [...tempHand, card];
      total = getHandValue(tempHand).total;
    }
    setDealerHand(tempHand);

    const p = getHandValue(playerHand).total;
    const d = total;
    if (d > 21 || p > d) await resolveRound("playerWin");
    else if (p < d) await resolveRound("dealerWin");
    else await resolveRound("push");
  };

  const resolveRound = async (finalOutcome: Exclude<Outcome, null>) => {
    setOutcome(finalOutcome);
    setPhase("result");

    if (!user || !userData) return;

    let winnings = 0;
    if (finalOutcome === "playerBlackjack") {
      winnings = Math.floor(finalBet * 2.5); // CHANGED
    } else if (finalOutcome === "playerWin") {
      winnings = finalBet * 2; // CHANGED
    } else if (finalOutcome === "push") {
      winnings = finalBet; // CHANGED
    }

    if (winnings > 0) {
      try {
        await dbOperations.addCoinsByUserId(
          userData.id,
          user.id,
          winnings,
          "earn",
          "Blackjack Win"
        );
        setBalance((b) => b + winnings);
        hapticFeedback("success");
      } catch (e) {
        console.error("Payout error:", e);
        hapticFeedback("error");
      }
    } else {
      hapticFeedback("error");
    }

    const item: BJHistoryItem = {
      timestamp: Date.now(),
      betAmount: finalBet, // CHANGED
      payout: winnings,
      outcome: finalOutcome,
      playerTotal: getHandValue(playerHand).total,
      dealerTotal: getHandValue(dealerHand).total,
      player: [...playerHand],
      dealer: [...dealerHand],
    };
    setHistory((prev) => [item, ...prev].slice(0, 20));
  };

  const resetForNextRound = () => {
    setDeck([]);
    setPlayerHand([]);
    setDealerHand([]);
    setOutcome(null);
    setPhase("betting");
  };

  const renderCard = (c: PlayingCard, isHidden = false) => {
    const isRed = c.suit === "♥" || c.suit === "♦";
    return (
      <div
        className={cn(
          "w-10 h-14 rounded-md border-2 shadow-lg flex items-center justify-center text-xs font-bold",
          isHidden
            ? "bg-slate-700/60 border-slate-400/40"
            : isRed
            ? "bg-gradient-to-br from-rose-500 to-rose-600 border-rose-300/60 text-white"
            : "bg-gradient-to-br from-indigo-600 to-indigo-700 border-indigo-300/60 text-white"
        )}
      >
        {isHidden ? "" : `${c.rank}${c.suit}`}
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <Card className="overflow-hidden bg-gradient-to-br from-indigo-900 via-purple-900 to-indigo-900 border-2 border-indigo-600 shadow-2xl">
        <CardHeader className="text-center pb-3">
          <CardTitle className="flex items-center justify-center gap-2 text-indigo-200">
            Blackjack 21
          </CardTitle>
          <div className="flex items-center justify-center gap-3">
            <Badge variant="secondary" className="bg-indigo-300 text-black border border-indigo-500">
              <Coins className="w-3 h-3 mr-1" /> Balance: {balance}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Game Card */}
      <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-indigo-600 shadow-2xl">
        <CardContent className="p-5 space-y-4 bg-gradient-to-br from-slate-800/80 via-slate-700/80 to-slate-800/80 rounded-xl border border-indigo-500/40">
          {/* Dealer */}
          <div className="space-y-2">
            <div className="text-indigo-200 text-sm font-semibold">Dealer</div>
            <div className="flex gap-2">
              {dealerHand.map((c, idx) =>
                phase === "player" && idx === 1
                  ? <div key={idx}>{renderCard(c, true)}</div>
                  : <div key={idx}>{renderCard(c)}</div>
              )}
              {dealerHand.length === 0 && <div className="text-indigo-300/70 text-xs">No cards</div>}
            </div>
            {phase !== "player" && dealerHand.length > 0 && (
              <div className="text-indigo-300 text-xs">Total: {dealerTotal}</div>
            )}
          </div>

          {/* Player */}
          <div className="space-y-2">
            <div className="text-indigo-200 text-sm font-semibold">You</div>
            <div className="flex gap-2">
              {playerHand.map((c, idx) => (
                <div key={idx}>{renderCard(c)}</div>
              ))}
              {playerHand.length === 0 && <div className="text-indigo-300/70 text-xs">No cards</div>}
            </div>
            {playerHand.length > 0 && (
              <div className="text-indigo-300 text-xs">Total: {playerTotal}</div>
            )}
          </div>

          {/* Controls */}
          {phase === "betting" && (
            <div className="space-y-3 bg-gradient-to-br from-indigo-800/40 via-purple-700/40 to-indigo-800/40 border border-indigo-500/30 rounded-xl p-4">
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1">Bet Amount</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {betAmountOptions.map((amount) => (
                    <Button
                      key={amount}
                      variant={betAmount === amount ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetAmount(amount)}
                      className={cn(
                        "transition-all duration-200 h-8 text-xs font-bold border-2 rounded-md",
                        betAmount === amount
                          ? "bg-gradient-to-b from-indigo-300 to-indigo-400 text-black border-indigo-500"
                          : "border-indigo-600/50 text-indigo-200 hover:border-indigo-400"
                      )}
                    >
                      {amount}
                    </Button>
                  ))}
                </div>
              </div>

              {/* NEW: Bet Count Selector */}
              <div>
                <label className="block text-xs font-medium text-indigo-200 mb-1">BetCount</label>
                <div className="grid grid-cols-5 gap-1.5">
                  {betCountOptions.map((count) => (
                    <Button
                      key={count}
                      variant={betCount === count ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBetCount(count)}
                      className={cn(
                        "transition-all duration-200 h-8 text-xs font-bold border-2 rounded-md",
                        betCount === count
                          ? "bg-gradient-to-b from-indigo-300 to-indigo-400 text-black border-indigo-500"
                          : "border-indigo-600/50 text-indigo-200 hover:border-indigo-400"
                      )}
                    >
                      ×{count}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleDeal}
                disabled={isActing || finalBet <= 0 || finalBet > balance}
                className={cn(
                  "w-full h-11 text-base font-bold transition-all duration-300 rounded-xl border-2",
                  "bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-400 hover:from-indigo-300 hover:via-purple-300 hover:to-indigo-300 text-black border-indigo-600",
                  (isActing || finalBet <= 0 || finalBet > balance) && "opacity-50"
                )}
              >
                <Play className="w-5 h-5 mr-2" /> Deal ({finalBet})
              </Button>
            </div>
          )}

          {phase === "player" && (
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleHit} className="h-11 font-bold border-2 bg-indigo-500 hover:bg-indigo-400 border-indigo-600 text-black">
                <Hand className="w-5 h-5 mr-2" /> Hit
              </Button>
              <Button onClick={handleStand} className="h-11 font-bold border-2 bg-purple-500 hover:bg-purple-400 border-purple-600 text-black">
                Stand
              </Button>
            </div>
          )}

          {phase === "result" && (
            <div className="space-y-3">
              <div className="text-center text-indigo-200 font-semibold">
                {outcome === "playerBlackjack" && "Blackjack! You win 2.5x"}
                {outcome === "playerWin" && "You win!"}
                {outcome === "dealerWin" && "Dealer wins"}
                {outcome === "push" && "Push — bet returned"}
              </div>
              <Button onClick={resetForNextRound} className="w-full h-11 font-bold border-2 bg-slate-200 hover:bg-white text-black border-indigo-600">
                <RotateCcw className="w-5 h-5 mr-2" /> New Round
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Games */}
      {history.length > 0 && (
        <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-indigo-600 shadow-2xl">
          <CardHeader className="bg-gradient-to-br from-slate-800/80 via-slate-700/80 to-slate-800/80 border border-indigo-500/40 rounded-t-xl">
            <CardTitle className="text-indigo-200 text-center font-bold">Recent Games</CardTitle>
          </CardHeader>
          <CardContent className="bg-gradient-to-br from-slate-800/60 via-slate-700/60 to-slate-800/60 border border-indigo-500/30 rounded-b-xl">
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {history.map((h, idx) => {
                const won = h.outcome === "playerWin" || h.outcome === "playerBlackjack";
                const pushed = h.outcome === "push";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "flex justify-between items-center p-3 rounded-lg text-sm font-medium border-2 shadow-md",
                      won
                        ? "bg-gradient-to-r from-green-600/20 to-green-500/20 text-green-300 border-green-400/50"
                        : pushed
                        ? "bg-gradient-to-r from-indigo-600/20 to-indigo-500/20 text-indigo-200 border-indigo-400/50"
                        : "bg-gradient-to-r from-red-600/20 to-red-500/20 text-red-300 border-red-400/50",
                    )}
                  >
                    <div className="flex flex-col">
                      <span className="font-bold">
                        {h.outcome === "playerBlackjack" && "Blackjack"}
                        {h.outcome === "playerWin" && "Win"}
                        {h.outcome === "dealerWin" && "Lose"}
                        {h.outcome === "push" && "Push"}
                      </span>
                      <span className="text-xs opacity-80">
                        Bet {h.betAmount} → {won ? `+${h.payout - h.betAmount}` : pushed ? `+0` : `-${h.betAmount}`}
                      </span>
                    </div>
                    <div className="text-right text-xs">
                      <div>Y: {h.playerTotal} vs D: {h.dealerTotal}</div>
                      <div className="opacity-90">
                        {h.player.map((c) => `${c.rank}${c.suit}`).join(" ")} | {h.dealer.map((c) => `${c.rank}${c.suit}`).join(" ")}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

