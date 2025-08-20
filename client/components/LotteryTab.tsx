import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations, LotteryTicket, Winner } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Ticket, Trophy, Users, Calendar, Sparkles, Gift } from "lucide-react";
import { format } from "date-fns";

export function LotteryTab() {
  const { user } = useTelegram();
  const [currentTicket, setCurrentTicket] = useState<LotteryTicket | null>(
    null,
  );
  const [extraTickets, setExtraTickets] = useState<LotteryTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuyingExtra, setIsBuyingExtra] = useState(false);
  const [userBalance, setUserBalance] = useState(0);

  const currentDate = new Date();
  const currentMonth = format(currentDate, "MMMM");
  const currentYear = currentDate.getFullYear();
  

  useEffect(() => {
    if (user) {
      loadUserTickets();
      loadUserBalance();
      loadPastWinners();
    }
  }, [user]);
  
  const [pastWinners, setPastWinners] = useState<Winner[]>([]);
  const [isLoadingWinners, setIsLoadingWinners] = useState(false);
  
  const loadUserBalance = async () => {
    if (!user) return;
    try {
      const userData = await dbOperations.getUser(user.id);
      if (userData) {
        setUserBalance(userData.duna_coins || 0);
      }
    } catch (error) {
      console.error("Error loading balance:", error);
      setUserBalance(50);
    }
  };

  const loadUserTickets = async () => {
    if (!user) return;
    try {
      // Get all tickets for this user for current month
      const allTickets = await dbOperations.getUserTicketsForMonth(
        user.id,
        currentMonth,
        currentYear,
      );
  if (allTickets && allTickets.length > 0) {
        // Set the first ticket as the main ticket
        setCurrentTicket(allTickets[0]);

        // Set any additional tickets as extra tickets
        if (allTickets.length > 1) {
          setExtraTickets(allTickets.slice(1));
        } else {
          setExtraTickets([]);
        }
      } else {
        // No tickets found
        setCurrentTicket(null);
        setExtraTickets([]);
      }
    } catch (error) {
      console.error("Error loading user tickets:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : JSON.stringify(error, null, 2),
      );
    }
  };

  // legacy aliases removed — use loadUserTickets directly

  // winner loader removed — past winners are loaded via loadPastWinners

  const loadPastWinners = async () => {
    setIsLoadingWinners(true);
    try {
      const winners = await dbOperations.getWinners(20); // Get last 20 winners
      setPastWinners(winners);
    } catch (error) {
      console.error("Error loading past winners:", error);
      setPastWinners([]);
    } finally {
      setIsLoadingWinners(false);
    }
  };

  const generateTicketCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGenerateTicket = async () => {
    if (!user || currentTicket) return;

    setIsLoading(true);
    try {
      const ticketCode = generateTicketCode();

      // First ensure user exists in database and get user_id
      let userData = await dbOperations.getUser(user.id);
      if (!userData) {
        userData = await dbOperations.upsertUser({
          telegram_id: user.id,
          username: user.username || "",
          first_name: user.first_name || "Unknown",
          last_name: user.last_name || "",
          login_date: new Date().toISOString(),
        });
      }

      if (!userData?.id) {
        throw new Error("Failed to get or create user");
      }

      const newTicket: Omit<LotteryTicket, "id" | "created_at"> = {
        user_id: userData.id,
        ticket_code: ticketCode,
        month: currentMonth,
        year: currentYear,
        is_winner: false,
      };

      const savedTicket = await dbOperations.createLotteryTicket(newTicket);
      // Reload all tickets to ensure proper display
      loadUserTickets();
    } catch (error) {
      console.error("Error generating ticket:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : JSON.stringify(error, null, 2),
      );
      // Fallback for development
      const mockTicket: LotteryTicket = {
        id: Math.floor(Math.random() * 1000),
        user_id: 1, // Mock user_id for fallback
        ticket_code: generateTicketCode(),
        month: currentMonth,
        year: currentYear,
        is_winner: false,
        created_at: new Date().toISOString(),
      };
  setCurrentTicket(mockTicket);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBuyExtraTicket = async () => {
    if (!user || userBalance < 50) return;

    setIsBuyingExtra(true);
    try {
      console.log("Starting extra ticket purchase for user:", user.id);

      // Ensure user exists in database first
      let userData = await dbOperations.getUser(user.id);
      if (!userData) {
        console.log("User not found, creating new user...");
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
        console.error("Failed to create or retrieve user. UserData:", userData);
        throw new Error("Failed to create or retrieve user - no valid user ID");
      }

      console.log("User data retrieved:", {
        id: userData.id,
        coins: userData.duna_coins,
      });

      // Check if user has enough coins
      if ((userData.duna_coins || 0) < 50) {
        throw new Error(
          `Insufficient Duna coins. You have ${userData.duna_coins || 0} but need 50.`,
        );
      }

      // Deduct 50 Duna coins
      console.log(`Deducting 50 coins from user ${userData.id}...`);
      const coinResult = await dbOperations.addCoinsByUserId(
        userData.id,
        user.id,
        -50,
        "spend",
        "Extra lottery ticket purchase",
      );

      if (!coinResult) {
        throw new Error("Failed to deduct coins for extra ticket purchase");
      }

      // Generate new ticket (normalized - only user_id)
      const ticketCode = generateTicketCode();
      const newTicket: Omit<LotteryTicket, "id" | "created_at"> = {
        user_id: userData.id,
        ticket_code: ticketCode,
        month: currentMonth,
        year: currentYear,
        is_winner: false,
      };

      const savedTicket = await dbOperations.createLotteryTicket(newTicket);

      // Update balance and reload all tickets to ensure proper display
      setUserBalance((prev) => prev - 50);
      loadUserTickets();
    } catch (error) {
      console.error("Error buying extra ticket:", {
        message: error?.message || "Unknown error",
        name: error?.name,
        stack: error?.stack,
        userId: user?.id,
        details: JSON.stringify(error, null, 2),
      });

      // Show user-friendly error message
      const errorMessage = error?.message || "Failed to purchase extra ticket";
      alert(`Error: ${errorMessage}`);
    } finally {
      setIsBuyingExtra(false);
    }
  };

  const formatTicketCode = (code: string) => {
    return code.replace(/(.{4})/g, "$1-").slice(0, -1);
  };

  const getOrdinalSuffix = (num: number) => {
    if (num >= 11 && num <= 13) return 'th';
    switch (num % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Gift className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">Lottery Access</h3>
          <p className="text-muted-foreground">
            Please authenticate with Telegram to participate in the lottery.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Current Month Lottery */}
      <Card className="overflow-hidden bg-gradient-to-br from-primary/5 to-purple-500/5 border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-primary">
            <Ticket className="w-5 h-5" />
            {currentMonth} {currentYear} Lottery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {!currentTicket ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/20 to-purple-500/20 rounded-full flex items-center justify-center">
                <Sparkles className="w-10 h-10 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  Get Your Lucky Ticket!
                </h3>
                <p className="text-muted-foreground mb-4">
                  Generate your monthly lottery ticket and get a chance to win
                  amazing prizes!
                </p>
                <Button
                  onClick={handleGenerateTicket}
                  disabled={isLoading}
                  size="lg"
                  className="bg-gradient-to-r from-primary to-purple-500 hover:from-primary/90 hover:to-purple-500/90"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Ticket className="w-4 h-4 mr-2" />
                      Generate Ticket
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-success/10 text-success-foreground px-3 py-1 rounded-full text-sm font-medium mb-4">
                  <Ticket className="w-4 h-4" />
                  Ticket Generated
                </div>
                <div className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 p-6 rounded-xl border-2 border-dashed border-primary/30">
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold">Your Ticket</h4>
                    <div className="text-3xl font-mono font-bold text-primary tracking-wider">
                      {formatTicketCode(currentTicket.ticket_code)}
                    </div>
                    <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(
                          new Date(currentTicket.created_at!),
                          "MMM dd, yyyy",
                        )}
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />@
                        {user.username || "Anonymous"}
                      </div>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Winner will be announced at the end of
                  the month.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Extra Tickets Section */}
      {currentTicket && (
        <Card className="overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Ticket className="w-5 h-5" />
              Extra Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Buy Additional Tickets</h3>
                <p className="text-sm text-muted-foreground">
                  Increase your chances! Each extra ticket costs 50 Duna coins.
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Your Balance</p>
                <p className="font-bold text-green-600">{userBalance} Duna</p>
              </div>
            </div>

            <Button
              onClick={handleBuyExtraTicket}
              disabled={isBuyingExtra || userBalance < 50}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isBuyingExtra ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Purchasing...
                </>
              ) : (
                <>
                  <Ticket className="w-4 h-4 mr-2" />
                  Buy Extra Ticket (50 Duna)
                </>
              )}
            </Button>

            {extraTickets.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium text-sm">
                  Your Extra Tickets ({extraTickets.length})
                </h4>
                <div className="grid grid-cols-1 gap-2">
                  {extraTickets.map((ticket, index) => (
                    <div
                      key={`extra-ticket-${ticket.id || index}-${ticket.ticket_code}`}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-3 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">
                            {index + 2}
                          </div>
                          <span className="font-mono text-sm font-semibold">
                            {formatTicketCode(ticket.ticket_code)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(ticket.created_at!), "MMM dd")}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {userBalance < 50 && (
              <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  💰 Not enough Duna coins! You need at least 50 Duna to buy an
                  extra ticket.
                  <br />
                  Visit the Wallet tab to get more Duna coins.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Winner Announcement */}
      
        
      <Card className="overflow-hidden bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
            <Trophy className="w-6 h-6" />
            Last Month Winners 🏆
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingWinners ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading past winners...</p>
            </div>
          ) : pastWinners.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Past Winners Yet</h3>
              <p className="text-muted-foreground">Be the first to win the lottery!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {pastWinners.slice(0, 10).map((winner, index) => (
              <div
                key={index}
                className={`group relative overflow-hidden rounded-md border border-gray-600/50 transition-all duration-300 hover:scale-105 hover:shadow-lg ${
                  index === 0 
                    ? 'bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-yellow-400/50 shadow-lg' 
                    : index === 1 
                    ? 'bg-gradient-to-br from-gray-300/20 to-gray-400/20 border-gray-300/50' 
                    : index === 2
                    ? 'bg-gradient-to-br from-amber-600/20 to-yellow-700/20 border-amber-600/50'
                    : 'bg-gradient-to-br from-blue-500/20 to-purple-500/20 border-blue-500/50'
                }`}
              >
                {/* Position Badge */}
                <div className={`absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold text-[10px] ${
                  index === 0 
                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 shadow-lg' 
                    : index === 1 
                    ? 'bg-gradient-to-r from-gray-400 to-gray-500' 
                    : index === 2
                    ? 'bg-gradient-to-r from-amber-600 to-yellow-700'
                    : 'bg-gradient-to-r from-blue-500 to-purple-500'
                }`}>
                  {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                </div>

                {/* Winner Content */}
                <div className="p-2 text-center">
                  {/* Prize Amount */}
                  <div className={`mb-1 text-xs font-bold ${
                    index === 0 
                      ? 'text-yellow-600 dark:text-yellow-400' 
                      : index === 1 
                      ? 'text-gray-600 dark:text-gray-400' 
                      : index === 2
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-blue-400'
                  }`}>
                    {winner.prize}
                  </div>

                  {/* Ticket Code */}
                  <div className="mb-1">
                    <div className="text-[8px] text-muted-foreground mb-0.5 uppercase tracking-wider font-medium">
                      Ticket
                    </div>
                    <div className="font-mono text-[10px] font-bold bg-white/80 dark:bg-gray-800/80 px-1 py-0.5 rounded border border-gray-200 dark:border-gray-700">
                      {winner.ticket_code}
                    </div>
                  </div>

                  {/* Position Label */}
                  <div className={`text-[8px] font-medium ${
                    index === 0 
                      ? 'text-yellow-700 dark:text-yellow-300' 
                      : index === 1 
                      ? 'text-gray-700 dark:text-gray-300' 
                      : index === 2
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-blue-700 dark:text-blue-300'
                  }`}>
                    {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`}
                  </div>
                </div>

                {/* Decorative Elements */}
                <div className={`absolute inset-0 opacity-10 ${
                  index === 0 
                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500' 
                    : index === 1 
                    ? 'bg-gradient-to-br from-gray-400 to-gray-500' 
                    : index === 2
                    ? 'bg-gradient-to-br from-amber-600 to-yellow-700'
                    : 'bg-gradient-to-br from-blue-500 to-purple-500'
                }`}></div>
                
                {/* Sparkle Effect for Top 3 */}
                {index < 3 && (
                  <div className="absolute top-0.5 left-0.5 text-[10px] animate-pulse">
                    ✨
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      

      {/* How it Works */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                1
              </div>
              <p>Generate your unique lottery ticket for the current month</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                2
              </div>
              <p>
                Buy extra tickets for 50 Duna coins each to increase your
                chances
              </p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                3
              </div>
              <p>Each ticket has equal chances - more tickets = better odds</p>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-semibold">
                4
              </div>
              <p>Winner is randomly selected at the end of each month and will recieve 100,1000 TON </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
