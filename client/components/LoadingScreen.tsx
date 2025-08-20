import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Gem, Star, Dice1, Trophy, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingScreenProps {
  onComplete?: () => void;
  backgroundImage?: string;
  duration?: number;
}

export function LoadingScreen({
  onComplete,
  backgroundImage,
  duration = 5000,
}: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  const loadingMessages = [
    "Initializing Casino...",
    "Loading Game Tables...",
    "Preparing Your Experience...",
    "Shuffling the Deck...",
    "Welcome to DUNA Casino!",
  ];

  const loadingSteps = [
    { icon: Crown, label: "Royal Setup", color: "text-yellow-400" },
    { icon: Gem, label: "Premium Loading", color: "text-purple-400" },
    { icon: Dice1, label: "Game Tables", color: "text-red-400" },
    { icon: Trophy, label: "VIP Access", color: "text-green-400" },
    { icon: Sparkles, label: "Final Touch", color: "text-blue-400" },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev + 100 / (duration / 50);

        // Update message based on progress
        const messageIndex = Math.floor(
          (newProgress / 100) * loadingMessages.length,
        );
        setCurrentMessage(Math.min(messageIndex, loadingMessages.length - 1));

        if (newProgress >= 100) {
          clearInterval(interval);
          setIsComplete(true);
          setTimeout(() => {
            onComplete?.();
          }, 500);
          return 100;
        }

        return newProgress;
      });
    }, 50);

    return () => clearInterval(interval);
  }, [duration, onComplete, loadingMessages.length]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-500",
        isComplete ? "opacity-0 scale-95" : "opacity-100 scale-100",
      )}
      style={{
        background: backgroundImage
          ? `linear-gradient(rgba(0,0,0,0.92), rgba(0,0,0,0.92)), url(${backgroundImage}) center/cover`
          : "linear-gradient(135deg, #050611 0%, #2b0b3f 50%, #050611 100%)",
      }}
    >
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
  <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-purple-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse" />
  <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-yellow-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-1000" />
  <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-blue-500/10 rounded-full mix-blend-multiply filter blur-3xl animate-pulse delay-500" />

        {/* Floating Casino Elements */}
    {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 2}s`,
            }}
          >
      <Star className="w-2 h-2 text-yellow-400/15" />
          </div>
        ))}
      </div>

  <Card className="relative z-10 bg-gradient-to-br from-slate-900/90 via-purple-900/90 to-slate-900/90 border-2 border-yellow-600/30 shadow-2xl backdrop-blur-md max-w-md mx-4">
        <CardContent className="p-8 text-center space-y-6">
          {/* Casino Logo */}
          <div className="flex items-center justify-center gap-3 relative">
            <div className="relative">
              <Crown className="w-12 h-12 text-yellow-400 drop-shadow-2xl" />
              <div className="absolute -top-1 -right-1">
                <Gem className="w-4 h-4 text-yellow-300 animate-pulse" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-lg">
                DUNA CASINO
              </h1>
              <p className="text-xs text-yellow-400/80 font-medium tracking-wider">
                PREMIUM GAMING
              </p>
            </div>
            <Star
              className="w-8 h-8 text-yellow-400 animate-spin"
              style={{ animationDuration: "3s" }}
            />
          </div>

          {/* Loading Steps Indicator */}
          <div className="flex justify-center gap-3">
            {loadingSteps.map((step, index) => {
              const isActive =
                progress >= ((index + 1) / loadingSteps.length) * 100;
              const Icon = step.icon;

              return (
                <div
                  key={index}
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all duration-500",
                    isActive ? "scale-110" : "scale-100 opacity-50",
                  )}
                >
                  <div
                    className={cn(
                      "p-2 rounded-full border-2 transition-all duration-500",
                      isActive
                        ? "border-yellow-400 bg-yellow-400/20 shadow-lg"
                        : "border-gray-600 bg-gray-800/50",
                    )}
                  >
                    <Icon
                      className={cn(
                        "w-4 h-4",
                        isActive ? step.color : "text-gray-500",
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isActive ? "text-yellow-300" : "text-gray-500",
                    )}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="space-y-3">
            <div className="relative">
              <div className="w-full bg-slate-800 rounded-full h-3 border border-yellow-600/30 shadow-inner">
                <div
                  className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-500 h-full rounded-full shadow-lg transition-all duration-300 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </div>
              </div>

              {/* Progress percentage */}
              <div className="absolute right-0 -top-6">
                <span className="text-yellow-400 text-sm font-bold">
                  {Math.round(progress)}%
                </span>
              </div>
            </div>

            {/* Loading Message */}
            <div className="min-h-[1.5rem] flex items-center justify-center">
              <p className="text-slate-300 text-sm font-medium animate-pulse">
                {loadingMessages[currentMessage]}
              </p>
            </div>
          </div>

          {/* Casino Tagline */}
          <div className="pt-4 border-t border-yellow-600/20">
            <div className="flex items-center justify-center gap-2 text-yellow-400/80">
              <Gem className="w-3 h-3" />
              <span className="text-xs font-medium tracking-wide">
                WHERE LEGENDS ARE BORN
              </span>
              <Gem className="w-3 h-3" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Add custom CSS animations to global.css
export const loadingAnimations = `
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(180deg); }
}

.animate-shimmer {
  animation: shimmer 2s infinite;
}

.animate-float {
  animation: float 3s infinite ease-in-out;
}
`;
