import React, { useState, memo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { User, Mail, Loader2, RefreshCw, ClipboardList, Edit2, Save, X, Trash2, Phone, MapPin, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "../components/ui/toast";
import useAuthStore from "../store/authStore";
import api from "../api/api";
import { extractErrorMessage } from "../lib/errorUtils";

const Profile = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isHydrated, logout } = useAuthStore();
  const { data: user, isLoading, isError, refetch } = useProfile();
  
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    phone: "",
    address: "",
  });

  // Initialize form data when user loads
  React.useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      });
    }
  }, [user]);

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data) => {
      // Try PUT first, fallback to PATCH if 405
      try {
        const res = await api.put("/me", data);
        return res.data;
      } catch (err) {
        if (err.response?.status === 405) {
          const res = await api.patch("/me", data);
          return res.data;
        }
        throw err;
      }
    },
    onSuccess: (updatedUser) => {
      // 1. Update Zustand auth store with new user data
      const { setAuth, token } = useAuthStore.getState();
      setAuth(token, updatedUser);
      
      // 2. Invalidate session query to refetch
      queryClient.invalidateQueries({ queryKey: ["session"] });
      
      // 3. Show success toast
      toast({ 
        title: "Profile updated successfully",
        description: "Your changes have been saved."
      });
      
      // 4. Exit edit mode
      setIsEditing(false);
    },
    onError: (err) => {
      console.error("❌ Profile update error:", err);
      console.error("Error response:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      const errorMsg = extractErrorMessage(err, "Failed to update profile");
      toast({ 
        title: "Update failed", 
        description: errorMsg, 
        variant: "destructive" 
      });
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete("/me"),
    onSuccess: () => {
      toast({ title: "Account deleted successfully" });
      logout();
      queryClient.clear();
      navigate("/");
    },
    onError: (err) => {
      const errorMsg = extractErrorMessage(err, "Failed to delete account");
      toast({ title: "Delete failed", description: errorMsg, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      username: user?.username || "",
      email: user?.email || "",
      phone: user?.phone || "",
      address: user?.address || "",
    });
    setIsEditing(false);
  };

  const handleDeleteAccount = () => {
    deleteMutation.mutate();
  };

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
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-2">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-2xl dark:text-white">My Profile</CardTitle>
              {!isEditing ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2"
                >
                  <Edit2 size={14} /> Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    className="flex items-center gap-2"
                  >
                    <X size={14} /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Save size={14} />
                    )}
                    Save
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <User size={48} className="text-white" />
                </div>
              </div>

              {/* Username */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User size={16} /> Username
                </label>
                {isEditing ? (
                  <Input
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter username"
                    className="dark:bg-gray-700 dark:border-gray-600"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.username || "—"}
                    </p>
                  </div>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Mail size={16} /> Email
                </label>
                {isEditing ? (
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter email"
                    className="dark:bg-gray-700 dark:border-gray-600"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.email || "—"}
                    </p>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Phone size={16} /> Phone
                </label>
                {isEditing ? (
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="Enter phone number"
                    className="dark:bg-gray-700 dark:border-gray-600"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.phone || "Not provided"}
                    </p>
                  </div>
                )}
              </div>

              {/* Address */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <MapPin size={16} /> Address
                </label>
                {isEditing ? (
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Enter address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {user?.address || "Not provided"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="mt-6 border-red-200 dark:border-red-900 dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="text-lg text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={20} /> Danger Zone
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Delete Account</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <p className="text-sm text-orange-600 dark:text-orange-400 mt-2">
                    ⚠️ Pending orders will be cancelled automatically.
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setShowDeleteModal(true)}
                  className="shrink-0"
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link to="/orders" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList size={16} className="mr-2" /> My Orders
                </Button>
              </Link>
              <Link to="/cart" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList size={16} className="mr-2" /> Shopping Cart
                </Button>
              </Link>
              <Link to="/" className="block">
                <Button variant="outline" className="w-full justify-start">
                  <ClipboardList size={16} className="mr-2" /> Browse Products
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-lg dark:text-white">Account Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-gray-500 dark:text-gray-400">Member Since</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString("en-IN", { 
                        month: "long", 
                        year: "numeric" 
                      })
                    : "—"}
                </p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400">Account Type</p>
                <p className="font-medium text-gray-900 dark:text-white">
                  {user?.is_admin ? "Admin" : "Customer"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full dark:bg-gray-800 dark:border-gray-700">
            <CardHeader>
              <CardTitle className="text-xl text-red-600 dark:text-red-400 flex items-center gap-2">
                <AlertTriangle size={24} /> Delete Account?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 dark:text-gray-300">
                Are you sure you want to delete your account? This action cannot be undone.
              </p>
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                <p className="text-sm text-orange-800 dark:text-orange-300">
                  <strong>Warning:</strong> All your data will be permanently deleted, including:
                </p>
                <ul className="text-sm text-orange-700 dark:text-orange-400 mt-2 ml-4 list-disc">
                  <li>Profile information</li>
                  <li>Order history</li>
                  <li>Pending orders (will be cancelled)</li>
                  <li>Shopping cart</li>
                </ul>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDeleteAccount}
                  className="flex-1"
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} className="mr-2" />
                      Delete Account
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

export default React.memo(Profile);
