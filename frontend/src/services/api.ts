import axios from 'axios';
import type { ApiResponse, OutfitCard } from '../types';

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 600000,
});

export const cardsApi = {
  parseUrl: (input: string) =>
    publicApi.post<ApiResponse<{ valid: boolean; url: string | null }>>('/cards/parse-url', { input }),

  generate: (url: string, user_photo: string) =>
    publicApi.post<ApiResponse<{ card: OutfitCard; progress: { completed: boolean } }>>('/cards/generate', {
      url,
      user_photo,
    }),
};
