import Link from 'next/link';
import { Home, FileText, Users, Truck, FolderOpen, BarChart3, Settings } from 'lucide-react';

const Sidebar = () => {
  const menuItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Applications', href: '/applications', icon: FileText },
    { name: 'Agents', href: '/agents', icon: Users },
    { name: 'Carriers', href: '/carriers', icon: Truck },
    { name: 'Documents', href: '/documents', icon: FolderOpen },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white shadow-lg h-screen fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-blue-600">Admin Panel</h1>
      </div>
      <nav className="mt-6">
        <ul>
          {menuItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className="flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;