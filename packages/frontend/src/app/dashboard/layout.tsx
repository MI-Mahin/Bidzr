'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, logout } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isLoading, isAuthenticated, router]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const navItems = getNavItems(user?.role || 'player');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
        {/* Logo */}
        <div className="flex items-center space-x-2 px-6 py-4 border-b">
          <span className="text-2xl">🏏</span>
          <span className="text-xl font-bold text-green-700 dark:text-green-400">
            Bidzr
          </span>
        </div>

        {/* Navigation */}
        <nav className="px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
              <span className="text-lg">
                {user?.name?.charAt(0).toUpperCase() || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {user?.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                {user?.role?.replace('_', ' ')}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleLogout}
          >
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}

function getNavItems(role: string) {
  const commonItems = [
    { href: '/dashboard', label: 'Overview', icon: '📊' },
    { href: '/auctions', label: 'Auctions', icon: '🏏' },
  ];

  const roleItems: Record<string, Array<{ href: string; label: string; icon: string }>> = {
    admin: [
      ...commonItems,
      { href: '/dashboard/admin/create-auction', label: 'Create Auction', icon: '➕' },
      { href: '/dashboard/admin/manage', label: 'Manage Auctions', icon: '⚙️' },
    ],
    team_owner: [
      ...commonItems,
      { href: '/dashboard/team/my-teams', label: 'My Teams', icon: '🏆' },
      { href: '/dashboard/team/register', label: 'Register Team', icon: '📝' },
    ],
    player: [
      ...commonItems,
      { href: '/dashboard/player/registrations', label: 'My Registrations', icon: '📋' },
      { href: '/dashboard/player/register', label: 'Register for Auction', icon: '✍️' },
    ],
  };

  return roleItems[role] || commonItems;
}
