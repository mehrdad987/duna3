import { useState } from "react";
import { InfoTab } from "./InfoTab";
import { FriendsTab } from "./FriendsTab";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Info, MessageCircle, Trophy, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function CommunityTab() {
  const [activeSubTab, setActiveSubTab] = useState<"info" | "friends">("info");

  const subTabs = [
    {
      id: "info" as const,
      label: "Info",
      icon: <Info className="w-4 h-4" />,
      color: "from-blue-500 to-cyan-600",
    },
    {
      id: "friends" as const,
      label: "Friends",
      icon: <Users className="w-4 h-4" />,
      color: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <MessageCircle className="w-6 h-6 text-yellow-400" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            Community
          </h1>
          <Trophy className="w-6 h-6 text-yellow-400" />
        </div>
        <p className="text-slate-400 text-sm">Connect with players and stay updated</p>
      </div>

      {/* Sub-tab Navigation */}
      <Card className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 border-yellow-500/30 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex gap-2 bg-slate-700/50 rounded-xl p-1">
            {subTabs.map((tab) => {
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium transition-all duration-300",
                    isActive
                      ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                      : "text-slate-400 hover:text-white hover:bg-slate-600/50"
                  )}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                  {isActive && <Star className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      <div className="tab-content">
        {activeSubTab === "info" && <InfoTab />}
        {activeSubTab === "friends" && <FriendsTab />}
      </div>
    </div>
  );
}
