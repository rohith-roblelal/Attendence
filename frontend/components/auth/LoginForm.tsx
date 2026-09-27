'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
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
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
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
          <form onSubmit={handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="username">Username</FieldLabel>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  autoComplete="username"
                  disabled={isSubmitting}
                  {...register('username')}
                />
                {errors.username && <p className="text-destructive text-xs mt-1">{errors.username.message}</p>}
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  {...register('password')} 
                />
                {errors.password && <p className="text-destructive text-xs mt-1">{errors.password.message}</p>}
              </Field>
              
              {serverError && (
                <div className="text-destructive text-sm text-center font-medium py-2">
                  {serverError}
                </div>
              )}

              <Field>
                <Button type="submit" disabled={isSubmitting} className="w-full">
                  {isSubmitting ? 'Authenticating...' : 'Sign In'}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <div className="text-center text-sm text-muted-foreground px-6">
        Authorized personnel only. For access issues, please contact IT Support.
      </div>
    </div>
  )
}
