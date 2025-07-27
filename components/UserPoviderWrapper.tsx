'use client';

import { UserProvider } from './UserProvider';
import type { User } from '@supabase/supabase-js';
import React from 'react';

export function UserProviderWrapper({
  user,
  children,
}: {
  user: User;
  children: React.ReactNode;
}) {
  return <UserProvider user={user}>{children}</UserProvider>;
}
