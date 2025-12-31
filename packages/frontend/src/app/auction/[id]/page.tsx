'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { useAuctionStore } from '@/store/auction-store';
import { socketManager } from '@/lib/socket';
import api from '@/lib/api';
import { formatCurrency, cn } from '@/lib/utils';

interface Team {
  _id: string;
  name: string;
  shortName: string;
  budget: number;
  totalSpent: number;
  players: any[];
}

interface Player {
  _id: string;
  player: {
    _id: string;
    name: string;
    email: string;
  };
  playerRole: string;
  basePrice: number;
}

interface Bid {
  team: string;
  teamName: string;
  amount: number;
  timestamp: Date;
}

export default function AuctionRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const { user, accessToken } = useAuthStore();
  const { 
    currentPlayer, 
    currentBid, 
    timer,
    isConnected,
    setConnected,
    setCurrentPlayer,
    setCurrentBid,
    setTimer,
    reset 
  } = useAuctionStore();

  const [auction, setAuction] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [bidHistory, setBidHistory] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isBidding, setIsBidding] = useState(false);

  const auctionId = params.id as string;

  // Calculate next bid amount
  const nextBidAmount = currentBid 
    ? currentBid + (auction?.minBidIncrement || 100000)
    : (currentPlayer as any)?.basePrice || 0;

  // Check if user can bid
  const canBid = 
    user?.role === 'team_owner' && 
    myTeam && 
    myTeam.budget >= nextBidAmount &&
    currentPlayer &&
    isConnected;

  // Fetch auction data
  useEffect(() => {
    const fetchAuction = async () => {
      if (!accessToken || !auctionId) return;

      try {
        const response: any = await api.getAuction(auctionId, accessToken);
        setAuction(response.data?.auction);
        
        // Fetch teams
        const teamsResponse: any = await api.getAuctionTeams(auctionId, accessToken);
        const teamsList = teamsResponse.data?.teams || [];
        setTeams(teamsList);
        
        // Find user's team if team owner
        if (user?.role === 'team_owner') {
          const userTeam = teamsList.find((t: Team) => t._id === (user as any).teamId);
          setMyTeam(userTeam || null);
        }
      } catch (error) {
        console.error('Failed to fetch auction:', error);
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load auction data',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuction();
  }, [auctionId, accessToken, user, toast]);

  // Socket connection
  useEffect(() => {
    if (!accessToken || !auctionId) return;

    // Connect to socket
    socketManager.connect(accessToken);
    
    // Join auction room
    socketManager.joinAuction(auctionId);

    // Socket event handlers
    const handleConnect = () => {
      setConnected(true);
      toast({
        title: 'Connected',
        description: 'You are now connected to the auction room',
      });
    };

    const handleDisconnect = () => {
      setConnected(false);
      toast({
        variant: 'destructive',
        title: 'Disconnected',
        description: 'Lost connection to auction room',
      });
    };

    const handlePlayerUp = (data: { player: any; basePrice: number }) => {
      setCurrentPlayer(data.player);
      setCurrentBid(data.basePrice);
      setBidHistory([]);
      toast({
        title: '🏏 New Player',
        description: `${data.player.player?.name} is now up for bidding!`,
      });
    };

    const handleBidPlaced = (data: { team: any; amount: number; teamId: string }) => {
      setCurrentBid(data.amount);
      setBidHistory((prev) => [
        { 
          team: data.teamId, 
          teamName: data.team?.name || 'Unknown', 
          amount: data.amount, 
          timestamp: new Date() 
        },
        ...prev,
      ]);
    };

    const handleTimerUpdate = (data: { timeRemaining: number }) => {
      setTimer(data.timeRemaining);
    };

    const handlePlayerSold = (data: { player: any; team: any; amount: number }) => {
      toast({
        title: '🎉 SOLD!',
        description: `${data.player.player?.name} sold to ${data.team?.name} for ${formatCurrency(data.amount)}`,
      });
      setCurrentPlayer(null);
      setCurrentBid(0);
      setBidHistory([]);
      
      // Update teams
      setTeams((prev) =>
        prev.map((t) =>
          t._id === data.team._id
            ? { ...t, budget: t.budget - data.amount, totalSpent: t.totalSpent + data.amount }
            : t
        )
      );
    };

    const handlePlayerUnsold = (data: { player: any }) => {
      toast({
        title: 'Unsold',
        description: `${data.player.player?.name} went unsold`,
      });
      setCurrentPlayer(null);
      setCurrentBid(0);
      setBidHistory([]);
    };

    const handleAuctionEnded = () => {
      toast({
        title: 'Auction Ended',
        description: 'The auction has been completed',
      });
      reset();
      router.push('/dashboard');
    };

    const handleError = (data: { message: string }) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: data.message,
      });
    };

    // Register event listeners
    const socket = socketManager.getSocket();
    if (socket) {
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('player:up', handlePlayerUp);
      socket.on('bid:placed', handleBidPlaced);
      socket.on('timer:update', handleTimerUpdate);
      socket.on('player:sold', handlePlayerSold);
      socket.on('player:unsold', handlePlayerUnsold);
      socket.on('auction:ended', handleAuctionEnded);
      socket.on('error', handleError);
    }

    // Cleanup
    return () => {
      if (socket) {
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('player:up', handlePlayerUp);
        socket.off('bid:placed', handleBidPlaced);
        socket.off('timer:update', handleTimerUpdate);
        socket.off('player:sold', handlePlayerSold);
        socket.off('player:unsold', handlePlayerUnsold);
        socket.off('auction:ended', handleAuctionEnded);
        socket.off('error', handleError);
      }
      socketManager.leaveAuction(auctionId);
      reset();
    };
  }, [accessToken, auctionId, router, toast, reset, setConnected, setCurrentBid, setCurrentPlayer, setTimer]);

  // Place bid
  const handlePlaceBid = useCallback(async () => {
    if (!canBid || !myTeam) return;

    setIsBidding(true);
    try {
      socketManager.placeBid(auctionId, myTeam._id, nextBidAmount);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Bid Failed',
        description: 'Failed to place bid. Please try again.',
      });
    } finally {
      setIsBidding(false);
    }
  }, [canBid, myTeam, auctionId, nextBidAmount, toast]);

  // Admin controls
  const handleStartNextPlayer = () => {
    socketManager.startNextPlayer(auctionId);
  };

  const handleEndAuction = () => {
    socketManager.endAuction(auctionId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading auction room...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-3xl">🏏</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  {auction?.name || 'Auction Room'}
                </h1>
                <div className="flex items-center space-x-2">
                  <span
                    className={cn(
                      'w-2 h-2 rounded-full',
                      isConnected ? 'bg-green-500' : 'bg-red-500'
                    )}
                  />
                  <span className="text-sm text-gray-500">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {myTeam && (
                <div className="text-right">
                  <p className="text-sm text-gray-500">Your Budget</p>
                  <p className="text-xl font-bold text-green-600">
                    {formatCurrency(myTeam.budget)}
                  </p>
                </div>
              )}
              <Button variant="outline" onClick={() => router.push('/dashboard')}>
                Exit
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Bidding Area */}
          <div className="lg:col-span-2 space-y-6">
            {/* Timer */}
            <Card className={cn(
              'overflow-hidden transition-colors',
              timer <= 5 && timer > 0 ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''
            )}>
              <CardContent className="py-8">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Time Remaining</p>
                  <div className={cn(
                    'text-7xl font-mono font-bold',
                    timer <= 5 && timer > 0 ? 'text-red-600 animate-pulse' : 'text-gray-900 dark:text-white'
                  )}>
                    {timer > 0 ? `00:${timer.toString().padStart(2, '0')}` : '--:--'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Current Player */}
            {currentPlayer ? (
              <Card className="gradient-cricket text-white overflow-hidden">
                <CardContent className="py-8">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-6">
                      <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center">
                        <span className="text-5xl">
                          {(currentPlayer as any).playerRole === 'batsman' ? '🏏' :
                           (currentPlayer as any).playerRole === 'bowler' ? '🎯' :
                           (currentPlayer as any).playerRole === 'wicket-keeper' ? '🧤' : '⚡'}
                        </span>
                      </div>
                      <div>
                        <h2 className="text-3xl font-bold">
                          {(currentPlayer as any).player?.name || 'Unknown Player'}
                        </h2>
                        <p className="text-xl text-green-100 capitalize">
                          {(currentPlayer as any).playerRole}
                        </p>
                        <p className="text-sm text-green-200 mt-1">
                          Base Price: {formatCurrency((currentPlayer as any).basePrice)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-green-100">Current Bid</p>
                      <p className="text-5xl font-bold">{formatCurrency(currentBid)}</p>
                      {bidHistory[0] && (
                        <p className="text-sm text-green-200 mt-1">
                          by {bidHistory[0].teamName}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🏏</div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                      Waiting for next player...
                    </h2>
                    <p className="text-gray-500">
                      The auction will continue shortly
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bid Controls */}
            {user?.role === 'team_owner' && currentPlayer && (
              <Card>
                <CardContent className="py-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">Next Bid Amount</p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-white">
                        {formatCurrency(nextBidAmount)}
                      </p>
                    </div>
                    <Button
                      size="lg"
                      className={cn(
                        'h-16 px-12 text-xl font-bold',
                        canBid
                          ? 'gradient-cricket text-white hover:opacity-90'
                          : 'bg-gray-300 cursor-not-allowed'
                      )}
                      disabled={!canBid || isBidding}
                      onClick={handlePlaceBid}
                    >
                      {isBidding ? (
                        <span className="animate-pulse">Bidding...</span>
                      ) : (
                        <>🔨 PLACE BID</>
                      )}
                    </Button>
                  </div>
                  {!canBid && myTeam && myTeam.budget < nextBidAmount && (
                    <p className="text-red-500 text-sm mt-2">
                      Insufficient budget for this bid
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Admin Controls */}
            {user?.role === 'admin' && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Controls</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Button
                      onClick={handleStartNextPlayer}
                      className="gradient-cricket text-white"
                    >
                      ▶️ Start Next Player
                    </Button>
                    <Button
                      onClick={handleEndAuction}
                      variant="destructive"
                    >
                      🛑 End Auction
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Bid History */}
            <Card>
              <CardHeader>
                <CardTitle>Bid History</CardTitle>
              </CardHeader>
              <CardContent>
                {bidHistory.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {bidHistory.map((bid, index) => (
                      <div
                        key={index}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg',
                          index === 0
                            ? 'bg-green-100 dark:bg-green-900/20 border border-green-500'
                            : 'bg-gray-50 dark:bg-gray-800'
                        )}
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{bid.teamName}</span>
                          {index === 0 && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                              Highest
                            </span>
                          )}
                        </div>
                        <span className="font-bold">{formatCurrency(bid.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No bids yet</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Teams */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Participating Teams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {teams.map((team) => (
                    <div
                      key={team._id}
                      className={cn(
                        'p-3 rounded-lg border',
                        myTeam?._id === team._id
                          ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      )}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                            {team.shortName}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            {team.name}
                          </span>
                        </div>
                        {myTeam?._id === team._id && (
                          <span className="text-xs text-green-600 font-medium">YOU</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="text-gray-500">Budget:</span>
                          <span className="ml-1 font-medium text-green-600">
                            {formatCurrency(team.budget)}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Players:</span>
                          <span className="ml-1 font-medium">
                            {team.players?.length || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
