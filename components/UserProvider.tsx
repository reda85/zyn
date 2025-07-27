'use client';

import { UserContext } from './UserContext';
import type { User } from '@supabase/supabase-js';
import React from 'react';

export const UserProvider = ({ user, children }: { user: User; children: React.ReactNode }) => {
  return <UserContext.Provider value={user}>{children}</UserContext.Provider>;
};
