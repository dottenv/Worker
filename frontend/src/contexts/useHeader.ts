import { useContext } from 'react';
import { HeaderContext } from './HeaderContext';

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) throw new Error('useHeader must be used within HeaderProvider');
  return ctx;
}
