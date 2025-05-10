import { LoginForm } from '@/components/auth/login-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Package } from 'lucide-react';
import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-secondary p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Package className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">HugoHost</CardTitle>
          <CardDescription>Sign in to manage your Hugo blogs</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 bg-blue-50 border-blue-200 text-blue-700">
            <Info className="h-5 w-5 !text-blue-700" />
            <AlertTitle className="font-semibold">Demo Account</AlertTitle>
            <AlertDescription className="!text-blue-700">
              Use the following credentials for a quick tour:
              <ul className="list-disc pl-5 mt-1">
                <li><strong>Email:</strong> demo@example.com</li>
                <li><strong>Password:</strong> password</li>
              </ul>
               <p className="mt-2 text-xs">
                Note: This demo account may have limited functionality or reset periodically. For full access, please sign up.
              </p>
            </AlertDescription>
          </Alert>
          <LoginForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/signup" className="font-medium text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
