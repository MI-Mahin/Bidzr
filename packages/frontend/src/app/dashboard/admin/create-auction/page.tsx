'use client';

import { useState } from 'react';
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

const createAuctionSchema = z.object({
  name: z.string().min(3, 'Auction name must be at least 3 characters'),
  description: z.string().optional(),
  sportType: z.enum(['cricket', 'football', 'basketball', 'kabaddi']),
  teamBudget: z.number().min(100000, 'Budget must be at least ₹1,00,000'),
  minBidIncrement: z.number().min(10000, 'Min increment must be at least ₹10,000'),
  maxTeams: z.number().min(2, 'At least 2 teams required').max(20, 'Maximum 20 teams allowed'),
  playersPerTeam: z.object({
    min: z.number().min(1, 'At least 1 player required'),
    max: z.number().max(30, 'Maximum 30 players allowed'),
  }),
  basePriceTiers: z.array(
    z.object({
      tier: z.string(),
      price: z.number().min(1000),
    })
  ),
  scheduledDate: z.string(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type CreateAuctionForm = z.infer<typeof createAuctionSchema>;

const defaultBasePriceTiers = [
  { tier: 'Platinum', price: 2000000 },
  { tier: 'Gold', price: 1500000 },
  { tier: 'Silver', price: 1000000 },
  { tier: 'Bronze', price: 500000 },
  { tier: 'Base', price: 200000 },
];

export default function CreateAuctionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { accessToken } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [basePriceTiers, setBasePriceTiers] = useState(defaultBasePriceTiers);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateAuctionForm>({
    resolver: zodResolver(createAuctionSchema),
    defaultValues: {
      sportType: 'cricket',
      teamBudget: 10000000, // 1 Crore
      minBidIncrement: 100000, // 1 Lakh
      maxTeams: 8,
      playersPerTeam: { min: 11, max: 18 },
      basePriceTiers: defaultBasePriceTiers,
    },
  });

  const sportType = watch('sportType');

  const sportConfig = {
    cricket: { icon: '🏏', name: 'Cricket', playerRoles: ['Batsman', 'Bowler', 'All-rounder', 'Wicket-keeper'] },
    football: { icon: '⚽', name: 'Football', playerRoles: ['Goalkeeper', 'Defender', 'Midfielder', 'Forward'] },
    basketball: { icon: '🏀', name: 'Basketball', playerRoles: ['Point Guard', 'Shooting Guard', 'Small Forward', 'Power Forward', 'Center'] },
    kabaddi: { icon: '🤼', name: 'Kabaddi', playerRoles: ['Raider', 'Defender', 'All-rounder'] },
  };

  const updateTierPrice = (index: number, price: number) => {
    const newTiers = [...basePriceTiers];
    newTiers[index].price = price;
    setBasePriceTiers(newTiers);
  };

  const onSubmit = async (data: CreateAuctionForm) => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      // Map frontend field names to backend field names
      // Transform basePriceTiers from {tier, price} to {label, amount} format expected by backend
      const transformedTiers = basePriceTiers.map((t) => ({
        label: t.tier,
        amount: t.price,
      }));

      const auctionData = {
        name: data.name,
        description: data.description,
        sportType: data.sportType,
        password: data.password,
        teamBudget: data.teamBudget,
        bidIncrementAmount: data.minBidIncrement,
        maxTeams: data.maxTeams,
        maxPlayersPerTeam: data.playersPerTeam.max,
        basePriceTiers: transformedTiers,
        scheduledStartTime: new Date(data.scheduledDate).toISOString(),
      };

      await api.createAuction(auctionData, accessToken);

      toast({
        title: 'Auction Created! 🎉',
        description: 'Your auction has been created successfully.',
      });

      router.push('/dashboard/admin');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to create auction',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Create New Auction
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Set up a new sports auction with custom settings
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>General auction details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Auction Name *</Label>
              <Input
                id="name"
                placeholder="e.g., IPL Season 2024 Auction"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
                rows={3}
                placeholder="Brief description of the auction..."
                {...register('description')}
              />
            </div>

            <div>
              <Label>Sport Type *</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
                {Object.entries(sportConfig).map(([key, config]) => (
                  <label
                    key={key}
                    className={`flex flex-col items-center p-4 border rounded-lg cursor-pointer transition-all ${
                      sportType === key
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                        : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
                    }`}
                  >
                    <input
                      type="radio"
                      value={key}
                      {...register('sportType')}
                      className="sr-only"
                    />
                    <span className="text-3xl mb-2">{config.icon}</span>
                    <span className="font-medium">{config.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="scheduledDate">Scheduled Date *</Label>
                <Input
                  id="scheduledDate"
                  type="datetime-local"
                  {...register('scheduledDate')}
                />
                {errors.scheduledDate && (
                  <p className="text-sm text-red-500 mt-1">{errors.scheduledDate.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Auction Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Teams use this to join"
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget & Rules */}
        <Card>
          <CardHeader>
            <CardTitle>Budget & Rules</CardTitle>
            <CardDescription>Configure auction parameters</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="teamBudget">Team Budget (₹) *</Label>
                <Input
                  id="teamBudget"
                  type="number"
                  {...register('teamBudget', { valueAsNumber: true })}
                />
                {errors.teamBudget && (
                  <p className="text-sm text-red-500 mt-1">{errors.teamBudget.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="minBidIncrement">Min Bid Increment (₹) *</Label>
                <Input
                  id="minBidIncrement"
                  type="number"
                  {...register('minBidIncrement', { valueAsNumber: true })}
                />
                {errors.minBidIncrement && (
                  <p className="text-sm text-red-500 mt-1">{errors.minBidIncrement.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="maxTeams">Max Teams *</Label>
                <Input
                  id="maxTeams"
                  type="number"
                  {...register('maxTeams', { valueAsNumber: true })}
                />
                {errors.maxTeams && (
                  <p className="text-sm text-red-500 mt-1">{errors.maxTeams.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="minPlayers">Min Players per Team *</Label>
                <Input
                  id="minPlayers"
                  type="number"
                  {...register('playersPerTeam.min', { valueAsNumber: true })}
                />
              </div>

              <div>
                <Label htmlFor="maxPlayers">Max Players per Team *</Label>
                <Input
                  id="maxPlayers"
                  type="number"
                  {...register('playersPerTeam.max', { valueAsNumber: true })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Base Price Tiers */}
        <Card>
          <CardHeader>
            <CardTitle>Base Price Tiers</CardTitle>
            <CardDescription>Set starting prices for different player categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {basePriceTiers.map((tier, index) => (
                <div key={tier.tier} className="flex items-center gap-4">
                  <div className="w-24">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      index === 0 ? 'bg-purple-100 text-purple-700' :
                      index === 1 ? 'bg-yellow-100 text-yellow-700' :
                      index === 2 ? 'bg-gray-100 text-gray-700' :
                      index === 3 ? 'bg-orange-100 text-orange-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {tier.tier}
                    </span>
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      value={tier.price}
                      onChange={(e) => updateTierPrice(index, parseInt(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>
                  <div className="text-sm text-gray-500">
                    ₹{(tier.price / 100000).toFixed(1)} L
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Creating...
              </>
            ) : (
              <>🏏 Create Auction</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
