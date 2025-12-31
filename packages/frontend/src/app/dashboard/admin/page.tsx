'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { formatCurrency, formatDate, getAuctionStatusColor } from '@/lib/utils';

export default function AdminDashboardPage() {
  const { accessToken } = useAuthStore();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    live: 0,
    upcoming: 0,
    completed: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchAuctions = async () => {
      if (!accessToken) return;

      try {
        const response: any = await api.getAuctions(accessToken);
        const auctionList = response.data?.auctions || [];
        
        setAuctions(auctionList);
        setStats({
          total: auctionList.length,
          live: auctionList.filter((a: any) => a.status === 'live').length,
          upcoming: auctionList.filter((a: any) => a.status === 'upcoming').length,
          completed: auctionList.filter((a: any) => a.status === 'completed').length,
        });
      } catch (error) {
        console.error('Failed to fetch auctions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctions();
  }, [accessToken]);

  const handleStartAuction = async (auctionId: string) => {
    if (!accessToken) return;
    
    try {
      await api.startAuction(auctionId, accessToken);
      // Refresh auctions
      const response: any = await api.getAuctions(accessToken);
      setAuctions(response.data?.auctions || []);
    } catch (error) {
      console.error('Failed to start auction:', error);
    }
  };

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your auctions and monitor activity
          </p>
        </div>
        <Link href="/dashboard/admin/create-auction">
          <Button className="gradient-cricket text-white">
            ➕ Create Auction
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Auctions"
          value={stats.total}
          icon="📊"
          color="bg-gray-100 text-gray-600"
        />
        <StatCard
          title="Live Now"
          value={stats.live}
          icon="🔴"
          color="bg-red-100 text-red-600"
        />
        <StatCard
          title="Upcoming"
          value={stats.upcoming}
          icon="📅"
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Completed"
          value={stats.completed}
          icon="✅"
          color="bg-green-100 text-green-600"
        />
      </div>

      {/* Auctions List */}
      <Card>
        <CardHeader>
          <CardTitle>Your Auctions</CardTitle>
          <CardDescription>All auctions created by you</CardDescription>
        </CardHeader>
        <CardContent>
          {auctions.length > 0 ? (
            <div className="space-y-4">
              {auctions.map((auction) => (
                <div
                  key={auction._id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <span className="text-2xl">🏏</span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {auction.name}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-gray-500">
                        <span>💰 {formatCurrency(auction.teamBudget)}</span>
                        <span>📅 {formatDate(auction.scheduledDate)}</span>
                        <span>
                          👥 {auction.registeredTeams?.length || 0} teams
                        </span>
                        <span>
                          🏃 {auction.registeredPlayers?.length || 0} players
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getAuctionStatusColor(
                        auction.status
                      )}`}
                    >
                      {auction.status}
                    </span>
                    <div className="flex space-x-2">
                      {auction.status === 'upcoming' && (
                        <Button
                          size="sm"
                          onClick={() => handleStartAuction(auction._id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          ▶️ Start
                        </Button>
                      )}
                      {auction.status === 'live' && (
                        <Link href={`/auction/${auction._id}`}>
                          <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                            🔴 Join Live
                          </Button>
                        </Link>
                      )}
                      <Link href={`/dashboard/admin/auctions/${auction._id}`}>
                        <Button size="sm" variant="outline">
                          ⚙️ Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏏</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No auctions yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first auction to get started
              </p>
              <Link href="/dashboard/admin/create-auction">
                <Button className="gradient-cricket text-white">
                  Create Your First Auction
                </Button>
              </Link>
            </div>
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
  color,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
}) {
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
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${color}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
