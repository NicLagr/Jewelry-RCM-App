"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle,
  User,
  Phone,
  Mail,
  Package,
  Image as ImageIcon,
  FileText,
  Activity,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDate,
  formatDateTime,
  formatCents,
  getStatusColor,
  getStatusLabel,
  isOverdue,
  cn,
} from "@/lib/utils";

interface Job {
  id: string;
  jobNumber: number;
  status: string;
  itemType: string;
  itemMetal: string | null;
  itemStone: string | null;
  description: string | null;
  issue: string;
  promisedAt: string;
  depositCents: number;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
  };
  assignee: {
    id: string;
    name: string;
    email: string;
  } | null;
  services: {
    id: string;
    name: string;
    qty: number;
    unitPriceCents: number;
  }[];
  media: {
    id: string;
    url: string;
    filename: string | null;
    createdAt: string;
  }[];
  activities: {
    id: string;
    type: string;
    message: string;
    createdAt: string;
    user: {
      id: string;
      name: string;
    } | null;
  }[];
}

interface User {
  id: string;
  name: string;
  role: string;
}

const STATUSES = ["INTAKE", "IN_PROGRESS", "READY", "PICKED_UP"];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [showSmsModal, setShowSmsModal] = useState(false);

  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`/api/jobs/${id}`);
      if (res.ok) {
        setJob(await res.json());
      } else {
        router.push("/jobs");
      }
    } catch (error) {
      console.error("Error fetching job:", error);
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    fetchJob();
    fetchUsers();
  }, [fetchJob]);

  const updateJob = async (updates: Partial<Job>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        fetchJob();
      }
    } catch (error) {
      console.error("Error updating job:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleMarkReady = async () => {
    await updateJob({ status: "READY" });
  };

  const handleSendSms = async () => {
    if (!job || !job.customer.phone || !smsMessage) return;

    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          phone: job.customer.phone,
          message: smsMessage,
        }),
      });

      if (res.ok) {
        setShowSmsModal(false);
        setSmsMessage("");
        fetchJob();
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
      </div>
    );
  }

  if (!job) {
    return null;
  }

  const overdue = isOverdue(job.promisedAt, job.status);
  const subtotal = job.services.reduce(
    (sum, s) => sum + s.qty * s.unitPriceCents,
    0
  );

  // Format promised date as MM/DD
  const promisedDate = new Date(job.promisedAt);
  const formattedPromised = `${String(promisedDate.getMonth() + 1).padStart(2, '0')}/${String(promisedDate.getDate()).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="/jobs">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
                  <h1 className="text-2xl font-bold text-slate-900">
                Ticket #{job.jobNumber} — Job Detail
                  </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Top Row - Tabs and Controls */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6">
          {/* Tabs */}
          <Tabs defaultValue="overview" className="flex-1">
            <TabsList className="bg-slate-100">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="billing">Billing</TabsTrigger>
            </TabsList>

            {/* Right side controls */}
            <div className="flex items-center gap-4 mt-4 lg:mt-0 lg:absolute lg:right-4 lg:top-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Promised date</span>
                <span className="font-medium">{formattedPromised}</span>
                </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">Assignee</span>
                <Select
                  value={job.assignee?.id || ""}
                  onChange={(e) =>
                    updateJob({ assigneeId: e.target.value || null } as Partial<Job>)
                  }
                  disabled={updating}
                  className="w-32"
                >
                  <option value="">Unassigned</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name}
                    </option>
                  ))}
                </Select>
              </div>
              <Select
                value={job.status}
                onChange={(e) => updateJob({ status: e.target.value })}
                disabled={updating}
                className="w-32"
              >
                {STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getStatusLabel(status)}
                  </option>
                ))}
              </Select>
            </div>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Customer, Item, Services */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Customer */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Customer</CardTitle>
                    </CardHeader>
                    <CardContent>
            <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {job.customer.firstName} {job.customer.lastName}
                        </span>
                        <span className="text-slate-500">•</span>
                        {job.customer.phone && (
                          <a href={`tel:${job.customer.phone}`} className="text-slate-600 hover:text-[#1a4d3e]">
                            {job.customer.phone}
                          </a>
                        )}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        Opt-in: SMS
                      </div>
                    </CardContent>
                  </Card>

                  {/* Item */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Item</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 text-slate-900">
                        <span>{job.itemType}</span>
                        {job.itemMetal && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span>{job.itemMetal}</span>
                          </>
                        )}
                        {job.itemStone && (
                          <>
                            <span className="text-slate-400">•</span>
                            <span>{job.itemStone}</span>
                          </>
                        )}
                      </div>
                      {job.description && (
                        <p className="text-sm text-slate-500 mt-1">
                          Desc: {job.description}
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {/* Services */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Services</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-slate-200">
                              <th className="text-left py-2 font-medium text-slate-500">Service</th>
                              <th className="text-center py-2 font-medium text-slate-500">Qty</th>
                              <th className="text-right py-2 font-medium text-slate-500">Unit</th>
                              <th className="text-right py-2 font-medium text-slate-500">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {job.services.map((service) => (
                              <tr key={service.id} className="border-b border-slate-100">
                                <td className="py-2">{service.name}</td>
                                <td className="py-2 text-center">{`{${service.qty}}`}</td>
                                <td className="py-2 text-right">${(service.unitPriceCents / 100).toFixed(0)}</td>
                                <td className="py-2 text-right">${((service.qty * service.unitPriceCents) / 100).toFixed(0)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issue */}
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base font-semibold">Issue</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-slate-900">{job.issue}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column - Totals and Actions */}
                <div className="space-y-6">
                  {/* Totals */}
                  <Card>
                    <CardContent className="pt-6">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total</span>
                          <span className="font-semibold">{formatCents(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Deposit</span>
                          <span className="font-semibold">{formatCents(job.depositCents)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Action Buttons */}
                  <div className="space-y-3">
              <Button
                variant="outline"
                      className="w-full"
                onClick={() => setShowSmsModal(true)}
                disabled={!job.customer.phone}
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Text
              </Button>
              {job.status !== "READY" && job.status !== "PICKED_UP" && (
                <Button
                        className="w-full"
                  onClick={handleMarkReady}
                  disabled={updating}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Mark Ready
                </Button>
              )}
            </div>
          </div>
        </div>
              </TabsContent>

            <TabsContent value="activity" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {job.activities.length === 0 ? (
                        <p className="text-slate-500 text-center py-8">
                          No activity yet
                        </p>
                      ) : (
                        job.activities.map((activity, index) => (
                          <div
                            key={activity.id}
                            className={cn(
                              "flex gap-4 pb-4",
                              index !== job.activities.length - 1 &&
                                "border-b border-slate-100"
                            )}
                          >
                            <div
                              className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                                activity.type === "STATUS_CHANGE"
                                  ? "bg-blue-100 text-blue-600"
                                  : activity.type === "SMS_SENT"
                                  ? "bg-green-100 text-green-600"
                                  : activity.type === "CREATED"
                                  ? "bg-purple-100 text-purple-600"
                                  : "bg-slate-100 text-slate-600"
                              )}
                            >
                              {activity.type === "STATUS_CHANGE" ? (
                                <Activity className="h-5 w-5" />
                              ) : activity.type === "SMS_SENT" ? (
                                <MessageSquare className="h-5 w-5" />
                              ) : (
                                <FileText className="h-5 w-5" />
                              )}
                            </div>
                            <div className="flex-1">
                              <p className="text-slate-900">{activity.message}</p>
                              <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                                <span>{formatDateTime(activity.createdAt)}</span>
                                {activity.user && (
                                  <>
                                    <span>•</span>
                                    <span>{activity.user.name}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            <TabsContent value="media" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Photos & Media</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {job.media.length === 0 ? (
                      <div className="text-center py-12">
                        <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No photos uploaded</p>
                      <p className="text-xs text-slate-500 mt-2">
                        Note: Photo upload not yet implemented for demo
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {job.media.map((media) => (
                          <div
                            key={media.id}
                            className="aspect-square bg-slate-100 rounded-lg overflow-hidden"
                          >
                            <img
                              src={media.url}
                              alt={media.filename || "Job photo"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

            <TabsContent value="billing" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Subtotal</span>
                        <span className="font-medium">{formatCents(subtotal)}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-slate-100">
                        <span className="text-slate-600">Deposit Paid</span>
                        <span className="font-medium text-green-600">
                          -{formatCents(job.depositCents)}
                        </span>
                      </div>
                      <div className="flex justify-between py-3 text-lg">
                        <span className="font-semibold">Balance Due</span>
                      <span className="font-bold">{formatCents(subtotal - job.depositCents)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
        </div>
      </div>

      {/* SMS Modal */}
      {showSmsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Send Text Message</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-sm text-slate-500">To</span>
                <p className="font-medium">
                  {job.customer.firstName} {job.customer.lastName} ({job.customer.phone})
                </p>
              </div>
              <div>
                <Textarea
                  placeholder="Type your message..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowSmsModal(false);
                    setSmsMessage("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendSms}
                  disabled={!smsMessage.trim()}
                >
                  Send
                </Button>
              </div>
              <p className="text-xs text-slate-500 text-center">
                Note: SMS sending not yet implemented for demo
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
