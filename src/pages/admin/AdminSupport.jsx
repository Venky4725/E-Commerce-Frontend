import React from "react";
import AdminLiveChat from "../../components/admin/AdminLiveChat";

export default function AdminSupport() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Support Center</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Realtime customer support chat</p>
      <AdminLiveChat />
    </div>
  );
}

