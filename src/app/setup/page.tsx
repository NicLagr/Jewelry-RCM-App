"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Gem, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState(1);

  // Store info
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [storeEmail, setStoreEmail] = useState("");

  // Admin user info
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    checkSetupNeeded();
  }, []);

  const checkSetupNeeded = async () => {
    try {
      const res = await fetch("/api/setup/check");
      const data = await res.json();
      
      if (!data.setupNeeded) {
        // Already set up, redirect to login
        router.push("/login");
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error("Error checking setup status:", error);
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (adminPassword !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (adminPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/setup/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeName,
          storePhone,
          storeEmail,
          adminName,
          adminEmail,
          adminPassword,
        }),
      });

      const data = await res.json();
      
      if (res.ok) {
        router.push("/jobs");
      } else {
        setError(data.error || "Setup failed");
      }
    } catch (error) {
      console.error("Setup error:", error);
      setError("An error occurred during setup");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1a4d3e] via-[#1a4d3e] to-[#143d31] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a4d3e] via-[#1a4d3e] to-[#143d31] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#1a4d3e] to-[#143d31] rounded-2xl flex items-center justify-center mb-4">
            <Gem className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome to Jewelry CRM</CardTitle>
          <p className="text-slate-500 mt-2">
            Let&apos;s set up your store in just a few steps
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Progress indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className={`w-3 h-3 rounded-full ${step >= 1 ? "bg-[#1a4d3e]" : "bg-slate-200"}`} />
              <div className={`w-12 h-1 ${step >= 2 ? "bg-[#1a4d3e]" : "bg-slate-200"}`} />
              <div className={`w-3 h-3 rounded-full ${step >= 2 ? "bg-[#1a4d3e]" : "bg-slate-200"}`} />
            </div>

            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Store Information</h3>
                
                <div>
                  <Label htmlFor="storeName">Store Name *</Label>
                  <Input
                    id="storeName"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    placeholder="e.g., Johnson's Fine Jewelry"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="storePhone">Store Phone</Label>
                  <Input
                    id="storePhone"
                    type="tel"
                    value={storePhone}
                    onChange={(e) => setStorePhone(e.target.value)}
                    placeholder="(555) 123-4567"
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="storeEmail">Store Email</Label>
                  <Input
                    id="storeEmail"
                    type="email"
                    value={storeEmail}
                    onChange={(e) => setStoreEmail(e.target.value)}
                    placeholder="contact@yourstore.com"
                    className="mt-1"
                  />
                </div>

                <Button
                  type="button"
                  className="w-full"
                  onClick={() => setStep(2)}
                  disabled={!storeName}
                >
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Create Admin Account</h3>
                <p className="text-sm text-slate-500">
                  This will be the owner account with full access
                </p>

                <div>
                  <Label htmlFor="adminName">Your Name *</Label>
                  <Input
                    id="adminName"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    placeholder="John Smith"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="adminEmail">Email *</Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="john@yourstore.com"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="adminPassword">Password *</Label>
                  <Input
                    id="adminPassword"
                    type="password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="mt-1"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="mt-1"
                    required
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={!adminName || !adminEmail || !adminPassword || !confirmPassword || submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Setting up...
                      </>
                    ) : (
                      "Complete Setup"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

