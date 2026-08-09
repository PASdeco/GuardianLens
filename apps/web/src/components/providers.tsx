"use client";

import type { ReactNode } from "react";
import { GuardianAuthProvider } from "@/lib/auth";
import { GuardianStoreProvider } from "@/lib/store";
import { GuardianThemeProvider } from "@/lib/theme";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <GuardianThemeProvider>
      <GuardianAuthProvider>
        <GuardianStoreProvider>{children}</GuardianStoreProvider>
      </GuardianAuthProvider>
    </GuardianThemeProvider>
  );
}
