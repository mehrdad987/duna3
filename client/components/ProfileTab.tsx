import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations, UserRecord } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Calendar,
  Clock,
  Shield,
  Crown,
  Star,
  Diamond,
  Gem,
  Trophy,
  Coins,
} from "lucide-react";
import { format } from "date-fns";

export function ProfileTab() {
  const { user, isLoading: telegramLoading } = useTelegram();
  const [userData, setUserData] = useState<UserRecord | null>(null);
  const [loginDate, setLoginDate] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (user && !telegramLoading) {
      handleUserLogin();
    }
  }, [user, telegramLoading]);

  const handleUserLogin = async () => {
    if (!user) return;

    try {
      // First check if user exists
      const existingUser = await dbOperations.getUser(user.id);
      const isUserNew = !existingUser;
      setIsNewUser(isUserNew);

      const currentDate = new Date().toISOString();

      const userRecord: Omit<UserRecord, "id" | "created_at" | "updated_at"> = {
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        login_date: currentDate,
      };

      console.log(
        isUserNew ? "Creating new user..." : "Updating existing user...",
      );
      const savedUser = await dbOperations.upsertUser(userRecord);
      setUserData(savedUser);
      setLoginDate(currentDate);
    } catch (error) {
      console.error("Error saving user data:", error);
      console.error(
        "Error details:",
        error instanceof Error ? error.message : JSON.stringify(error, null, 2),
      );
      // Fallback for development
      const mockUser: UserRecord = {
        telegram_id: user.id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        login_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setUserData(mockUser);
      setLoginDate(mockUser.login_date);
    } finally {
      setIsLoading(false);
    }
  };

  if (telegramLoading || isLoading) {
    return (
      <div className="space-y-6">
        <Card className="card-luxury dark:card-luxury">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 rounded-full animate-pulse border-2 border-yellow-500/30"></div>
              <div className="space-y-3 flex-1">
                <div className="h-6 bg-gradient-to-r from-slate-600/50 to-slate-500/50 rounded-lg w-40 animate-pulse"></div>
                <div className="h-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 rounded w-32 animate-pulse"></div>
                <div className="h-3 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded w-24 animate-pulse"></div>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="h-20 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-xl animate-pulse border border-green-500/20"></div>
              <div className="h-20 bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-xl animate-pulse border border-blue-500/20"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!user || !userData) {
    return (
      <Card className="card-luxury dark:card-luxury">
        <CardContent className="p-8 text-center">
          <div className="relative mb-6">
            <Shield className="w-16 h-16 mx-auto text-slate-400 drop-shadow-lg" />
            <div className="absolute -top-2 -right-2">
              <Crown className="w-6 h-6 text-yellow-400 animate-pulse" />
            </div>
          </div>
          <h3 className="text-xl font-bold text-casino-gold mb-3">
            VIP Access Required
          </h3>
          <p className="text-slate-300 dark:text-slate-400 mb-4">
            Please launch this exclusive casino from your Telegram app to access
            your VIP profile.
          </p>
          <div className="p-3 bg-gradient-to-r from-yellow-400/10 to-yellow-600/10 rounded-lg border border-yellow-500/20">
            <span className="text-yellow-300 text-sm">
              🎰 Premium gaming experience awaits
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getInitials = () => {
    const firstInitial = userData.first_name?.charAt(0) || "";
    const lastInitial = userData.last_name?.charAt(0) || "";
    return firstInitial + lastInitial;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP 'at' p");
    } catch {
      return "Just now";
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* VIP Profile Card */}
      <Card className="card-luxury dark:card-luxury overflow-hidden relative">
        {/* Premium glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-purple-500/10 to-yellow-400/10 animate-pulse"></div>

        <CardHeader className="pb-3 relative z-10">
          <CardTitle className="flex items-center gap-3 text-casino-gold">
            
            Member Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          {/* Luxury User Avatar and Info */}
          <div className="flex items-center space-x-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-yellow-400/50 shadow-luxury-gold">
                <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black text-xl font-bold">
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1">
                <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black text-xs px-2 py-1">
                  VIP
                </Badge>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <h2 className="text-2xl font-bold text-casino-gold">
                {userData.first_name} {userData.last_name || ""}
              </h2>
              {userData.username && (
                <div className="flex items-center gap-2">
                  <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white text-xs px-3 py-1">
                    @{userData.username}
                  </Badge>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Diamond className="w-4 h-4 text-purple-400" />
                <p className="text-sm text-slate-300 dark:text-slate-400">
                  Member ID: {userData.telegram_id}
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border border-green-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  Duna Coins
                </span>
              </div>
              <div className="text-2xl font-bold text-green-400">
                {userData.duna_coins || 0}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500/20 to-cyan-600/20 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Gem className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium text-blue-300">
                  TON Balance
                </span>
              </div>
              <div className="text-2xl font-bold text-blue-400">
                {userData.ton_balance?.toFixed(1) || "0.000"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Session Info */}
      <Card className="card-luxury dark:card-luxury">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-3 text-casino-gold">
            <Clock className="w-5 h-5 text-yellow-400" />
            Session Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-700/50 to-slate-600/50 dark:from-slate-800/50 dark:to-slate-700/50 rounded-xl border border-yellow-500/20">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-yellow-400" />
                <span className="text-sm font-medium text-slate-200">
                  Last Login
                </span>
              </div>
              <span className="text-sm text-slate-300">
                {formatDate(loginDate)}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl border border-green-500/30">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium text-green-300">
                  Account Status
                </span>
              </div>
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1">
                ✓ Premium Active
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium Welcome */}
      <Card className="card-luxury dark:card-luxury relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-purple-500/5 to-yellow-400/5"></div>
        <CardContent className="p-6 text-center relative z-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Trophy className="w-8 h-8 text-yellow-400 animate-float" />
            <Crown className="w-6 h-6 text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-casino-gold mb-3">
            {isNewUser
              ? "Welcome to DUNA CASINO! 🎰"
              : "Welcome Back, High Roller! 🎲"}
          </h3>
          <p className="text-slate-300 dark:text-slate-400 text-sm leading-relaxed">
            {isNewUser
              ? "Your VIP account is now active! Enjoy exclusive access to premium games, special bonuses, and luxury rewards. Ready to try your luck?"
              : "Your premium gaming session is ready. Check your lottery tickets, spin the roulette, or explore daily rewards. The house awaits your next move!"}
          </p>
          {isNewUser && (
            <div className="mt-4 p-3 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 rounded-lg border border-yellow-500/30">
              <span className="text-yellow-300 text-sm font-medium">
                🎁 Welcome Bonus: 50 Duna Coins Credited!
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
