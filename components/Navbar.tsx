"use client";

import { Bell, LogOut, User } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";

const Navbar = ({ title }: { title: string }) => {
  const { user, signOut } = useAuth();
  const label = user?.email ?? "Admin User";

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between fixed top-0 left-64 right-0 z-10">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-gray-700">{label}</span>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 transition hover:bg-gray-100"
          onClick={() => {
            void signOut();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default Navbar;
