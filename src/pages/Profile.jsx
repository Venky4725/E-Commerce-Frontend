import React, { useEffect, useState } from "react";
import api from "../api/api";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { User, Mail, Loader2 } from "lucide-react";

const Profile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get("/me");
        setUser(res.data);
      } catch (err) {
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 size={32} className="animate-spin text-blue-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center text-red-500">
        {error}
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">My Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Avatar placeholder */}
          <div className="flex justify-center mb-4">
            <div className="h-20 w-20 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={36} className="text-blue-500" />
            </div>
          </div>

          {/* Username */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <User size={18} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Username</p>
              <p className="font-semibold text-gray-800">{user?.username || "—"}</p>
            </div>
          </div>

          {/* Email */}
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
            <Mail size={18} className="text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="font-semibold text-gray-800">{user?.email || "—"}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
