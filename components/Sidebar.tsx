"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, Users, Truck, FolderOpen, BarChart3, Settings } from "lucide-react";

const Sidebar = () => {
  const pathname = usePathname();

  const menuItems = [
    { name: "Dashboard", href: "/dashboard", icon: Home },
    { name: "Applications", href: "/applications", icon: FileText },
    { name: "Agents", href: "/agents", icon: Users },
    { name: "Carriers", href: "/carriers", icon: Truck },
    { name: "Documents", href: "/documents", icon: FolderOpen },
    { name: "Reports", href: "/reports", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const isItemActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);

  return (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-blue-600">Admin Panel</h1>
      </div>
      <nav className="mt-4 px-3">
        <ul className="space-y-1">
          {menuItems.map((item) => (
            <li key={item.name}>
              {(() => {
                const active = isItemActive(item.href);
                return (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`group flex items-center rounded-lg px-3 py-2.5 text-sm transition-colors ${
                      active
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                    }`}
                  >
                    <item.icon
                      className={`w-5 h-5 mr-3 transition-colors ${
                        active ? "text-blue-600" : "text-gray-500 group-hover:text-blue-600"
                      }`}
                    />
                    <span>{item.name}</span>
                    {active && <span className="ml-auto h-2 w-2 rounded-full bg-blue-600" />}
                  </Link>
                );
              })()}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;
