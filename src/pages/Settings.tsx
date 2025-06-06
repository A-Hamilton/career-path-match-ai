
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Settings as SettingsIcon, Bell, Lock, CreditCard, User, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Settings = () => {
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    pushNotifications: false,
    weeklyDigest: true,
    jobMatches: true,
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: true,
    shareAnalytics: false,
  });

  const { toast } = useToast();

  const handleSaveSettings = () => {
    toast({
      title: "Settings Saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center space-x-2 mb-8">
            <SettingsIcon className="h-6 w-6" />
            <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          </div>

          <Tabs defaultValue="account" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="account">Account</TabsTrigger>
              <TabsTrigger value="notifications">Notifications</TabsTrigger>
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
              <TabsTrigger value="subscription">Subscription</TabsTrigger>
              <TabsTrigger value="danger">Danger Zone</TabsTrigger>
            </TabsList>

            <TabsContent value="account">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Account Settings
                  </CardTitle>
                  <CardDescription>
                    Manage your account information and preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input id="firstName" defaultValue="John" />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input id="lastName" defaultValue="Doe" />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input id="email" type="email" defaultValue="john.doe@example.com" />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input id="phone" defaultValue="+1 (555) 123-4567" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="timezone">Time Zone</Label>
                    <Input id="timezone" defaultValue="Pacific Standard Time (PST)" />
                  </div>
                  <Button onClick={handleSaveSettings}>Save Changes</Button>
                </CardContent>
              </Card>

              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Lock className="h-5 w-5 mr-2" />
                    Change Password
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input id="currentPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input id="newPassword" type="password" />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input id="confirmPassword" type="password" />
                  </div>
                  <Button>Update Password</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="notifications">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Notification Preferences
                  </CardTitle>
                  <CardDescription>
                    Choose how you want to be notified about updates and activities
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Email Alerts</h3>
                      <p className="text-sm text-gray-600">Receive email notifications for important updates</p>
                    </div>
                    <Switch
                      checked={notifications.emailAlerts}
                      onCheckedChange={(checked) => setNotifications({...notifications, emailAlerts: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Push Notifications</h3>
                      <p className="text-sm text-gray-600">Get instant notifications on your device</p>
                    </div>
                    <Switch
                      checked={notifications.pushNotifications}
                      onCheckedChange={(checked) => setNotifications({...notifications, pushNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Weekly Digest</h3>
                      <p className="text-sm text-gray-600">Summary of your activity and recommendations</p>
                    </div>
                    <Switch
                      checked={notifications.weeklyDigest}
                      onCheckedChange={(checked) => setNotifications({...notifications, weeklyDigest: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Job Match Alerts</h3>
                      <p className="text-sm text-gray-600">Notifications when new jobs match your profile</p>
                    </div>
                    <Switch
                      checked={notifications.jobMatches}
                      onCheckedChange={(checked) => setNotifications({...notifications, jobMatches: checked})}
                    />
                  </div>
                  <Button onClick={handleSaveSettings}>Save Preferences</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="privacy">
              <Card>
                <CardHeader>
                  <CardTitle>Privacy & Data</CardTitle>
                  <CardDescription>
                    Control your privacy settings and data sharing preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Profile Visibility</h3>
                      <p className="text-sm text-gray-600">Allow recruiters to find your profile</p>
                    </div>
                    <Switch
                      checked={privacy.profileVisibility}
                      onCheckedChange={(checked) => setPrivacy({...privacy, profileVisibility: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Share Analytics</h3>
                      <p className="text-sm text-gray-600">Help improve our service with anonymous usage data</p>
                    </div>
                    <Switch
                      checked={privacy.shareAnalytics}
                      onCheckedChange={(checked) => setPrivacy({...privacy, shareAnalytics: checked})}
                    />
                  </div>
                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Data Export</h3>
                    <p className="text-sm text-gray-600 mb-4">Download a copy of your data</p>
                    <Button variant="outline">Request Data Export</Button>
                  </div>
                  <Button onClick={handleSaveSettings}>Save Privacy Settings</Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="subscription">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Subscription & Billing
                  </CardTitle>
                  <CardDescription>
                    Manage your subscription and billing information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">Free Plan</h3>
                        <p className="text-gray-600">Basic resume analysis and job search</p>
                      </div>
                      <Badge variant="secondary">Current Plan</Badge>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>• 3 resume analyses per month</li>
                      <li>• Basic job search</li>
                      <li>• Career path exploration</li>
                    </ul>
                  </div>

                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">Pro Plan</h3>
                        <p className="text-gray-600">Advanced features for serious job seekers</p>
                        <p className="text-2xl font-bold text-green-600 mt-2">$19/month</p>
                      </div>
                    </div>
                    <ul className="text-sm text-gray-600 space-y-1 mb-4">
                      <li>• Unlimited resume analyses</li>
                      <li>• AI-powered resume optimization</li>
                      <li>• Priority job matching</li>
                      <li>• Cover letter generator</li>
                      <li>• Interview preparation tools</li>
                    </ul>
                    <Button>Upgrade to Pro</Button>
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Billing History</h3>
                    <p className="text-sm text-gray-600">No billing history available</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="danger">
              <Card className="border-red-200">
                <CardHeader>
                  <CardTitle className="flex items-center text-red-600">
                    <Trash2 className="h-5 w-5 mr-2" />
                    Danger Zone
                  </CardTitle>
                  <CardDescription>
                    Irreversible and destructive actions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border border-red-200 rounded-lg p-4">
                    <h3 className="font-medium text-red-600 mb-2">Delete Account</h3>
                    <p className="text-sm text-gray-600 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default Settings;
