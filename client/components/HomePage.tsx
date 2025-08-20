import { useEffect, useState } from "react";
import { useTelegram } from "@/hooks/useTelegram";
import { dbOperations, UserRecord } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Ticket,
  ShipWheel,
  Dice1,
  Crown,
  Heart,
  Spade,
  Coins,
  Star,
  Gem,
} from "lucide-react";

interface HomePageProps {
  onGameSelect?: (gameId: string) => void;
}

export function HomePage({ onGameSelect }: HomePageProps) {
  const { user, isLoading: telegramLoading } = useTelegram();
  const [userData, setUserData] = useState<UserRecord | null>(null);
  const [balance, setBalance] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user && !telegramLoading) {
      loadUserData();
    }
  }, [user, telegramLoading]);

  const loadUserData = async () => {
    if (!user) return;

    try {
      const existingUser = await dbOperations.getUser(user.id);
      setUserData(existingUser);
      
   
    } catch (error) {
      console.error("Error loading user data:", error);
      // Fallback data
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
      setBalance(1000); // Default TON balance
      // removed unused dunaBalance
    } finally {
      setIsLoading(false);
    }
  };

  const gameCards = [
    {
      id: "lottery",
      title: "Lottery Ticket",
      icon: <Ticket className="w-8 h-8" />,
      bgImage: "url('https://i.postimg.cc/X70BCfRv/360-F-236028330-03-Xp-IN68fj4wq-Mw-Ga-B8n8-Nw-B3-FJav-FBl.jpg')",
      description: "Try your luck",
      available: true,
    },
    {
      id: "roulette",
      title: "Roulette",
      icon: <ShipWheel className="w-8 h-8" />,
      bgImage: "url('https://i.postimg.cc/VL1H9Pgt/Capture.jpg')",
      description: "Spin to win",
      available: true,
    },
    {
      id: "3dice",
      title: "3 Dice",
      icon: <Dice1 className="w-8 h-8" />,
      bgImage: "url('https://i.postimg.cc/d1Hn0WHD/Capture01.jpg')",
      description: "Roll the dice",
      available: true,
    },
    {
      id: "777",
      title: "777",
      icon: <Crown className="w-8 h-8" />,
      bgImage: "url('https://i.postimg.cc/MKD0Z3nw/Capture04.jpg')",
      description: "Coming Soon",
      available: false,
    },
         {
       id: "blackjack",
       title: "21 Blackjack",
       icon: <Spade className="w-8 h-8" />,
       bgImage: "url('https://i.postimg.cc/BZjRKDxR/Capture02.jpg')",
       description: "Beat the dealer",
       available: true,
     },
    {
      id: "poker",
      title: "Poker",
      icon: <Heart className="w-8 h-8" />,
      bgImage: "url('https://i.postimg.cc/1XFWYGBt/Capture03.jpg')",
      description: "Coming Soon",
      available: false,
    },
         {
       id: "baccarat",
       title: "Baccarat",
       icon: <Heart className="w-8 h-8" />,
       bgImage: "url('https://i.postimg.cc/j2v1XbQc/Capture05.jpg')",
       description: "Elegant card game",
       available: true,
     },
    {
      id: "craps",
      title: "Craps",
      icon: <Dice1 className="w-8 h-8" />,
      bgImage: "url('https://i.postimg.cc/d1Hn0WHD/Capture01.jpg')",
      description: "Coming Soon",
      available: false,
    },
  ];

  if (telegramLoading || isLoading) {
    return (
      <div className="min-h-screen relative overflow-hidden">
        {/* Background Image with darker tone for loading */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: "url('https://i.postimg.cc/cL3gdPqD/Capture.jpg')",
            filter: 'brightness(0.45) saturate(0.9)'
          }}
        >
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        <div className="relative z-10 p-6">
          <div className="animate-pulse">
            <div className="h-32 bg-slate-700 rounded-xl mb-6"></div>
            <div className="grid grid-cols-2 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="h-24 bg-slate-700 rounded-xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
             {/* Background Image with Overlay */}
       <div
         className="absolute inset-0 bg-cover bg-center bg-no-repeat"
         style={{
           backgroundImage: "url('https://i.postimg.cc/cL3gdPqD/Capture.jpg')",
           filter: 'brightness(0.45) saturate(0.95)'
         }}
       >
         <div className="absolute inset-0 bg-black/30"></div>
       </div>

      <div className="relative z-10 p-6">
                 {/* Profile Card */}
         <Card className="mb-6 bg-black/50 border border-gray-700 backdrop-blur-sm">
           <CardContent className="p-4">
             <div className="flex items-center space-x-3">
               <Avatar className="w-12 h-12 border-2 border-yellow-500/50">
                 <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-white font-bold">
                   {userData?.first_name?.charAt(0) || user?.first_name?.charAt(0) || "U"}
                 </AvatarFallback>
               </Avatar>
               <div className="flex-1 min-w-0">
                 <h2 className="text-lg font-bold text-white truncate">
                   {userData?.first_name || user?.first_name || "User"}
                 </h2>
                 <p className="text-gray-400 text-sm truncate">
                   @{userData?.username || user?.username || "username"}
                 </p>
                 <div className="flex items-center space-x-3 mt-1">
                   <div className="flex items-center space-x-1">
                     <Coins className="w-3 h-3 text-yellow-400" />
                     <span className="text-yellow-400 font-bold text-sm">
                       {userData?.ton_balance || 0}
                     </span>
                   </div>
                   <div className="flex items-center space-x-1">
                     <Gem className="w-3 h-3 text-purple-400" />
                     <span className="text-purple-400 font-bold text-sm">
                       {userData?.duna_coins || 0}
                     </span>
                   </div>
                 </div>
               </div>
                                <div className="flex flex-col items-end space-y-1">
                   <Badge className="bg-yellow-500 text-black text-xs px-2 py-1">
                     <Star className="w-2 h-2 mr-1" />
                     VIP
                   </Badge>
                   <div className="text-right">
                     <p className="text-gray-400 text-xs">Joined</p>
                     <p className="text-white text-xs font-medium">
                       {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : "Today"}
                     </p>
                   </div>
                 </div>
             </div>
           </CardContent>
         </Card>

                          {/* Game Cards Grid */}
         <div className="grid grid-cols-2 gap-3">
           {gameCards.map((game) => (
             <Card 
               key={game.id}
               className={cn(
                 "group transform transition-all duration-300 border-0 overflow-hidden",
                 game.available 
                   ? "cursor-pointer hover:scale-105" 
                   : "cursor-not-allowed opacity-80"
               )}
               style={{
                 backgroundImage: game.bgImage,
                 backgroundSize: 'cover',
                 backgroundPosition: 'center',
                 backgroundRepeat: 'no-repeat',
               }}
               onClick={() => {
                 if (game.available && onGameSelect) {
                   onGameSelect(game.id);
                 }
               }}
             >
                             <CardContent className="p-3 h-24 flex flex-col items-center justify-center text-center relative">
                 {/* Stronger dark overlay for better text readability */}
                 <div className="absolute inset-0 bg-black/80 group-hover:bg-black/70 transition-all duration-300"></div>
                 
                 <div className="relative z-10">
                   <div className={cn(
                     "text-white mb-1 transition-transform duration-300 drop-shadow-lg",
                     game.available && "group-hover:scale-110"
                   )}>
                     {game.icon}
                   </div>
                   <h3 className="text-white font-bold text-sm md:text-base mb-0.5 drop-shadow-lg">
                     {game.title}
                   </h3>
                   <p className={cn(
                     "text-xs md:text-sm drop-shadow-lg",
                     game.available ? "text-white" : "text-yellow-400 font-semibold"
                   )}>
                     {game.description}
                   </p>
                   {!game.available && (
                     <div className="absolute top-1 right-1">
                       <Badge className="bg-yellow-500 text-black text-[8px] px-1 py-0.5">
                         SOON
                       </Badge>
                     </div>
                   )}
                 </div>

                 {/* Subtle glow effect on hover */}
                 <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
               </CardContent>
            </Card>
          ))}
        </div>

                 {/* Bottom Spacing for fixed tabs */}
         <div className="h-24"></div>
      </div>
    </div>
  );
}
