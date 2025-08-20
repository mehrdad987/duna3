import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "./ProfileTab";
import { InfoTab } from "./InfoTab";
import { FriendsTab } from "./FriendsTab";
import { User, Info, Users } from "lucide-react";

export function ProfileHubTab() {
  return (
    <div className="space-y-4">
      <Card className="overflow-hidden bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border-emerald-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-emerald-700 dark:text-emerald-300 text-base">Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="text-xs"><User className="w-4 h-4 mr-1" /> Profile</TabsTrigger>
              <TabsTrigger value="info" className="text-xs"><Info className="w-4 h-4 mr-1" /> Info</TabsTrigger>
              <TabsTrigger value="friends" className="text-xs"><Users className="w-4 h-4 mr-1" /> Friends</TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileTab />
            </TabsContent>
            <TabsContent value="info">
              <InfoTab />
            </TabsContent>
            <TabsContent value="friends">
              <FriendsTab />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}


