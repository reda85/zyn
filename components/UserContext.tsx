'use client'
import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';

type UserContextType = User | null | undefined;

// undefined = en cours de chargement, null = non connecté, User = connecté
export const UserContext = createContext<UserContextType>(undefined);

export const useUser = () => useContext(UserContext);