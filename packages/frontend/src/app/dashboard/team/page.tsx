'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { formatCurrency, formatDate, getAuctionStatusColor } from '@/lib/utils';
import { Trophy, Users, Wallet, Radio, FileText } from 'lucide-react';

export default function TeamDashboardPage() {
  const { accessToken } = useAuthStore();
  const [teams, setTeams] = useState<any[]>([]);
  const [liveAuctions, setLiveAuctions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const [teamsResponse, auctionsResponse] = await Promise.all([
          api.getMyTeams(accessToken),
          api.getAuctions(accessToken),
        ]) as [any, any];

        setTeams(teamsResponse.data?.teams || []);
        const allAuctions = auctionsResponse.data?.auctions || [];
        setLiveAuctions(allAuctions.filter((a: any) => a.status === 'live'));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [accessToken]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const totalSpent = teams.reduce((acc, team) => acc + (team.totalSpent || 0), 0);
  const totalPlayers = teams.reduce((acc, team) => acc + (team.players?.length || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Team Owner Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage your teams and participate in auctions
          </p>
        </div>
        <Link href="/dashboard/team/register">
          <Button className="gradient-cricket text-white">
            <FileText className="w-4 h-4 mr-2" /> Register for Auction
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="My Teams"
          value={teams.length}
          icon={<Trophy className="w-6 h-6" />}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Total Players"
          value={totalPlayers}
          icon={<Users className="w-6 h-6" />}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Total Spent"
          value={`₹${(totalSpent / 10000000).toFixed(2)} Cr`}
          icon={<Wallet className="w-6 h-6" />}
          color="bg-green-100 text-green-600"
          isText
        />
        <StatCard
          title="Live Auctions"
          value={liveAuctions.length}
          icon={<Radio className="w-6 h-6" />}
          color="bg-red-100 text-red-600"
        />
      </div>

      {/* Live Auctions Alert */}
      {liveAuctions.length > 0 && (
        <Card className="border-red-500 bg-red-50 dark:bg-red-900/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Radio className="w-6 h-6 text-red-600 animate-pulse" />
                <div>
                  <h3 className="font-semibold text-red-700 dark:text-red-400">
                    Live Auctions Available!
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-300">
                    {liveAuctions.length} auction(s) are currently live. Join now to bid!
                  </p>
                </div>
              </div>
              <Link href={`/auction/${liveAuctions[0]._id}`}>
                <Button className="bg-red-600 hover:bg-red-700 text-white">
                  Join Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* My Teams */}
      <Card>
        <CardHeader>
          <CardTitle>My Teams</CardTitle>
          <CardDescription>Teams you own across different auctions</CardDescription>
        </CardHeader>
        <CardContent>
          {teams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {teams.map((team) => (
                <div
                  key={team._id}
                  className="p-4 rounded-lg border bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-xl">
                        {team.name?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {team.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {team.auction?.name || 'Unknown Auction'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getAuctionStatusColor(
                        team.auction?.status || 'upcoming'
                      )}`}
                    >
                      {team.auction?.status || 'upcoming'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500">Budget Left</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(team.budget || 0)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500">Spent</p>
                      <p className="font-semibold text-orange-600">
                        {formatCurrency(team.totalSpent || 0)}
                      </p>
                    </div>
                    <div className="text-center p-2 bg-white dark:bg-gray-700 rounded-lg">
                      <p className="text-xs text-gray-500">Players</p>
                      <p className="font-semibold text-blue-600">
                        {team.players?.length || 0}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/team/teams/${team._id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {team.auction?.status === 'live' && (
                      <Link href={`/auction/${team.auction._id}`} className="flex-1">
                        <Button className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm">
                          Enter Auction
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4 flex justify-center">
                <Trophy className="w-16 h-16 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No teams yet
              </h3>
              <p className="text-gray-500 mb-6">
                Register for an auction to create your team
              </p>
              <Link href="/dashboard/team/register">
                <Button className="gradient-cricket text-white">
                  Register for an Auction
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
  isText = false,
}: {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  color: string;
  isText?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
              {title}
            </p>
            <p className={`${isText ? 'text-xl' : 'text-3xl'} font-bold text-gray-900 dark:text-white mt-1`}>
              {value}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-full flex items-center justify-center ${color}`}
          >
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
