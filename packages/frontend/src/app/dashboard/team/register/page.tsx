'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import api from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';

const registerTeamSchema = z.object({
  auctionId: z.string().min(1, 'Please select an auction'),
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  shortName: z.string().min(2, 'Short name must be at least 2 characters').max(5, 'Short name must be at most 5 characters'),
  auctionPassword: z.string().min(1, 'Auction password is required'),
});

type RegisterTeamForm = z.infer<typeof registerTeamSchema>;

export default function RegisterTeamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { accessToken } = useAuthStore();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<RegisterTeamForm>({
    resolver: zodResolver(registerTeamSchema),
  });

  const watchAuctionId = watch('auctionId');

  useEffect(() => {
    const fetchAuctions = async () => {
      if (!accessToken) return;

      try {
        const response: any = await api.getAuctions(accessToken);
        const auctionList = response.data?.auctions || [];
        // Filter to only upcoming auctions
        const upcomingAuctions = auctionList.filter((a: any) => a.status === 'upcoming');
        setAuctions(upcomingAuctions);
      } catch (error) {
        console.error('Failed to fetch auctions:', error);
      } finally {
        setIsLoadingAuctions(false);
      }
    };

    fetchAuctions();
  }, [accessToken]);

  useEffect(() => {
    if (watchAuctionId) {
      const auction = auctions.find((a) => a._id === watchAuctionId);
      setSelectedAuction(auction);
    }
  }, [watchAuctionId, auctions]);

  const onSubmit = async (data: RegisterTeamForm) => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      await api.registerTeam(
        {
          name: data.name,
          shortName: data.shortName,
          auctionPassword: data.auctionPassword,
        },
        data.auctionId,
        accessToken
      );

      toast({
        title: 'Team Registered! 🎉',
        description: 'Your team has been registered for the auction.',
      });

      router.push('/dashboard/team');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.response?.data?.message || 'Failed to register team',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Register for Auction
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Join an auction by registering your team
        </p>
      </div>

      {isLoadingAuctions ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : auctions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="text-6xl mb-4">📅</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Upcoming Auctions
              </h3>
              <p className="text-gray-500 mb-6">
                There are no auctions open for registration at the moment.
                Check back later!
              </p>
              <Button variant="outline" onClick={() => router.back()}>
                Go Back
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Select Auction */}
          <Card>
            <CardHeader>
              <CardTitle>Select Auction</CardTitle>
              <CardDescription>Choose an upcoming auction to join</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4">
                {auctions.map((auction) => (
                  <label
                    key={auction._id}
                    className={`flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all ${
                      watchAuctionId === auction._id
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      value={auction._id}
                      {...register('auctionId')}
                      className="sr-only"
                    />
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <span className="text-2xl">🏏</span>
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {auction.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          📅 {formatDate(auction.scheduledDate)} • 💰{' '}
                          {formatCurrency(auction.teamBudget)} budget
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-green-600">
                        {auction.registeredTeams?.length || 0}/{auction.maxTeams} teams
                      </span>
                    </div>
                  </label>
                ))}
              </div>
              {errors.auctionId && (
                <p className="text-sm text-red-500 mt-2">{errors.auctionId.message}</p>
              )}
            </CardContent>
          </Card>

          {/* Team Details */}
          {selectedAuction && (
            <Card>
              <CardHeader>
                <CardTitle>Team Details</CardTitle>
                <CardDescription>Enter your team information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="name">Team Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mumbai Indians"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="shortName">Short Name *</Label>
                  <Input
                    id="shortName"
                    placeholder="e.g., MI"
                    maxLength={5}
                    {...register('shortName')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    2-5 characters for display in auction room
                  </p>
                  {errors.shortName && (
                    <p className="text-sm text-red-500 mt-1">{errors.shortName.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="auctionPassword">Auction Password *</Label>
                  <Input
                    id="auctionPassword"
                    type="password"
                    placeholder="Enter the auction password"
                    {...register('auctionPassword')}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Get this password from the auction organizer
                  </p>
                  {errors.auctionPassword && (
                    <p className="text-sm text-red-500 mt-1">{errors.auctionPassword.message}</p>
                  )}
                </div>

                {/* Auction Info Summary */}
                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-3">
                    Auction Details
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Team Budget:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(selectedAuction.teamBudget)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Min Bid Increment:</span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(selectedAuction.minBidIncrement)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Players per Team:</span>
                      <span className="ml-2 font-medium">
                        {selectedAuction.playersPerTeam?.min} - {selectedAuction.playersPerTeam?.max}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Scheduled:</span>
                      <span className="ml-2 font-medium">
                        {formatDate(selectedAuction.scheduledDate)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-cricket text-white"
              disabled={isLoading || !selectedAuction}
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Registering...
                </>
              ) : (
                <>🏆 Register Team</>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
