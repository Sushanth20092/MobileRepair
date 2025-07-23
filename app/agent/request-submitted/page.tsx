"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { supabase } from "@/lib/api";
import { CheckCircle2 } from "lucide-react";

export default function RequestSubmittedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    async function checkPending() {
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      const { data, error } = await supabase
        .from("agent_applications")
        .select("status")
        .eq("user_id", user.id)
        .eq("status", "pending");
      if (error) {
        setHasPending(false);
        setLoading(false);
        return;
      }
      setHasPending(Array.isArray(data) && data.length > 0);
      setLoading(false);
      if (!Array.isArray(data) || data.length === 0) {
        router.replace("/agent/apply");
      }
    }
    checkPending();
  }, [user, router]);

  if (loading) return null;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#e0f7fa] via-[#f8fafc] to-[#e0f2fe] py-12 px-4">
      <div className="max-w-md w-full mx-auto bg-white border border-gray-200 rounded-xl shadow-xl p-8 text-center flex flex-col items-center">
        <CheckCircle2 className="text-green-500 mb-4" size={56} />
        <h2 className="text-3xl font-bold mb-2 text-gray-900">Request Submitted!</h2>
        <p className="mb-6 text-gray-700 text-base">Your agent request has been submitted.<br />You'll be notified via email once reviewed.</p>
        <Button className="w-full max-w-xs" size="lg" onClick={() => router.push("/")}>Back to Homepage</Button>
      </div>
    </div>
  );
} 