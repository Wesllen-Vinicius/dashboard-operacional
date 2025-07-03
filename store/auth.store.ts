"use client";

import { create } from 'zustand';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useDataStore } from './data.store';
import { Role, SystemUser } from '@/lib/schemas';
import { getRoleById } from '@/lib/services/roles.services';

interface AuthState {
  user: User | null;
  role: Role | null;
  permissions: Role['permissoes'];
  isSuperAdmin: boolean;
  isLoading: boolean;
  initializeAuthListener: () => () => void;
  authUnsubscribe: (() => void) | null;
  firestoreUnsubscribe: (() => void) | null;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  role: null,
  permissions: {},
  isSuperAdmin: false,
  isLoading: true,
  authUnsubscribe: null,
  firestoreUnsubscribe: null,

  initializeAuthListener: () => {
    if (get().authUnsubscribe) return () => {};

    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      get().firestoreUnsubscribe?.();

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        const firestoreUnsubscribe = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const userData = docSnap.data() as SystemUser;
            const isSuperAdmin = userData.isSuperAdmin === true;

            let userRole: Role | null = null;
            let permissions: Role['permissoes'] = {};

            if (!isSuperAdmin && userData.roleId) {
                userRole = await getRoleById(userData.roleId);
                if (userRole) {
                  permissions = userRole.permissoes || {};
                }
            }

            set({
                user,
                role: userRole,
                permissions,
                isSuperAdmin,
                isLoading: false
            });

            if (isSuperAdmin) {
              useDataStore.getState().initializeSubscribers();
            }

          } else {
            console.warn("Usuário autenticado sem documento no Firestore:", user.uid);
            set({ user: null, role: null, permissions: {}, isSuperAdmin: false, isLoading: false });
          }
        }, (error) => {
            console.error("Erro ao observar o documento do usuário:", error);
            set({ user: null, role: null, permissions: {}, isSuperAdmin: false, isLoading: false });
        });

        set({ firestoreUnsubscribe });

      } else {
        set({ user: null, role: null, permissions: {}, isSuperAdmin: false, isLoading: false, firestoreUnsubscribe: null });
        useDataStore.getState().clearSubscribers();
      }
    });

    set({ authUnsubscribe });
    return authUnsubscribe;
  },
}));
