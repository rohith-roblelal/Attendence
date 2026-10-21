'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../lib/auth/AuthContext';
import { apiClient } from '../../lib/api/client';
import { useRouter } from 'next/navigation';
import { cn } from "../../src/lib/utils"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { login } = useAuth();
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await apiClient.post('/auth/login', data);
      const user = response.data.data.user;
      login(user);
      
      const roleDashboards: Record<string, string> = {
        'ADMINISTRATION': '/dashboard/administration',
        'HOD': '/dashboard/hod',
        'TUTOR': '/dashboard/tutor',
        'TEACHER': '/dashboard/teacher',
        'STUDENT': '/dashboard/student',
      };
      
      const dashboardPath = roleDashboards[user.role] || '/dashboard';
      router.push(dashboardPath);
    } catch (error: any) {
      setServerError(error.response?.data?.message || 'Invalid username or password');
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">College Attendance System</CardTitle>
          <CardDescription>
            Enter your credentials to access your dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="Enter your username"
                autoComplete="username"
                disabled={isSubmitting}
                {...register('username')}
              />
              {errors.username && <p className="text-destructive text-xs mt-1">{errors.username.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="pr-10"
                  {...register('password')} 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
            </div>
            
            {serverError && (
              <div className="text-destructive text-sm text-center font-medium py-2">
                {serverError}
              </div>
            )}

            <Button type="submit" disabled={isSubmitting} className="w-full mt-2">
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm text-muted-foreground px-6">
        Authorized personnel only. For access issues, please contact IT Support.
      </div>
    </div>
  )
}
