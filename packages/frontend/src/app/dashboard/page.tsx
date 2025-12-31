'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { formatCurrency, getAuctionStatusColor } from '@/lib/utils';

export default function DashboardPage() {
  const { user, accessToken } = useAuthStore();
  const [stats, setStats] = useState({
    upcomingAuctions: 0,
    liveAuctions: 0,
    myTeams: 0,
    myRegistrations: 0,
  });
  const [recentAuctions, setRecentAuctions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!accessToken) return;

      try {
        const auctionsResponse: any = await api.getAuctions(accessToken);
        const auctions = auctionsResponse.data?.auctions || [];
        
        setRecentAuctions(auctions.slice(0, 5));
        setStats({
          upcomingAuctions: auctions.filter((a: any) => a.status === 'upcoming').length,
          liveAuctions: auctions.filter((a: any) => a.status === 'live').length,
          myTeams: 0,
          myRegistrations: 0,
        });

        // Fetch role-specific data
        if (user?.role === 'team_owner') {
          const teamsResponse: any = await api.getMyTeams(accessToken);
          setStats((prev) => ({
            ...prev,
            myTeams: teamsResponse.data?.teams?.length || 0,
          }));
        } else if (user?.role === 'player') {
          const registrationsResponse: any = await api.getMyRegistrations(accessToken);
          setStats((prev) => ({
            ...prev,
            myRegistrations: registrationsResponse.data?.registrations?.length || 0,
          }));
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [accessToken, user?.role]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {user?.name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Here&apos;s what&apos;s happening with your auctions today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Live Auctions"
          value={stats.liveAuctions}
          icon="🔴"
          description="Currently active"
          color="red"
        />
        <StatCard
          title="Upcoming Auctions"
          value={stats.upcomingAuctions}
          icon="📅"
          description="Scheduled soon"
          color="blue"
        />
        {user?.role === 'team_owner' && (
          <StatCard
            title="My Teams"
            value={stats.myTeams}
            icon="🏆"
            description="Registered teams"
            color="amber"
          />
        )}
        {user?.role === 'player' && (
          <StatCard
            title="My Registrations"
            value={stats.myRegistrations}
            icon="📋"
            description="Auction registrations"
            color="purple"
          />
        )}
        {user?.role === 'admin' && (
          <StatCard
            title="Total Auctions"
            value={stats.upcomingAuctions + stats.liveAuctions}
            icon="📊"
            description="Created by you"
            color="green"
          />
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Get started with these common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {user?.role === 'admin' && (
              <Link href="/dashboard/admin/create-auction">
                <Button className="gradient-cricket text-white">
                  ➕ Create New Auction
                </Button>
              </Link>
            )}
            {user?.role === 'team_owner' && (
              <Link href="/dashboard/team/register">
                <Button className="gradient-cricket text-white">
                  📝 Register for Auction
                </Button>
              </Link>
            )}
            {user?.role === 'player' && (
              <Link href="/dashboard/player/register">
                <Button className="gradient-cricket text-white">
                  ✍️ Join an Auction
                </Button>
              </Link>
            )}
            <Link href="/auctions">
              <Button variant="outline">🏏 Browse Auctions</Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Recent Auctions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Auctions</CardTitle>
          <CardDescription>Latest auctions on the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentAuctions.length > 0 ? (
            <div className="space-y-4">
              {recentAuctions.map((auction) => (
                <div
                  key={auction._id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                      <span>🏏</span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white">
                        {auction.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Budget: {formatCurrency(auction.teamBudget)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getAuctionStatusColor(
                        auction.status
                      )}`}
                    >
                      {auction.status}
                    </span>
                    <Link href={`/auctions/${auction._id}`}>
                      <Button size="sm" variant="outline">
                        View
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No auctions found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  description,
  color,
}: {
  title: string;
  value: number;
  icon: string;
  description: string;
  color: string;
}) {
  const colorClasses: Record<string, string> = {
    red: 'bg-red-100 text-red-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    green: 'bg-green-100 text-green-600',
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
              {value}
            </p>
            <p className="text-xs text-gray-500 mt-1">{description}</p>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${colorClasses[color]}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
