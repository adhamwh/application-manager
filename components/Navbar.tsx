"use client";

import { useState } from "react";
import { Search, Bell, User } from "lucide-react";
import { getStoredAccessToken, setStoredAccessToken } from "@/lib/apiClient";

const Navbar = ({ title }: { title: string }) => {
  const [token, setToken] = useState(() => getStoredAccessToken());
  const [isEditingToken, setIsEditingToken] = useState(false);

  return (
    <div className="bg-white shadow-sm border-b border-gray-200 px-6 py-4 flex items-center justify-between fixed top-0 left-64 right-0 z-10">
      <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
      <div className="flex items-center space-x-4">
        <div className="flex items-center gap-2">
          {isEditingToken ? (
            <>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  placeholder="Paste Supabase access token"
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                />
              </div>
              <button
                className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                onClick={() => {
                  setStoredAccessToken(token.trim());
                  setIsEditingToken(false);
                }}
              >
                Save Token
              </button>
            </>
          ) : (
            <button
              className="px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100"
              onClick={() => setIsEditingToken(true)}
            >
              {token ? "Update Token" : "Set Access Token"}
            </button>
          )}
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100">
          <Bell className="w-5 h-5 text-gray-600" />
        </button>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm text-gray-700">Admin User</span>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
