'use client';
import { createContext, useContext } from 'react';
export const KaraFunVisibility = createContext(true);
export const useKaraFunVisible = () => useContext(KaraFunVisibility);
