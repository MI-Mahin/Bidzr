// API base URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

interface FetchOptions extends RequestInit {
  token?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {}
  ): Promise<T> {
    const { token, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...fetchOptions,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'An error occurred');
    }

    return data;
  }

  // Auth endpoints
  async register(data: { email: string; password: string; name: string; role?: string }) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getProfile(token: string) {
    return this.request('/auth/me', { token });
  }

  async refreshToken(refreshToken: string) {
    return this.request('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
  }

  // Auction endpoints
  async getAuctions(token?: string, params?: { status?: string; page?: number; limit?: number }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());

    const queryString = query.toString();
    return this.request(`/auctions${queryString ? `?${queryString}` : ''}`, { token });
  }

  async getAuction(id: string, token?: string) {
    return this.request(`/auctions/${id}`, { token });
  }

  async createAuction(data: any, token: string) {
    return this.request('/auctions', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async verifyAuctionPassword(auctionId: string, password: string, token: string) {
    return this.request(`/auctions/${auctionId}/verify`, {
      method: 'POST',
      body: JSON.stringify({ password }),
      token,
    });
  }

  async startAuction(auctionId: string, token: string) {
    return this.request(`/auctions/${auctionId}/start`, {
      method: 'POST',
      token,
    });
  }

  async pauseAuction(auctionId: string, token: string) {
    return this.request(`/auctions/${auctionId}/pause`, {
      method: 'POST',
      token,
    });
  }

  async endAuction(auctionId: string, token: string) {
    return this.request(`/auctions/${auctionId}/end`, {
      method: 'POST',
      token,
    });
  }

  async getAuctionResults(auctionId: string, token?: string) {
    return this.request(`/auctions/${auctionId}/results`, { token });
  }

  // Team endpoints
  async registerTeam(data: any, auctionId: string, token: string) {
    return this.request(`/teams/register`, {
      method: 'POST',
      body: JSON.stringify({ ...data, auctionId }),
      token,
    });
  }

  async getTeamsByAuction(auctionId: string, token: string) {
    return this.request(`/teams/auction/${auctionId}`, { token });
  }

  async getAuctionTeams(auctionId: string, token: string) {
    return this.request(`/teams/auction/${auctionId}`, { token });
  }

  async getMyTeams(token: string) {
    return this.request('/teams/my-teams', { token });
  }

  async getTeam(teamId: string, token: string) {
    return this.request(`/teams/${teamId}`, { token });
  }

  // Player endpoints
  async registerPlayer(data: any, auctionId: string, token: string) {
    return this.request(`/players/register`, {
      method: 'POST',
      body: JSON.stringify({ ...data, auctionId }),
      token,
    });
  }

  async getPlayersByAuction(auctionId: string, token: string, params?: { status?: string; role?: string }) {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.role) query.append('role', params.role);

    const queryString = query.toString();
    return this.request(`/players/auction/${auctionId}${queryString ? `?${queryString}` : ''}`, { token });
  }

  async getMyRegistrations(token: string) {
    return this.request('/players/my-registrations', { token });
  }

  async getNextPlayer(auctionId: string, token: string) {
    return this.request(`/players/auction/${auctionId}/next`, { token });
  }

  async putPlayerOnBlock(playerId: string, token: string) {
    return this.request(`/players/${playerId}/on-block`, {
      method: 'POST',
      token,
    });
  }

  // Bid endpoints
  async placeBid(data: { auctionId: string; playerId: string; amount: number }, token: string) {
    return this.request('/bids', {
      method: 'POST',
      body: JSON.stringify(data),
      token,
    });
  }

  async getPlayerBids(playerId: string, token: string) {
    return this.request(`/bids/player/${playerId}`, { token });
  }

  async getAuctionBidStats(auctionId: string, token: string) {
    return this.request(`/bids/auction/${auctionId}/stats`, { token });
  }
}

export const api = new ApiClient(API_URL);
export default api;
