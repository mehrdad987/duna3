import { useState } from "react";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Eye, RotateCcw, Sparkles } from "lucide-react";

export function LoadingDemo() {
  const [showDemo, setShowDemo] = useState(false);
  const [backgroundImage, setBackgroundImage] = useState("");
  const [duration, setDuration] = useState(3000);

  const presetBackgrounds = [
    {
      name: "Casino Night",
      url: "https://images.unsplash.com/photo-1514828053136-700cfb0bf17b?w=1920&h=1080&fit=crop",
      description: "Dark casino interior with neon lights",
    },
    {
      name: "Vegas Lights",
      url: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&h=1080&fit=crop",
      description: "Las Vegas strip at night",
    },
    {
      name: "Luxury Gold",
      url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1920&h=1080&fit=crop",
      description: "Golden luxury background",
    },
    {
      name: "Crystal Purple",
      url: "https://images.unsplash.com/photo-1634387299761-4d8866ed0d5c?w=1920&h=1080&fit=crop",
      description: "Purple crystal abstract background",
    },
  ];

  const handlePresetSelect = (url: string) => {
    setBackgroundImage(url);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setBackgroundImage(url);
    }
  };

  const startDemo = () => {
    setShowDemo(true);
  };

  const resetDemo = () => {
    setShowDemo(false);
  };

  if (showDemo) {
    return (
      <LoadingScreen
        onComplete={resetDemo}
        backgroundImage={backgroundImage}
        duration={duration}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <Card className="bg-gradient-to-r from-purple-900/90 to-blue-900/90 border-purple-500/30">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-2xl text-white">
              <Sparkles className="w-6 h-6 text-purple-400" />
              Loading Screen Demo
            </CardTitle>
            <p className="text-purple-200">
              Customize the casino loading experience with your own background
              image
            </p>
          </CardHeader>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Configuration Panel */}
          <Card className="bg-slate-800/90 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white">
                Customize Loading Screen
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Duration Slider */}
              <div>
                <Label htmlFor="duration" className="text-slate-200">
                  Loading Duration: {duration}ms
                </Label>
                <Input
                  id="duration"
                  type="range"
                  min="1000"
                  max="8000"
                  step="500"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="mt-2"
                />
              </div>

              {/* Background Image URL */}
              <div>
                <Label htmlFor="background" className="text-slate-200">
                  Background Image URL
                </Label>
                <Input
                  id="background"
                  type="url"
                  value={backgroundImage}
                  onChange={(e) => setBackgroundImage(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  className="mt-2"
                />
              </div>

              {/* File Upload */}
              <div>
                <Label htmlFor="upload" className="text-slate-200">
                  Or Upload Your Own Image
                </Label>
                <div className="mt-2">
                  <Input
                    id="upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => document.getElementById("upload")?.click()}
                    className="w-full"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose File
                  </Button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4">
                <Button
                  onClick={startDemo}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview Loading
                </Button>
                <Button variant="outline" onClick={resetDemo}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preset Backgrounds */}
          <Card className="bg-slate-800/90 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white">Preset Backgrounds</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {presetBackgrounds.map((preset, index) => (
                  <div key={index} className="space-y-2">
                    <div
                      className="aspect-video rounded-lg border-2 border-slate-600 overflow-hidden cursor-pointer hover:border-purple-500 transition-colors"
                      onClick={() => handlePresetSelect(preset.url)}
                      style={{
                        backgroundImage: `url(${preset.url})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      <div className="w-full h-full bg-black/30 flex items-center justify-center">
                        <span className="text-white text-xs font-medium text-center px-2">
                          {preset.name}
                        </span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs">
                      {preset.description}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Preview */}
        {backgroundImage && (
          <Card className="bg-slate-800/90 border-slate-600">
            <CardHeader>
              <CardTitle className="text-white">
                Current Background Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="aspect-video rounded-lg border border-slate-600 overflow-hidden"
                style={{
                  backgroundImage: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url(${backgroundImage})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center text-white">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-purple-400" />
                    <p className="text-lg font-semibold">
                      Loading Screen Preview
                    </p>
                    <p className="text-sm opacity-75">
                      This will be behind the loading overlay
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Usage Instructions */}
        <Card className="bg-slate-800/90 border-slate-600">
          <CardHeader>
            <CardTitle className="text-white">
              How to Use Custom Backgrounds
            </CardTitle>
          </CardHeader>
          <CardContent className="text-slate-300 space-y-3">
            <div>
              <h4 className="font-semibold text-white mb-1">
                In Your App Component:
              </h4>
              <pre className="bg-slate-900 p-3 rounded text-sm overflow-x-auto">
                {`<LoadingScreen 
  onComplete={handleLoadingComplete}
  backgroundImage="/path/to/your/image.jpg"
  duration={3000}
/>`}
              </pre>
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">
                Recommended Image Specs:
              </h4>
              <ul className="text-sm space-y-1">
                <li>• Resolution: 1920x1080 or higher</li>
                <li>• Format: JPG, PNG, or WebP</li>
                <li>• Size: Under 2MB for fast loading</li>
                <li>• Dark or muted images work best with overlay text</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
