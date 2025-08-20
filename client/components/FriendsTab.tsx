import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { dbOperations } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { useTelegram } from "@/hooks/useTelegram";
import { Gift, Users, Trophy, Copy } from "lucide-react";

interface InviteRecord {
  invitee?: {
    id?: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    telegram_id?: string;
  };
  created_at?: string;
}

export function FriendsTab() {
  const { user } = useTelegram();
  const [myInvites, setMyInvites] = useState<InviteRecord[]>([]);
  const [leaders, setLeaders] = useState<Array<{ user: any; total_invites: number }>>([]);
  const [copied, setCopied] = useState(false);
  const [myRefCode, setMyRefCode] = useState<string>("");
  const [friendCode, setFriendCode] = useState<string>("");
  const [activating, setActivating] = useState(false);
  const [activationMsg, setActivationMsg] = useState<string>("");

  const botUsername = (import.meta as any).env?.VITE_TELEGRAM_BOT_USERNAME || "dunalotterybot";
  //const referralCode = user?.id ? btoa(String(user.id)) : "";

  // New user link (works for people who never started the bot)
  //const newUserLink = `https://t.me/${botUsername}?start=ref_${encodeURIComponent(myRefCode)}`;
  // Existing user link (directly opens Mini App)
  const existingUserLink = `https://t.me/${botUsername}/app?startapp=ref_${encodeURIComponent(myRefCode)}`;

  // Pick best link — fallback to newUserLink if we don’t know
  const publicShareLink = myRefCode ? existingUserLink : "";

  // Telegram share link — include the referral code in the shared text
  const shareText = myRefCode
    ? `Join me on DUNA Casino and get 50 DUNA bonus — take my code ${myRefCode} and paste it in the Start button!`
    : `Join me on DUNA Casino and get 50 DUNA bonus!`;

  const shareUrl = myRefCode
    ? `https://t.me/share/url?url=${encodeURIComponent(publicShareLink)}&text=${encodeURIComponent(
        shareText
      )}`
    : "";

  

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Ensure current user has a referral code and fetch lists
      const code = await dbOperations.ensureUserRefCode(user.id);
      if (code) setMyRefCode(code);
      const [mine, top] = await Promise.all([
        dbOperations.getInvitedFriendsByTelegramId(user.id),
        dbOperations.getTopInviters(10),
      ]);
      setMyInvites(mine || []);
      setLeaders(top || []);
    })();
  }, [user]);

  return (
    <div className="space-y-4">

      {/* Activate Friend's Code */}
      <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Users className="w-5 h-5" /> Have a friend's code?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full">
            <Input
              value={friendCode}
              onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
              placeholder="Enter friend's referral code (e.g. ABC123)"
              className="w-full sm:max-w-xs"
            />
            <Button
              disabled={!user || !friendCode || activating}
              onClick={async () => {
                if (!user || !friendCode) return;
                setActivationMsg("");
                setActivating(true);
                const res = await dbOperations.activateReferralByCode(user.id, friendCode.trim());
                setActivationMsg(res.message || (res.ok ? "Referral activated" : "Activation failed"));
                setActivating(false);
                // Refresh lists on success
                if (res.ok) {
                  const mine = await dbOperations.getInvitedFriendsByTelegramId(user.id);
                  setMyInvites(mine || []);
                }
              }}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              {activating ? "Activating..." : "Activate Code"}
            </Button>
          </div>
          {activationMsg && (
            <p className="text-xs text-muted-foreground">{activationMsg}</p>
          )}
        </CardContent>
      </Card>

      {/* Invite Friends */}
      <Card className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border-emerald-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
            <Users className="w-5 h-5" /> Invite Friends
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Show my code */}
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Your code:</span>
            <span className="font-semibold tracking-wider">{myRefCode || "—"}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!myRefCode) return;
                try { await navigator.clipboard.writeText(myRefCode); setCopied(true); setTimeout(()=>setCopied(false), 1500); } catch {}
              }}
            >
              <Copy className="w-4 h-4 mr-1" /> {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">

            

            {/* Share on Telegram */}
            <Button
              disabled={!publicShareLink}
              onClick={() => {
                if (!publicShareLink) return;
                const tg = (window as any).Telegram?.WebApp;
                const target = shareUrl || publicShareLink;
                if (tg?.openTelegramLink) {
                  tg.openTelegramLink(target);
                } else if (tg?.openLink) {
                  tg.openLink(target);
                } else {
                  window.open(target, "_blank");
                }
              }}
              className="bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700"
            >
              Share on Telegram
            </Button>

          </div>
          
        </CardContent>
      </Card>

      {/* My Invited Friends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="w-5 h-5" /> Your Invited Friends
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Friend</th>
                  <th className="py-2 pr-3">Telegram ID</th>
                  <th className="py-2 pr-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {myInvites.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 text-center text-muted-foreground">
                      No invites yet
                    </td>
                  </tr>
                )}
                {myInvites.map((row, idx) => (
                  <tr key={row?.invitee?.id || idx} className="border-t">
                    <td className="py-2 pr-3">{idx + 1}</td>
                    <td className="py-2 pr-3">
                      {row?.invitee?.username ||
                        `${row?.invitee?.first_name || ""} ${row?.invitee?.last_name || ""}`.trim() ||
                        "Unknown"}
                    </td>
                    <td className="py-2 pr-3">{row?.invitee?.telegram_id}</td>
                    <td className="py-2 pr-3">
                      {new Date(row?.created_at || Date.now()).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Top Inviters */}
      <Card className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 border-yellow-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <Trophy className="w-5 h-5" /> Top Inviters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3 text-right">Friends</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-3 text-center text-muted-foreground">
                      Calculating...
                    </td>
                  </tr>
                )}
                {leaders.map((row, idx) => (
                  <tr key={row?.user?.id || idx} className="border-t">
                    <td className="py-2 pr-3">{idx + 1}</td>
                    <td className="py-2 pr-3">
                      {row.user?.username ||
                        `${row.user?.first_name || ""} ${row.user?.last_name || ""}`.trim() ||
                        "Unknown"}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold">{row.total_invites}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
