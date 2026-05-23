export interface OutfitItem {
  type: string;
  color: string;
  detail: string;
  name?: string;
  material?: string;
  fit?: string;
  pattern?: string;
  style_detail?: string;
}

export interface ColorSwatch {
  name: string;
  hex: string;
  role?: string;
}

export interface OutfitCard {
  id: string;
  user_id?: string;
  source_url: string;
  image_url: string;
  thumbnail_urls?: string[];
  style: string;
  style_tags?: string[];
  items: OutfitItem[];
  accessories?: string[];
  color_palette: ColorSwatch[];
  scene: string;
  season?: string;
  aesthetic?: string;
  body_type_advice: string;
  matching_tips?: string[];
  recommendation_score?: number;
  recommendation_summary?: string;
  is_try_on_preview?: boolean;
  source_frame_url?: string;
  ai_raw?: Record<string, unknown>;
  created_at?: string;
}

export interface WallItem {
  id: string;
  card: OutfitCard;
  note?: string;
  is_pinned: boolean;
  saved_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  card_id: string;
  outfit_cards: OutfitCard;
  profiles?: { username: string; avatar_url?: string };
  topics: string[];
  caption?: string;
  like_count: number;
  comment_count: number;
  published_at: string;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  profiles?: { username: string; avatar_url?: string };
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string };
  total?: number;
  page?: number;
}

export const SCENE_OPTIONS = ['全部', '通勤', '约会', '逛街', '运动', '度假'] as const;
