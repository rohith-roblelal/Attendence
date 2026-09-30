'use client';

import { LoginForm } from '../../components/auth/LoginForm';
import { ThemeToggle } from '../../components/ThemeToggle';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background text-foreground relative">
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
