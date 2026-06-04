import { createContext } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface TelegramWebApp {}

export interface TelegramContextType {
  webApp: TelegramWebApp | null;
  tgUser: TelegramUser | null;
  initData: string;
  isTelegram: boolean;
  ready: boolean;
}

export const defaultValue: TelegramContextType = {
  webApp: null,
  tgUser: null,
  initData: '',
  isTelegram: false,
  ready: false,
};

export const TelegramContext = createContext<TelegramContextType>(defaultValue);
