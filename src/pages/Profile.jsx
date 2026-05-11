import React from "react";
import { Link } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { User, Mail, Loader2, RefreshCw, ClipboardList } from "lucide-react";
import useAuthStore from "../store/authStore";

const Profile = () => {
  const { isHydrated } = useAuthStore();
  const { data: user, isLoading, isError, refetch } = useProfile();

  // Wait for auth store to hydrate before rendering
  if (!isHydrated) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <p className="text-red-500 mb-4">Failed to load profile.</p>
        <Button variant="outline" onClick={() => refetch()} className="flex items-center gap-2 mx-auto">
          <RefreshCw size={15} /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Card className="dark:bg-gray-800 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-2xl dark:text-white">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar */}
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <User size={36} className="text-blue-500" />
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <User size={18} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Username</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.username || "—"}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <Mail size={18} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Email</p>
              <p className="font-semibold text-gray-800 dark:text-gray-200">{user?.email || "—"}</p>
            </div>
          </div>

          {/* Quick links */}
          <div className="flex gap-3 pt-2">
            <Link to="/orders" className="flex-1">
              <Button variant="outline" className="w-full flex items-center gap-2">
                <ClipboardList size={15} /> My Orders
              </Button>
            </Link>
            <Link to="/cart" className="flex-1">
              <Button variant="outline" className="w-full">Cart</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
