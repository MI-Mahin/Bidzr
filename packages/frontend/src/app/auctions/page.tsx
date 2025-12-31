'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { formatCurrency, formatDate, getAuctionStatusColor, getRelativeTime } from '@/lib/utils';
import { Gavel, ArrowLeft, Radio, Users, UserRound } from 'lucide-react';
import { CricketIcon } from '@/components/icons/sports-icons';

export default function AuctionsPage() {
  const { accessToken, user } = useAuthStore();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [filteredAuctions, setFilteredAuctions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    const fetchAuctions = async () => {
      try {
        const response: any = await api.getAuctions(accessToken || undefined);
        setAuctions(response.data?.auctions || []);
        setFilteredAuctions(response.data?.auctions || []);
      } catch (error) {
        console.error('Failed to fetch auctions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuctions();
  }, [accessToken]);

  useEffect(() => {
    let filtered = auctions;

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter((a) => a.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (a) =>
          a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          a.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredAuctions(filtered);
  }, [searchQuery, statusFilter, auctions]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Gavel className="w-8 h-8 text-green-600" /> Auctions
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Browse and join sports auctions
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/">
                <Button variant="outline">← Home</Button>
              </Link>
              {user ? (
                <Link href="/dashboard">
                  <Button className="gradient-cricket text-white">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/auth/login">
                  <Button className="gradient-cricket text-white">Login</Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="flex-1">
            <Input
              placeholder="Search auctions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="flex gap-2">
            {['all', 'upcoming', 'live', 'completed'].map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                onClick={() => setStatusFilter(status)}
                className={statusFilter === status ? 'gradient-cricket text-white' : ''}
                size="sm"
              >
                {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Live Auctions Banner */}
        {filteredAuctions.filter((a) => a.status === 'live').length > 0 && (
          <Card className="border-red-500 bg-red-50 dark:bg-red-900/20 mb-8">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Radio className="w-6 h-6 text-red-600 animate-pulse" />
                  <div>
                    <h3 className="font-semibold text-red-700 dark:text-red-400">
                      Live Auctions Happening Now!
                    </h3>
                    <p className="text-sm text-red-600 dark:text-red-300">
                      {filteredAuctions.filter((a) => a.status === 'live').length} auction(s) in progress
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Auctions Grid */}
        {filteredAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAuctions.map((auction) => (
              <Card key={auction._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div
                  className={`h-2 ${
                    auction.status === 'live'
                      ? 'bg-red-500'
                      : auction.status === 'upcoming'
                      ? 'bg-blue-500'
                      : 'bg-gray-400'
                  }`}
                />
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
                        <CricketIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{auction.name}</CardTitle>
                        <CardDescription>{formatDate(auction.scheduledDate)}</CardDescription>
                      </div>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getAuctionStatusColor(
                        auction.status
                      )}`}
                    >
                      {auction.status}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500">Team Budget</p>
                      <p className="font-semibold text-green-600">
                        {formatCurrency(auction.teamBudget)}
                      </p>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-500">Min Increment</p>
                      <p className="font-semibold">
                        {formatCurrency(auction.minBidIncrement)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                    <span className="flex items-center gap-1"><Users className="w-4 h-4" /> {auction.registeredTeams?.length || 0}/{auction.maxTeams} teams</span>
                    <span className="flex items-center gap-1"><UserRound className="w-4 h-4" /> {auction.registeredPlayers?.length || 0} players</span>
                  </div>

                  {auction.status === 'upcoming' && (
                    <p className="text-sm text-blue-600 mb-4">
                      Starts {getRelativeTime(auction.scheduledDate)}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Link href={`/auctions/${auction._id}`} className="flex-1">
                      <Button variant="outline" className="w-full" size="sm">
                        View Details
                      </Button>
                    </Link>
                    {auction.status === 'live' && user?.role === 'team_owner' && (
                      <Link href={`/auction/${auction._id}`} className="flex-1">
                        <Button className="w-full bg-red-600 hover:bg-red-700 text-white" size="sm">
                          <Radio className="w-4 h-4 mr-1 animate-pulse" /> Join Live
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="mb-4 flex justify-center">
              <CricketIcon className="w-16 h-16 text-gray-300" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No auctions found
            </h3>
            <p className="text-gray-500">
              {searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters'
                : 'Check back later for upcoming auctions'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
