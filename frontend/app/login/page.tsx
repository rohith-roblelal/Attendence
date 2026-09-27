'use client';

import { LoginForm } from '../../components/auth/LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen w-full items-center justify-center p-6 md:p-10 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
