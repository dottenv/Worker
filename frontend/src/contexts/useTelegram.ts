import { useContext } from 'react';
import { TelegramContext } from './telegram';

export function useTelegram() {
  return useContext(TelegramContext);
}
