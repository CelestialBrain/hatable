export interface Page {
  id: string;
  title: string;
  content: string;
}

export interface VibeResponse {
  thought_process: string;
  chat_response: string;
  suggestions: string[];
  pages: Page[];
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'code_preview';
  metadata?: {
    thought_process?: string;
    pages?: Page[];
    suggestions?: string[];
  };
}

export enum ViewMode {
  CHAT = 'CHAT',
  PREVIEW = 'PREVIEW',
  CODE = 'CODE'
}