'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { formatCurrency, getAuctionStatusColor } from '@/lib/utils';
import { ClipboardList, Clock, CheckCircle2, Wallet, PenLine, Target } from 'lucide-react';
import { CricketIcon } from '@/components/icons/sports-icons';

export default function PlayerDashboardPage() {
  const { accessToken, user } = useAuthStore();
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!accessToken) return;

      try {
        const response: any = await api.getMyRegistrations(accessToken);
        setRegistrations(response.data?.registrations || []);
      } catch (error) {
        console.error('Failed to fetch registrations:', error);
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

  const soldRegistrations = registrations.filter((r) => r.status === 'sold');
  const pendingRegistrations = registrations.filter((r) => r.status === 'pending' || r.status === 'approved');
  const totalEarnings = soldRegistrations.reduce((acc, r) => acc + (r.soldPrice || 0), 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Player Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Register for auctions and track your status
          </p>
        </div>
        <Link href="/dashboard/player/register">
          <Button className="gradient-cricket text-white">
            <PenLine className="w-4 h-4 mr-2" /> Register for Auction
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Registrations"
          value={registrations.length}
          icon={<ClipboardList className="w-6 h-6" />}
          color="bg-blue-100 text-blue-600"
        />
        <StatCard
          title="Pending"
          value={pendingRegistrations.length}
          icon={<Clock className="w-6 h-6" />}
          color="bg-amber-100 text-amber-600"
        />
        <StatCard
          title="Sold"
          value={soldRegistrations.length}
          icon={<CheckCircle2 className="w-6 h-6" />}
          color="bg-green-100 text-green-600"
        />
        <StatCard
          title="Total Value"
          value={`₹${(totalEarnings / 100000).toFixed(1)} L`}
          icon={<Wallet className="w-6 h-6" />}
          color="bg-purple-100 text-purple-600"
          isText
        />
      </div>

      {/* Player Profile Card */}
      <Card className="gradient-cricket text-white">
        <CardContent className="py-6">
          <div className="flex items-center space-x-6">
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <CricketIcon className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{user?.name}</h2>
              <p className="text-green-100">{user?.email}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  Cricket Player
                </span>
                {soldRegistrations.length > 0 && (
                  <span className="px-3 py-1 bg-green-500 rounded-full text-sm flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Sold in {soldRegistrations.length} auction(s)
                  </span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registrations */}
      <Card>
        <CardHeader>
          <CardTitle>My Registrations</CardTitle>
          <CardDescription>Your auction registrations and status</CardDescription>
        </CardHeader>
        <CardContent>
          {registrations.length > 0 ? (
            <div className="space-y-4">
              {registrations.map((registration) => (
                <div
                  key={registration._id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
                      <CricketIcon className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {registration.auction?.name || 'Unknown Auction'}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1"><Target className="w-3.5 h-3.5" /> {registration.playerRole}</span>
                        <span className="flex items-center gap-1"><Wallet className="w-3.5 h-3.5" /> Base: {formatCurrency(registration.basePrice)}</span>
                        {registration.soldPrice && (
                          <span className="text-green-600 font-medium">
                            Sold: {formatCurrency(registration.soldPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <RegistrationStatusBadge status={registration.status} />
                    {registration.soldToTeam && (
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Sold to</p>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {registration.soldToTeam.name}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="mb-4 flex justify-center">
                <CricketIcon className="w-16 h-16 text-gray-300" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No registrations yet
              </h3>
              <p className="text-gray-500 mb-6">
                Register for an auction to participate in bidding
              </p>
              <Link href="/dashboard/player/register">
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

function RegistrationStatusBadge({ status }: { status: string }) {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pending' },
    approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
    rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejected' },
    sold: { bg: 'bg-green-100', text: 'text-green-700', label: 'Sold' },
    unsold: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Unsold' },
  };

  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
}
