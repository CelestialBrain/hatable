export interface Page {
  id: string;
  title: string;
  content: string;
}

export interface Diagnostics {
  validation: string[];
  repairs: string[];
  assumptions: string[];
}

export interface VibeResponse {
  diagnostics: Diagnostics;
  chat_response: string;
  suggestions: string[];
  pages: Page[];
}

export interface Message {
  role: 'user' | 'model';
  content: string;
  type?: 'text' | 'code_preview';
  metadata?: {
    diagnostics?: Diagnostics;
    pages?: Page[];
    suggestions?: string[];
  };
}

export enum ViewMode {
  CHAT = 'CHAT',
  PREVIEW = 'PREVIEW',
  CODE = 'CODE'
}