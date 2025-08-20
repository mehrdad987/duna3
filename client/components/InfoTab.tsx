import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { dbOperations } from "@/lib/supabase";
import { useTelegram } from "@/hooks/useTelegram";
import {
  Gift,
  Calendar,
  Coins,
  TrendingUp,
  Mail,
  Star,
  Trophy,
  Info,
  ArrowRight,
  
  Clock,
  Banknote,
  Rocket,
} from "lucide-react";

export function InfoTab() {
  const { user } = useTelegram();
  const [topDuna, setTopDuna] = useState<Array<{ user: any; duna_coins: number }>>([]);
  const [topTon, setTopTon] = useState<Array<{ user: any; total_ton: number }>>([]);
  const [isLoadingLeaders, setIsLoadingLeaders] = useState(false);

  useEffect(() => {
    const loadLeaderboards = async () => {
      setIsLoadingLeaders(true);
      try {
        const [duna, ton] = await Promise.all([
          dbOperations.getTopUsersByDunaCoins(10),
          dbOperations.getTopUsersByTonTransferred(10),
        ]);
        setTopDuna(duna || []);
        setTopTon(ton || []);
      } catch (e) {
        setTopDuna([]);
        setTopTon([]);
      } finally {
        setIsLoadingLeaders(false);
      }
    };
    loadLeaderboards();
  }, []);

  const handleEmailContact = () => {
    window.open("mailto:info@aimirza.com?subject=DUNA Casino Inquiry", "_blank");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header - Greatest Casino */}
      

      {/* Anniversary Special */}
      <Card className="relative bg-gradient-to-br from-purple-900 via-purple-800 to-purple-900 border-2 border-purple-500 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 via-pink-500/10 to-purple-400/10 pointer-events-none" />
        <CardHeader className="relative z-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}>
          <CardTitle className="flex items-center justify-center gap-3 text-purple-300">
            <Gift className="w-6 h-6 text-purple-400 animate-bounce" />
             Anniversary Celebration 
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="text-center mb-4">
            
          </div>
          
          
            <div className="flex items-center gap-2 mb-3">
             
              <h4 className="font-bold text-purple-200">Free DUNA Chips Distribution</h4>
            </div>
            <p className="text-purple-100 text-sm leading-relaxed mb-3">
              To celebrate our anniversary, we're distributing exclusive DUNA chips to our valued players! Prizes are calculated based on your TON transaction and DUNA Won balance. 
              YOU will be able to claim your bonus chips in the <strong className="text-purple-300">DUNA Center</strong>
            </p>
            
          

          <div className="bg-gradient-to-r from-green-700/30 to-emerald-700/30 rounded-xl p-4 border border-green-500/30">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" />
              <h4 className="font-bold text-green-200">DUNA to TON Exchange</h4>
            </div>
            <p className="text-green-100 text-sm leading-relaxed">
            If you're unable to visit the Duna Center, you'll have the opportunity to exchange your DUNA chips for valuable TON coins after the Anniversary Event.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Leaderboards */}
      <Card className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-yellow-600 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-yellow-400/5 pointer-events-none" />
        <CardHeader className="relative z-10">
          <CardTitle className="flex items-center justify-center gap-3 text-yellow-300">
            <Trophy className="w-6 h-6 text-yellow-400" />
            Leaderboards
          </CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top TON Transfers */}
            <div className="bg-slate-800/40 rounded-xl border border-yellow-500/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-yellow-400" />
                <h4 className="font-bold text-yellow-200">Top 10 by TON Transferred</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-300">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3 text-right">TON</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLeaders && (
                      <tr>
                        <td colSpan={3} className="py-3 text-slate-400">Loading...</td>
                      </tr>
                    )}
                    {!isLoadingLeaders && topTon.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-3 text-slate-400">No data</td>
                      </tr>
                    )}
                    {!isLoadingLeaders && topTon.map((row, idx) => {
                      const displayName = row.user?.username || `${row.user?.first_name || ""} ${row.user?.last_name || ""}`.trim() || `User ${row.user?.telegram_id || row.user?.id}`;
                      return (
                        <tr key={`ton-${row.user?.id || idx}`} className="border-t border-slate-700/50">
                          <td className="py-2 pr-3 text-slate-300">{idx + 1}</td>
                          <td className="py-2 pr-3 text-slate-200">{displayName}</td>
                          <td className="py-2 pr-3 text-right text-yellow-300 font-semibold">{Number(row.total_ton || 0).toFixed(1)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Top DUNA Holders */}
            <div className="bg-slate-800/40 rounded-xl border border-yellow-500/20 p-3">
              <div className="flex items-center gap-2 mb-2">
                <Coins className="w-5 h-5 text-yellow-400" />
                <h4 className="font-bold text-yellow-200">Top 10 by DUNA Coins</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-300">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">User</th>
                      <th className="py-2 pr-3 text-right">DUNA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingLeaders && (
                      <tr>
                        <td colSpan={3} className="py-3 text-slate-400">Loading...</td>
                      </tr>
                    )}
                    {!isLoadingLeaders && topDuna.length === 0 && (
                      <tr>
                        <td colSpan={3} className="py-3 text-slate-400">No data</td>
                      </tr>
                    )}
                    {!isLoadingLeaders && topDuna.map((row, idx) => {
                      const displayName = row.user?.username || `${row.user?.first_name || ""} ${row.user?.last_name || ""}`.trim() || `User ${row.user?.telegram_id || row.user?.id}`;
                      return (
                        <tr key={`duna-${row.user?.id || idx}`} className="border-t border-slate-700/50">
                          <td className="py-2 pr-3 text-slate-300">{idx + 1}</td>
                          <td className="py-2 pr-3 text-slate-200">{displayName}</td>
                          <td className="py-2 pr-3 text-right text-yellow-300 font-semibold">{Number(row.duna_coins || 0).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      

      {/* Important Dates & Information */}
      <Card className="relative bg-gradient-to-br from-red-900 via-orange-900 to-red-900 border-2 border-orange-500 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-400/10 via-red-500/10 to-orange-400/10 pointer-events-none" />
        <CardHeader className="relative z-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}>
          <CardTitle className="flex items-center justify-center gap-3 text-orange-300">
            <Calendar className="w-6 h-6 text-orange-400" />
            Important Dates & Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          {/* Withdrawal Information */}
          <div className="bg-gradient-to-r from-red-700/30 to-orange-700/30 rounded-xl p-4 border border-red-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Banknote className="w-5 h-5 text-red-400" />
              <h4 className="font-bold text-red-200">Withdrawal Availability</h4>
            </div>
            <div className="space-y-2">
              <p className="text-red-100 text-sm">
                All withdrawals will be available starting:
              </p>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                <Badge className="bg-red-500 text-white font-bold">
                  January 1st, 2026
                </Badge>
              </div>
              <p className="text-red-200 text-xs">
                This ensures system stability and compliance with regulations.
              </p>
            </div>
          </div>

          {/* DUNA Coin Launch */}
          <div className="bg-gradient-to-r from-blue-700/30 to-cyan-700/30 rounded-xl p-4 border border-blue-500/30">
            <div className="flex items-center gap-2 mb-3">
              <Rocket className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-blue-200">DUNA Coin Official Launch</h4>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <Badge className="bg-blue-500 text-white font-bold">
                  July 2026
                </Badge>
              </div>
              <p className="text-blue-100 text-sm">
                It will cost more! Exchange rate:
              </p>
              <div className="bg-blue-600/20 rounded-lg p-3 border border-blue-500/20">
                <div className="flex items-center justify-center gap-2 text-blue-200 font-bold">
                  <span>1 TON</span>
                  <ArrowRight className="w-4 h-4" />
                  <span>1,000 DUNA</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="relative bg-gradient-to-br from-green-900 via-emerald-900 to-green-900 border-2 border-emerald-500 shadow-2xl overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 via-green-500/10 to-emerald-400/10 pointer-events-none" />
        <CardHeader className="relative z-10" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)',
        }}>
          <CardTitle className="flex items-center justify-center gap-3 text-emerald-300">
            <Mail className="w-6 h-6 text-emerald-400" />
            Contact & Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 relative z-10">
          <div className="text-center">
            <p className="text-emerald-100 text-sm mb-4">
              Need assistance or have questions? Our premium support team is here to help.
            </p>
          </div>

          <div className="bg-gradient-to-r from-emerald-700/30 to-green-700/30 rounded-xl p-4 border border-emerald-500/30">
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                
                <h4 className="font-bold text-emerald-200">Premium Support Contact</h4>
              </div>
              
              <div className="space-y-2">
                <p className="text-emerald-100 text-sm font-medium">AIMI RAZAKU</p>
                <p className="text-emerald-200 text-xs">Customer Relations Manager</p>
              </div>

              <Button
                onClick={handleEmailContact}
                className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold py-3 rounded-xl shadow-lg transform transition-all hover:scale-105"
              >
                <Mail className="w-4 h-4 mr-2" />
                info@aimirza.com
              </Button>
              
              <p className="text-emerald-300 text-xs">
                Be patient, it takes time to respond. ISSUE about BUGs and Transactions will be answered.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <Card className="bg-gradient-to-r from-slate-800/90 to-slate-700/90 border border-yellow-500/30">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <p className="text-slate-300 text-sm font-medium">DUNA Casino</p>
            <Star className="w-4 h-4 text-yellow-400" />
          </div>
          <p className="text-slate-400 text-xs">
            Premium Gaming • Secure Transactions • Exceptional Service
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
