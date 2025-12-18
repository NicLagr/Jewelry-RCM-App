"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Store,
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Save,
  Plus,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, cn } from "@/lib/utils";

interface StoreSettings {
  id: string;
  storeName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  businessHours: string | null;
  smsEnabled: boolean;
  smsProvider: string;
  smsFromNumber: string | null;
}

interface ServiceCatalog {
  id: string;
  name: string;
  defaultUnitPriceCents: number;
  active: boolean;
}

export default function StoreSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newService, setNewService] = useState({ name: "", price: "" });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, servicesRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/services"),
      ]);

      if (settingsRes.ok) setSettings(await settingsRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
    } catch (error) {
      console.error("Error saving settings:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newService.name) return;

    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newService.name,
          defaultUnitPriceCents: Math.round(parseFloat(newService.price || "0") * 100),
        }),
      });

      if (res.ok) {
        setNewService({ name: "", price: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Error adding service:", error);
    }
  };

  const handleUpdateService = async (service: ServiceCatalog) => {
    try {
      await fetch("/api/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(service),
      });
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="h-5 w-5 mr-2" />
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* Settings Nav */}
          <div className="flex gap-2 mt-4">
            <Link
              href="/settings/store"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a4d3e] text-white"
            >
              Store Info
            </Link>
            <Link
              href="/settings/users"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
            >
              Users
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Store Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Store Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-slate-500 text-sm">Store Name</Label>
              <Input
                value={settings?.storeName || ""}
                onChange={(e) =>
                  setSettings(settings ? { ...settings, storeName: e.target.value } : null)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-sm">Phone Number</Label>
              <Input
                type="tel"
                value={settings?.phone || ""}
                onChange={(e) =>
                  setSettings(settings ? { ...settings, phone: e.target.value } : null)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-sm">Email Address</Label>
              <Input
                type="email"
                value={settings?.email || ""}
                onChange={(e) =>
                  setSettings(settings ? { ...settings, email: e.target.value } : null)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-sm">Street Address</Label>
              <Input
                value={settings?.address?.split('\n')[0] || ""}
                onChange={(e) =>
                  setSettings(settings ? { ...settings, address: e.target.value } : null)
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-sm">City, State, ZIP</Label>
              <Input
                value={settings?.address?.split('\n')[1] || ""}
                onChange={(e) => {
                  const street = settings?.address?.split('\n')[0] || "";
                  setSettings(settings ? { ...settings, address: `${street}\n${e.target.value}` } : null);
                }}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-500 text-sm">Business Hours</Label>
              <Input
                value={settings?.businessHours || ""}
                onChange={(e) =>
                  setSettings(settings ? { ...settings, businessHours: e.target.value } : null)
                }
                placeholder="Mon-Fri: 10am-6pm, Sat: 10am-4pm, Sun: Closed"
                className="mt-1"
              />
            </div>
          </CardContent>
        </Card>

        {/* SMS Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SMS Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-900">Enable SMS Notifications</p>
                <p className="text-sm text-slate-500">
                  Send automated SMS updates to customers
                </p>
              </div>
              <Switch
                checked={settings?.smsEnabled || false}
                onCheckedChange={(checked) =>
                  setSettings(settings ? { ...settings, smsEnabled: checked } : null)
                }
              />
            </div>

            {settings?.smsEnabled && (
              <>
                <div>
                  <Label className="text-slate-500 text-sm">SMS Provider</Label>
                  <Select
                    value={settings?.smsProvider || "twilio"}
                    onChange={(e) =>
                      setSettings(settings ? { ...settings, smsProvider: e.target.value } : null)
                    }
                    className="mt-1"
                  >
                    <option value="twilio">Twilio</option>
                    <option value="messagebird">MessageBird</option>
                    <option value="vonage">Vonage</option>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-500 text-sm">From Phone Number</Label>
                  <Input
                    type="tel"
                    value={settings?.smsFromNumber || ""}
                    onChange={(e) =>
                      setSettings(settings ? { ...settings, smsFromNumber: e.target.value } : null)
                    }
                    placeholder="123-456-7890"
                    className="mt-1"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Note: SMS integration not yet implemented for demo. Settings are saved but messages will not be sent.
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Default Service Prices */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Default Service Prices</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((service) => (
              <div
                key={service.id}
                className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0"
              >
                <span className="flex-1 text-slate-900">{service.name}</span>
                <span className="font-medium text-slate-900">
                  ${(service.defaultUnitPriceCents / 100).toFixed(2)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Edit2 className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={handleAddService}
              className="w-full mt-4"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Service
            </Button>
          </CardContent>
        </Card>

        {/* Last Saved */}
        <p className="text-sm text-slate-500 text-center">
          Last saved: Today at 2:45 PM
        </p>
      </div>
    </div>
  );
}
