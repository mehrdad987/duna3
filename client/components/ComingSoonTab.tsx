import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Sparkles, Users } from "lucide-react";

interface ComingSoonTabProps {
  gameName: string;
  description?: string;
}

export function ComingSoonTab({ gameName, description }: ComingSoonTabProps) {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background with overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      <div className="relative z-10 p-6">
        <div className="max-w-md mx-auto">
          {/* Coming Soon Card */}
          <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-yellow-500/30 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Clock className="w-10 h-10 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-white">
                Coming Soon!
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-yellow-400 mb-2">
                  {gameName}
                </h3>
                {description && (
                  <p className="text-gray-300 text-sm">
                    {description}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 text-gray-300">
                  <Sparkles className="w-5 h-5 text-yellow-400" />
                  <span className="text-sm">Exciting new features</span>
                </div>
                <div className="flex items-center justify-center gap-3 text-gray-300">
                  <Users className="w-5 h-5 text-blue-400" />
                  <span className="text-sm">Multiplayer support</span>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-yellow-400 text-sm font-medium">
                  We're working hard to bring you the best gaming experience!
                </p>
                <p className="text-yellow-300 text-xs mt-2">
                  Stay tuned for updates and be the first to play when it launches.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
