// Jellyfin API service
import { Jellyfin } from '@jellyfin/sdk';
import { Api } from '@jellyfin/sdk/lib/api';
import axios from 'axios';
import { Movie } from '@/types';

// Define a minimal type for Jellyfin movie items
interface JellyfinItem {
  Id?: string;
  Name?: string;
  Overview?: string;
  ImageTags?: {
    Primary?: string;
    [key: string]: string | undefined;
  };
  ProductionYear?: number;
  RunTimeTicks?: number;
  Genres?: string[];
}

class JellyfinService {
  private api: Api | null = null;
  private jellyfinServerUrl: string = '';
  private clientName: string = 'Jellyfin Movie Picker';
  private clientVersion: string = '1.0.0';
  private deviceName: string = 'Web Browser';
  private deviceId: string = '';

  constructor() {
    this.deviceId = this.generateDeviceId();
  }

  private generateDeviceId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  private getImageUrl(itemId: string, imageType: string, tag: string): string {
    if (!this.api) {
      return '';
    }
    
    // Use proxy for image URLs to avoid CORS issues
    return `/api/jellyfin-proxy/Items/${itemId}/Images/${imageType}?tag=${tag}`;
  }

  async connect(serverUrl: string): Promise<void> {
    try {      
      // Store the server URL for later use
      this.jellyfinServerUrl = serverUrl;
      
      // Create Jellyfin SDK instance
      const jellyfin = new Jellyfin({
        clientInfo: {
          name: this.clientName,
          version: this.clientVersion
        },
        deviceInfo: {
          name: this.deviceName,
          id: this.deviceId
        }
      });

      // Create API with the actual Jellyfin server URL
      this.api = jellyfin.createApi(serverUrl);
      
      // Test connection by fetching system info via our proxy
      const response = await axios.get('/api/jellyfin-proxy/System/Info/Public', {
        headers: {
          'X-Jellyfin-Url': serverUrl,
          'X-Emby-Authorization': `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.clientVersion}"`
        }
      });
      
      if (response.status !== 200) {
        throw new Error(`Unexpected status code: ${response.status}`);
      }
      
      console.log('Connected to Jellyfin server:', response.data.ServerName);
    } catch (error) {
      console.error('Failed to connect to Jellyfin server:', error);
      throw new Error('Failed to connect to Jellyfin server');
    }
  }

  async authenticate(username: string, password: string): Promise<{ userId: string; accessToken: string }> {
    if (!this.jellyfinServerUrl) {
      throw new Error('Not connected to a Jellyfin server');
    }

    try {
      // Use proxy for authentication
      const response = await axios.post('/api/jellyfin-proxy/Users/AuthenticateByName', {
        Username: username,
        Pw: password,
        // Add required Jellyfin client info
        App: this.clientName,
        AppVersion: this.clientVersion,
        DeviceId: this.deviceId,
        DeviceName: this.deviceName
      }, {
        headers: {
          'X-Jellyfin-Url': this.jellyfinServerUrl,
          'Content-Type': 'application/json',
          'X-Emby-Authorization': `MediaBrowser Client="${this.clientName}", Device="${this.deviceName}", DeviceId="${this.deviceId}", Version="${this.clientVersion}"`
        }
      });

      return {
        userId: response.data.User?.Id ?? '',
        accessToken: response.data.AccessToken ?? ''
      };
    } catch (error) {
      console.error('Authentication failed:', error);
      throw new Error('Authentication failed');
    }
  }

  async getMovies(userId: string, accessToken: string): Promise<Movie[]> {
    if (!this.jellyfinServerUrl) {
      throw new Error('Not connected to a Jellyfin server');
    }

    try {
      // Get items using the proxy
      const response = await axios.get(`/api/jellyfin-proxy/Items`, {
        headers: {
          'X-Jellyfin-Url': this.jellyfinServerUrl,
          'X-Emby-Token': accessToken
        },
        params: {
          userId,
          sortBy: 'Random',
          sortOrder: 'Ascending',
          includeItemTypes: 'Movie',
          recursive: true,
          fields: 'Overview,Genres,ProductionYear,RunTimeTicks',
          limit: 100
        }
      });

      const items = response.data.Items || [];
      if (!Array.isArray(items)) {
        return [];
      }

      // Convert Jellyfin's items to our Movie type
      return items.map((item: JellyfinItem) => {
        // Safely access ImageTags and Primary
        const hasImageTag = item.ImageTags && typeof item.ImageTags === 'object' && 'Primary' in item.ImageTags;
        const posterUrl = hasImageTag && item.Id && item.ImageTags?.Primary ? 
          this.getImageUrl(item.Id, 'Primary', item.ImageTags.Primary) : '';

        return {
          id: item.Id ?? '',
          name: item.Name ?? '',
          overview: item.Overview ?? '',
          posterUrl,
          year: item.ProductionYear ?? 0,
          runtime: Math.floor((item.RunTimeTicks ?? 0) / 600000000), // Convert ticks to minutes
          genres: Array.isArray(item.Genres) ? item.Genres : []
        };
      });
    } catch (error) {
      console.error('Failed to get movies:', error);
      throw new Error('Failed to get movies');
    }
  }
}

export const jellyfinService = new JellyfinService();
