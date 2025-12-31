'use client';

import { useEffect, useState, ReactNode } from 'react';
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
import { Calendar, Target, Zap, Shield, Loader2 } from 'lucide-react';
import { CricketIcon } from '@/components/icons/sports-icons';

const registerPlayerSchema = z.object({
  auctionId: z.string().min(1, 'Please select an auction'),
  playerRole: z.string().min(1, 'Please select a role'),
  basePriceTier: z.string().min(1, 'Please select a base price'),
});

type RegisterPlayerForm = z.infer<typeof registerPlayerSchema>;

const cricketRoles: { id: string; name: string; icon: ReactNode; description: string }[] = [
  { id: 'batsman', name: 'Batsman', icon: <CricketIcon className="w-8 h-8" />, description: 'Primary run scorer' },
  { id: 'bowler', name: 'Bowler', icon: <Target className="w-8 h-8" />, description: 'Primary wicket taker' },
  { id: 'all-rounder', name: 'All-rounder', icon: <Zap className="w-8 h-8" />, description: 'Batting + Bowling' },
  { id: 'wicket-keeper', name: 'Wicket Keeper', icon: <Shield className="w-8 h-8" />, description: 'Keeper + Batsman' },
];

export default function RegisterPlayerPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { accessToken, user } = useAuthStore();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [selectedAuction, setSelectedAuction] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingAuctions, setIsLoadingAuctions] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<RegisterPlayerForm>({
    resolver: zodResolver(registerPlayerSchema),
  });

  const watchAuctionId = watch('auctionId');
  const watchPlayerRole = watch('playerRole');
  const watchBasePriceTier = watch('basePriceTier');

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

  const onSubmit = async (data: RegisterPlayerForm) => {
    if (!accessToken || !selectedAuction) return;

    const selectedTier = selectedAuction.basePriceTiers?.find(
      (t: any) => t.tier === data.basePriceTier
    );

    setIsLoading(true);
    try {
      await api.registerPlayer(
        {
          playerRole: data.playerRole,
          basePrice: selectedTier?.price || 200000,
        },
        data.auctionId,
        accessToken
      );

      toast({
        title: 'Registration Submitted!',
        description: 'Your registration is pending approval.',
      });

      router.push('/dashboard/player');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.response?.data?.message || 'Failed to register for auction',
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
          Join an auction as a player
        </p>
      </div>

      {/* Player Card Preview */}
      <Card className="gradient-cricket text-white overflow-hidden">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                {cricketRoles.find((r) => r.id === watchPlayerRole)?.icon || <CricketIcon className="w-8 h-8" />}
              </div>
              <div>
                <h2 className="text-xl font-bold">{user?.name}</h2>
                <p className="text-green-100">
                  {cricketRoles.find((r) => r.id === watchPlayerRole)?.name || 'Select Role'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-green-100">Base Price</p>
              <p className="text-2xl font-bold">
                {watchBasePriceTier && selectedAuction
                  ? formatCurrency(
                      selectedAuction.basePriceTiers?.find(
                        (t: any) => t.tier === watchBasePriceTier
                      )?.price || 0
                    )
                  : '₹--'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoadingAuctions ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : auctions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <div className="mb-4 flex justify-center">
                <Calendar className="w-16 h-16 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                No Upcoming Auctions
              </h3>
              <p className="text-gray-500 mb-6">
                There are no auctions open for registration at the moment.
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
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white">
                        <CricketIcon className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {auction.name}
                        </h3>
                        <p className="text-sm text-gray-500 flex items-center gap-1">
                          <Calendar className="w-4 h-4" /> {formatDate(auction.scheduledDate)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-green-600">
                        {auction.registeredPlayers?.length || 0} players
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

          {/* Select Role */}
          {selectedAuction && (
            <Card>
              <CardHeader>
                <CardTitle>Select Your Role</CardTitle>
                <CardDescription>Choose your primary playing position</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  {cricketRoles.map((role) => (
                    <label
                      key={role.id}
                      className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all ${
                        watchPlayerRole === role.id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        value={role.id}
                        {...register('playerRole')}
                        className="sr-only"
                      />
                      <div className="flex items-center space-x-3">
                        <span className="text-green-600">{role.icon}</span>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {role.name}
                          </h4>
                          <p className="text-xs text-gray-500">{role.description}</p>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.playerRole && (
                  <p className="text-sm text-red-500 mt-2">{errors.playerRole.message}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Select Base Price */}
          {selectedAuction && watchPlayerRole && (
            <Card>
              <CardHeader>
                <CardTitle>Select Base Price</CardTitle>
                <CardDescription>
                  Choose your starting price tier - bidding starts from here
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedAuction.basePriceTiers?.map((tier: any, index: number) => (
                    <label
                      key={tier.tier}
                      className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-all ${
                        watchBasePriceTier === tier.tier
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                      }`}
                    >
                      <input
                        type="radio"
                        value={tier.tier}
                        {...register('basePriceTier')}
                        className="sr-only"
                      />
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium mb-2 ${
                          index === 0
                            ? 'bg-purple-100 text-purple-700'
                            : index === 1
                            ? 'bg-yellow-100 text-yellow-700'
                            : index === 2
                            ? 'bg-gray-100 text-gray-700'
                            : index === 3
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {tier.tier}
                      </span>
                      <span className="text-xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(tier.price)}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.basePriceTier && (
                  <p className="text-sm text-red-500 mt-2">{errors.basePriceTier.message}</p>
                )}
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
              disabled={isLoading || !selectedAuction || !watchPlayerRole || !watchBasePriceTier}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <CricketIcon className="w-4 h-4 mr-2" />
                  Submit Registration
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
