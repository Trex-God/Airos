"use client";

import { ClerkProvider } from "@clerk/nextjs";
import type React from "react";

interface ClerkProviderWrapperProps {
  children: React.ReactNode;
}

export default function ClerkProviderWrapper({
  children,
}: ClerkProviderWrapperProps) {
  return (
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/login"
      signInForceRedirectUrl="/dashboard"
      signUpForceRedirectUrl="/dashboard"
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: "#3b82f6",
        },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
