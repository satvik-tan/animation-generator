export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'animation' | 'system';
  animationData?: any;
}

export interface ChatRoom {
  id: string;
  name: string;
  participants: string[];
  messages: ChatMessage[];
  createdAt: Date;
}