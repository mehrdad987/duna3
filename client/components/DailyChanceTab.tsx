import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Gift, Flame, Clock, Target } from 'lucide-react';

export function DailyChanceTab() {
  return (
    <div className="space-y-6">
      {/* Coming Soon Header */}
      <Card className="overflow-hidden bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/30">
        <CardHeader className="text-center pb-3">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400">
            <Calendar className="w-6 h-6" />
            Daily Chances
          </CardTitle>
          <Badge variant="secondary" className="mx-auto bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
            Coming Soon!
          </Badge>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
            <Gift className="w-10 h-10 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-2">Daily Rewards & Challenges</h3>
            <p className="text-muted-foreground mb-4">
              Complete daily tasks, spin the wheel, and earn amazing rewards every single day!
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Features Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Daily Activities
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                🎯
              </div>
              <div>
                <p className="font-medium">Daily Check-in</p>
                <p className="text-muted-foreground">Login daily to earn Duna coins and streak bonuses</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                🎡
              </div>
              <div>
                <p className="font-medium">Spin the Wheel</p>
                <p className="text-muted-foreground">Free daily spins for coins, tickets, and prizes</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                📋
              </div>
              <div>
                <p className="font-medium">Daily Challenges</p>
                <p className="text-muted-foreground">Complete tasks to unlock special rewards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                🔥
              </div>
              <div>
                <p className="font-medium">Streak System</p>
                <p className="text-muted-foreground">Build daily streaks for multiplied rewards</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 bg-green-500/10 text-green-600 rounded-full flex items-center justify-center text-xs font-semibold">
                🎁
              </div>
              <div>
                <p className="font-medium">Bonus Hours</p>
                <p className="text-muted-foreground">Special time windows with double rewards</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Streak Preview */}
      <Card className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border-orange-200 dark:border-orange-800">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
            <Flame className="w-5 h-5" />
            Streak System Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2 mb-4">
            {Array.from({ length: 7 }, (_, i) => (
              <div key={i} className="text-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < 3 ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {i + 1}
                </div>
                <p className="text-xs mt-1 text-muted-foreground">
                  {i < 3 ? '✓' : '○'}
                </p>
              </div>
            ))}
          </div>
          <p className="text-sm text-center text-muted-foreground">
            Current streak: 3 days • Next reward: 25 Duna coins
          </p>
        </CardContent>
      </Card>

      {/* Notification */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <CardContent className="p-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
            <Clock className="w-4 h-4" />
            <span className="text-sm font-medium">Coming Very Soon!</span>
          </div>
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Daily Chances will launch with amazing rewards and challenges. Stay tuned!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
