'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { createClient } from '@supabase/supabase-js';

export default function WelcomeNotificationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notification, setNotification] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotification = async () => {
      if (!user) {
        router.replace('/auth/login');
        return;
      }
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .eq('type', 'agent_approved')
        .order('created_at', { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) {
        router.replace('/agent/dashboard');
        return;
      }
      setNotification(data[0]);
      setLoading(false);
    };
    fetchNotification();
  }, [user, router]);

  const handleContinue = async () => {
    if (!notification) return;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notification.id);
    router.replace('/agent/dashboard');
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (error) return <div className="flex items-center justify-center min-h-screen text-red-500">{error}</div>;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-secondary/10 p-4">
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-lg p-8 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold mb-4">{notification.title}</h1>
        <p className="mb-8 text-muted-foreground">{notification.message}</p>
        <Button onClick={handleContinue} className="w-full">Continue to Dashboard</Button>
      </div>
    </div>
  );
} 