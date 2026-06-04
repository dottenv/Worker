import { useState, type ReactNode } from 'react';
import { TelegramContext, type TelegramContextType } from './telegram';

function initTelegram(): TelegramContextType {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tw = (window as any).Telegram?.WebApp;
  if (tw) {
    tw.ready();
    return {
      webApp: tw,
      tgUser: tw.initDataUnsafe?.user ?? null,
      initData: tw.initData || '',
      isTelegram: true,
      ready: true,
    };
  }
  return {
    webApp: null,
    tgUser: null,
    initData: '',
    isTelegram: false,
    ready: true,
  };
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const [state] = useState(initTelegram);

  return (
    <TelegramContext.Provider value={state}>
      {children}
    </TelegramContext.Provider>
  );
}
