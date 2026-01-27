export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  groundingChunks?: GroundingChunk[];
  groundingSupports?: any[]; // Simplified for this use case
  searchEntryPoint?: {
    renderedContent: string;
  };
}

export interface SearchResult {
  text: string;
  groundingMetadata?: GroundingMetadata;
}

export interface SearchHistoryItem {
  id: string;
  timestamp: number;
  images: File[]; // Changed from single image to array
  description: string;
  result: SearchResult;
  mode: SearchMode;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export enum SearchMode {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI',
  CHAT = 'CHAT'
}