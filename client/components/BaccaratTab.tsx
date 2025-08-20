import { useState, useEffect } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Spade, 
  Diamond, 
  Club, 
  Coins, 
  Trophy, 
  Target,
  Zap,
  RefreshCw,
  Play,
  Pause
} from "lucide-react";

interface Card {
  suit: 'hearts' | 'spades' | 'diamonds' | 'clubs';
  value: number;
  face: string;
  isVisible: boolean;
}

interface GameState {
  playerHand: Card[];
  bankerHand: Card[];
  playerScore: number;
  bankerScore: number;
  gamePhase: 'betting' | 'dealing' | 'player-turn' | 'banker-turn' | 'complete';
  winner: 'player' | 'banker' | 'tie' | null;
  betAmount: number;
  betType: 'player' | 'banker' | 'tie';
  balance: number;
  deck: Card[];
  currentDealStep: number;
  isDealing: boolean;
  multiplier: number;
  gameHistory: Array<{
    winner: 'player' | 'banker' | 'tie';
    playerScore: number;
    bankerScore: number;
    betAmount: number;
    betType: 'player' | 'banker' | 'tie';
    profit: number;
    timestamp: string;
  }>;
}

export function BaccaratTab() {
  const { user } = useTelegram();
  const [gameState, setGameState] = useState<GameState>({
    playerHand: [],
    bankerHand: [],
    playerScore: 0,
    bankerScore: 0,
    gamePhase: 'betting',
    winner: null,
    betAmount: 0,
    betType: 'player',
    balance: 50,
    deck: [],
    currentDealStep: 0,
    isDealing: false,
    multiplier: 1,
    gameHistory: []
  });

  

  useEffect(() => {
    if (user) {
      loadUserBalance();
      loadGameHistory();
    }
  }, [user]);

  const loadUserBalance = async () => {
    if (!user) return;
    try {
      const userData = await dbOperations.getUser(user.id);
      if (userData) {
        setGameState(prev => ({ ...prev, balance: userData.duna_coins || 50 }));
      }
    } catch (error) {
      console.error("Error loading balance:", error);
    }
  };

  const loadGameHistory = async () => {
    if (!user) return;
    try {
      // Load game history from local storage for now
      const savedHistory = localStorage.getItem(`baccarat_history_${user.id}`);
      if (savedHistory) {
        const history = JSON.parse(savedHistory);
        setGameState(prev => ({ ...prev, gameHistory: history }));
      }
    } catch (error) {
      console.error("Error loading game history:", error);
    }
  };

  const saveGameHistory = async (newGame: any) => {
    if (!user) return;
    try {
      const updatedHistory = [newGame, ...gameState.gameHistory].slice(0, 20);
      localStorage.setItem(`baccarat_history_${user.id}`, JSON.stringify(updatedHistory));
      setGameState(prev => ({ ...prev, gameHistory: updatedHistory }));
    } catch (error) {
      console.error("Error saving game history:", error);
    }
  };


  const suits = [
    { type: 'hearts', icon: Heart, color: 'text-red-500' },
    { type: 'spades', icon: Spade, color: 'text-black' },
    { type: 'diamonds', icon: Diamond, color: 'text-red-500' },
    { type: 'clubs', icon: Club, color: 'text-black' }
  ];

  const createDeck = (): Card[] => {
    const deck: Card[] = [];
    suits.forEach(suit => {
      for (let i = 1; i <= 13; i++) {
        let face = i.toString();
        if (i === 1) face = 'A';
        else if (i === 11) face = 'J';
        else if (i === 12) face = 'Q';
        else if (i === 13) face = 'K';
        
        deck.push({
          suit: suit.type as any,
          value: i > 10 ? 10 : i,
          face,
          isVisible: false
        });
      }
    });
    return shuffleDeck(deck);
  };

  const shuffleDeck = (deck: Card[]): Card[] => {
    const shuffled = [...deck];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const calculateScore = (hand: Card[]): number => {
    const total = hand.reduce((sum, card) => sum + card.value, 0);
    return total % 10;
  };

  const dealCardsStepByStep = async () => {
    const totalBetAmount = gameState.betAmount * gameState.multiplier;
    if (totalBetAmount <= 0) return;
    if (totalBetAmount > gameState.balance) return;

    // Deduct bet upfront
    try {
      if (user) {
        await dbOperations.addCoins(
          user.id,
          -totalBetAmount,
          "spend",
          "Baccarat Bet"
        );
      }
      setGameState(prev => ({
        ...prev,
        balance: prev.balance - totalBetAmount,
        isDealing: true,
        gamePhase: 'dealing'
      }));
    } catch (e) {
      console.error("Error placing bet:", e);
      return;
    }
    
    const deck = createDeck();
    const playerHand: Card[] = [];
    const bankerHand: Card[] = [];
    
    // Step 1: Deal first player card
    await new Promise(resolve => setTimeout(resolve, 800));
    playerHand.push({ ...deck[0], isVisible: true });
    setGameState(prev => ({ ...prev, playerHand: [...playerHand], deck, currentDealStep: 1 }));
    
    // Step 2: Deal first banker card
    await new Promise(resolve => setTimeout(resolve, 800));
    bankerHand.push({ ...deck[1], isVisible: true });
    setGameState(prev => ({ ...prev, bankerHand: [...bankerHand], currentDealStep: 2 }));
    
    // Step 3: Deal second player card
    await new Promise(resolve => setTimeout(resolve, 800));
    playerHand.push({ ...deck[2], isVisible: true });
    setGameState(prev => ({ ...prev, playerHand: [...playerHand], currentDealStep: 3 }));
    
    // Step 4: Deal second banker card
    await new Promise(resolve => setTimeout(resolve, 800));
    bankerHand.push({ ...deck[3], isVisible: true });
    setGameState(prev => ({ ...prev, bankerHand: [...bankerHand], currentDealStep: 4 }));
    
    // Calculate scores
    const playerScore = calculateScore(playerHand);
    const bankerScore = calculateScore(bankerHand);
    
    // Check if third card is needed
    let needsThirdCard = false;
    
    if (playerScore >= 8 || bankerScore >= 8) {
      // Natural win - no third card
      needsThirdCard = false;
    } else if (playerScore <= 5) {
      // Player must draw third card
      needsThirdCard = true;
    } else if (bankerScore <= 5) {
      // Banker must draw third card
      needsThirdCard = true;
    }
    
    if (needsThirdCard) {
      // Step 5: Deal third player card if needed
      if (playerScore <= 5) {
        await new Promise(resolve => setTimeout(resolve, 800));
        playerHand.push({ ...deck[4], isVisible: true });
        setGameState(prev => ({ ...prev, playerHand: [...playerHand], currentDealStep: 5 }));
      }
      
      // Step 6: Deal third banker card if needed
      if (bankerScore <= 5) {
        await new Promise(resolve => setTimeout(resolve, 800));
        bankerHand.push({ ...deck[5], isVisible: true });
        setGameState(prev => ({ ...prev, bankerHand: [...bankerHand], currentDealStep: 6 }));
      }
    }
    
    // Final score calculation
    const finalPlayerScore = calculateScore(playerHand);
    const finalBankerScore = calculateScore(bankerHand);
    const winner = determineWinner(finalPlayerScore, finalBankerScore);
    
    setGameState(prev => ({
      ...prev,
      playerScore: finalPlayerScore,
      bankerScore: finalBankerScore,
      gamePhase: 'complete',
      winner,
      isDealing: false,
      currentDealStep: 0
    }));
    
    // Process winnings
    setTimeout(() => processWinnings(finalPlayerScore, finalBankerScore), 1000);
  };

  const determineWinner = (playerScore: number, bankerScore: number): 'player' | 'banker' | 'tie' => {
    if (playerScore === bankerScore) return 'tie';
    if (playerScore > bankerScore) return 'player';
    return 'banker';
  };

  const processWinnings = async (playerScore: number, bankerScore: number) => {
    const winner = determineWinner(playerScore, bankerScore);
    const totalBetAmount = gameState.betAmount * gameState.multiplier;

    // Compute winnings to credit (stake already deducted)
    let winnings = 0; // Amount to credit back to balance
    let netProfit = 0; // For history display
    
    if (winner === gameState.betType) {
      if (winner === 'tie') {
        winnings = totalBetAmount * 9; // 8:1 profit + stake
        netProfit = totalBetAmount * 8;
      } else if (winner === 'player') {
        winnings = totalBetAmount * 2; // 1:1 plus stake
        netProfit = totalBetAmount;
      } else if (winner === 'banker') {
        winnings = Math.floor(totalBetAmount * 1.95); // 5% commission
        netProfit = Math.floor(totalBetAmount * 0.95);
      }
    } else if (winner === 'tie' && gameState.betType !== 'tie') {
      // Push: return stake only
      winnings = totalBetAmount;
      netProfit = 0;
    } else {
      // Loss: no winnings; netProfit negative equals lost stake
      winnings = 0;
      netProfit = -totalBetAmount;
    }

    // Save game to history first
    const newGame = {
      winner,
      playerScore,
      bankerScore,
      betAmount: totalBetAmount,
      betType: gameState.betType,
      profit: netProfit,
      timestamp: new Date().toISOString()
    };
    await saveGameHistory(newGame);
    
    // Credit winnings if any
    if (winnings > 0 && user) {
      try {
        await dbOperations.addCoins(
          user.id,
          winnings,
          "earn",
          "Baccarat Win"
        );
      } catch (e) {
        console.error("Error crediting winnings:", e);
      }
    }
    
    setGameState(prev => ({
      ...prev,
      balance: prev.balance + winnings
    }));
  };

  const startNewGame = () => {
    setGameState(prev => ({
      ...prev,
      playerHand: [],
      bankerHand: [],
      playerScore: 0,
      bankerScore: 0,
      gamePhase: 'betting',
      winner: null,
      betAmount: 0,
      multiplier: 1,
      currentDealStep: 0,
      isDealing: false
    }));
  };

  const placeBet = (type: 'player' | 'banker' | 'tie') => {
    setGameState(prev => ({ ...prev, betType: type }));
  };

  const setBetAmount = (amount: number) => {
    if (amount >= 10 && (amount * gameState.multiplier) <= gameState.balance) {
      setGameState(prev => ({ ...prev, betAmount: amount }));
    }
  };

  const setMultiplier = (mult: number) => {
    if (mult >= 1 && mult <= 10) {
      // Check if the new multiplier would make the total bet exceed balance
      if (gameState.betAmount * mult <= gameState.balance) {
        setGameState(prev => ({ ...prev, multiplier: mult }));
      } else {
        // If multiplier would exceed balance, reduce bet amount to fit
        const maxBetAmount = Math.floor(gameState.balance / mult);
        if (maxBetAmount >= 10) {
          setGameState(prev => ({ 
            ...prev, 
            multiplier: mult, 
            betAmount: maxBetAmount 
          }));
        }
      }
    }
  };

  const getSuitIcon = (suit: string) => {
    const suitData = suits.find(s => s.type === suit);
    if (!suitData) return null;
    const IconComponent = suitData.icon;
    return <IconComponent className={`w-4 h-4 ${suitData.color}`} />;
  };

  const getCardDisplay = (card: Card, index: number) => {
    if (!card.isVisible) {
      return (
        <div className="w-16 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg border-2 border-blue-400 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-200">
          <div className="text-blue-200 text-xs font-bold">?</div>
        </div>
      );
    }

    const suitIcon = getSuitIcon(card.suit);
    const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
    
    return (
      <div 
        className={`w-16 h-20 bg-white rounded-lg border-2 border-gray-300 flex flex-col items-center justify-center text-black font-bold shadow-lg transform transition-all duration-500 hover:scale-105 hover:shadow-xl ${
          card.isVisible ? 'scale-100 opacity-100 rotate-0' : 'scale-95 opacity-0 rotate-12'
        }`}
        style={{
          animationDelay: `${index * 200}ms`,
          transform: card.isVisible ? 'rotateY(0deg)' : 'rotateY(90deg)'
        }}
      >
        {/* Card Corner Design */}
        <div className="absolute top-1 left-1 text-xs">
          <div className={`font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{card.face}</div>
          <div className="text-xs">{suitIcon}</div>
        </div>
        
        {/* Card Center */}
        <div className="flex flex-col items-center justify-center">
          <div className={`text-2xl font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>
            {card.face}
          </div>
          <div className="text-lg">{suitIcon}</div>
        </div>
        
        {/* Card Corner Design (Bottom Right) */}
        <div className="absolute bottom-1 right-1 text-xs transform rotate-180">
          <div className={`font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{card.face}</div>
          <div className="text-xs">{suitIcon}</div>
        </div>
      </div>
    );
  };

  const getBetButtonStyle = (type: 'player' | 'banker' | 'tie') => {
    const isSelected = gameState.betType === type;
    const baseStyle = "flex-1 py-3 px-4 rounded-lg font-semibold transition-all duration-200";
    
    if (type === 'player') {
      return `${baseStyle} ${isSelected ? 'bg-blue-600 text-white' : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'}`;
    } else if (type === 'banker') {
      return `${baseStyle} ${isSelected ? 'bg-red-600 text-white' : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'}`;
    } else {
      return `${baseStyle} ${isSelected ? 'bg-green-600 text-white' : 'bg-green-600/20 text-green-400 hover:bg-green-600/30'}`;
    }
  };

  return (
    <div 
      className="min-h-screen relative overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #0d4a3d 0%, #1a5f4e 25%, #0d4a3d 50%, #1a5f4e 75%, #0d4a3d 100%)',
        backgroundSize: '200px 200px'
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30"></div>
      
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">BACCARAT</h1>
            <p className="text-gray-200 text-lg">Elegant casino game with high rewards</p>
          </div>

          {/* Balance and Betting */}
          <Card className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-yellow-500/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span className="flex items-center gap-2">
                  <Coins className="w-6 h-6 text-yellow-400" />
                  Balance: {gameState.balance.toLocaleString()} DUNA
                </span>
                {gameState.gamePhase === 'complete' && (
                  <Button onClick={startNewGame} size="sm" className="bg-yellow-600 hover:bg-yellow-700">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    New Game
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Betting Options */}
              {gameState.gamePhase === 'betting' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => placeBet('player')}
                      className={getBetButtonStyle('player')}
                    >
                      
                      Player
                    </Button>
                    <Button
                      onClick={() => placeBet('banker')}
                      className={getBetButtonStyle('banker')}
                    >
                      
                      Banker
                    </Button>
                    <Button
                      onClick={() => placeBet('tie')}
                      className={getBetButtonStyle('tie')}
                    >
                      
                      Tie (8:1)
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-white flex items-center gap-2">
                      <Coins className="w-4 h-4 text-yellow-400" />
                      Bet Amount (DUNA)
                    </label>
                    <div className="grid grid-cols-4 gap-3">
                      {[10, 25, 50, 100].map(amount => (
                        <Button
                          key={amount}
                          onClick={() => setBetAmount(amount)}
                          variant={gameState.betAmount === amount ? "default" : "outline"}
                          className={`${
                            gameState.betAmount === amount 
                              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                              : 'bg-white/10 hover:bg-white/20 text-yellow-300 border-yellow-500/50'
                          } transition-all duration-200 font-bold`}
                        >
                          {amount}
                        </Button>
                      ))}
                    </div>
                    
                    {/* Multiplier Section */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-white flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Bet Multiplier
                      </label>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 5, 10].map(mult => (
                          <Button
                            key={mult}
                            onClick={() => setMultiplier(mult)}
                            variant={gameState.multiplier === mult ? "default" : "outline"}
                            className={`${
                              gameState.multiplier === mult 
                                ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                                : 'bg-white/10 hover:bg-white/20 text-purple-300 border-purple-500/50'
                            } transition-all duration-200 font-bold text-sm py-2`}
                          >
                            {mult}x
                          </Button>
                        ))}
                      </div>
                      <div className="text-center text-sm text-gray-300">
                        Total Bet: <span className="text-yellow-400 font-bold">
                          {gameState.betAmount * gameState.multiplier} DUNA
                        </span>
                      </div>
                      {(gameState.betAmount * gameState.multiplier) > gameState.balance && (
                        <div className="text-center text-sm text-red-400 bg-red-900/20 p-2 rounded-lg border border-red-500/50">
                          ⚠️ Total bet exceeds your balance!
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    onClick={dealCardsStepByStep}
                    disabled={gameState.betAmount <= 0 || (gameState.betAmount * gameState.multiplier) > gameState.balance || gameState.isDealing}
                    className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white py-4 text-lg font-bold rounded-lg shadow-lg"
                  >
                    {gameState.isDealing ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Dealing...
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Deal Cards
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Baccarat Table */}
          <div className="relative">
            {/* Table Background */}
            <div className="bg-gradient-to-br from-green-800 to-green-900 rounded-3xl p-8 border-4 border-yellow-500/50 shadow-2xl relative overflow-hidden">
              {/* Table Pattern Overlay */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                  backgroundSize: '50px 50px'
                }}></div>
              </div>
              
              {/* Table Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                {/* Player Side */}
                <div className="text-center">
                  <div className="bg-blue-600/20 rounded-2xl p-6 border-2 border-blue-400/50 backdrop-blur-sm">
                    <h3 className="text-2xl font-bold text-blue-300 mb-4 drop-shadow-lg">PLAYER</h3>
                    <div className="flex justify-center gap-3 mb-4">
                      {gameState.playerHand.map((card, index) => (
                        <div key={index} className="transform hover:scale-110 transition-transform duration-200">
                          {getCardDisplay(card, index)}
                        </div>
                      ))}
                    </div>
                    {gameState.playerScore > 0 && (
                      <div className="text-3xl font-bold text-blue-200 drop-shadow-lg">
                        Score: {gameState.playerScore}
                      </div>
                    )}
                  </div>
                </div>

                {/* Banker Side */}
                <div className="text-center">
                  <div className="bg-red-600/20 rounded-2xl p-6 border-2 border-red-400/50 backdrop-blur-sm">
                    <h3 className="text-2xl font-bold text-red-300 mb-4 drop-shadow-lg">BANKER</h3>
                    <div className="flex justify-center gap-3 mb-4">
                      {gameState.bankerHand.map((card, index) => (
                        <div key={index} className="transform hover:scale-110 transition-transform duration-200">
                          {getCardDisplay(card, index)}
                        </div>
                      ))}
                    </div>
                    {gameState.bankerScore > 0 && (
                      <div className="text-3xl font-bold text-red-200 drop-shadow-lg">
                        Score: {gameState.bankerScore}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Center of Table */}
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="bg-yellow-600/20 rounded-full p-4 border-2 border-yellow-400/50 backdrop-blur-sm">
                  <div className="text-yellow-300 text-sm font-bold drop-shadow-lg">BACCARAT</div>
                </div>
              </div>
              
              {/* Table Border Accent */}
              <div className="absolute inset-0 rounded-3xl border-4 border-yellow-400/30 pointer-events-none"></div>
            </div>
          </div>

          {/* Result */}
          {gameState.winner && (
            <Card className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border-yellow-500/50 backdrop-blur-sm animate-pulse">
              <CardContent className="text-center py-8">
                <div className="text-4xl font-bold text-white mb-4 drop-shadow-lg">
                  {gameState.winner === 'tie' ? 'TIE!' : `${gameState.winner === 'player' ? 'PLAYER' : 'BANKER'} WINS!`}
                </div>
                <div className="text-xl text-gray-200 mb-4">
                  {gameState.winner === gameState.betType ? (
                    <span className="text-green-400 font-bold flex items-center justify-center gap-2">
                      <Trophy className="w-6 h-6" />
                      You won! +{gameState.gameHistory[0]?.profit || 0} DUNA
                    </span>
                  ) : gameState.winner === 'tie' && gameState.betType !== 'tie' ? (
                    <span className="text-yellow-400 font-bold flex items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6" />
                      Push - Bet returned
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold flex items-center justify-center gap-2">
                      <Target className="w-6 h-6" />
                      You lost -{gameState.betAmount * gameState.multiplier} DUNA
                    </span>
                  )}
                </div>
                <div className="text-sm text-gray-300">
                  Final Score: Player {gameState.playerScore} - Banker {gameState.bankerScore}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Game History */}
          {gameState.gameHistory.length > 0 && (
            <Card className="bg-gradient-to-br from-slate-800/95 to-slate-900/95 border-gray-500/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-xl">Recent Games</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {gameState.gameHistory.slice(0, 15).map((game, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all duration-200 border border-white/10 hover:border-white/20">
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={game.winner === 'player' ? 'default' : game.winner === 'banker' ? 'destructive' : 'secondary'}
                          className="text-xs font-bold"
                        >
                          {game.winner.toUpperCase()}
                        </Badge>
                        <span className="text-sm text-gray-300 font-mono">
                          {game.playerScore}-{game.bankerScore}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(game.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm font-bold">
                        <span className={`${
                          game.profit > 0 ? 'text-green-400' : game.profit < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {game.profit > 0 ? '+' : ''}{game.profit} DUNA
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
