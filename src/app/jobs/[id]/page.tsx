"use client";

import { useState, useEffect, useCallback, use, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle,
  Image as ImageIcon,
  FileText,
  Activity,
  Upload,
  X,
  Trash2,
  Loader2,
  Archive,
  Pencil,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  formatDateTime,
  formatCents,
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
  promisedAt: string | null;
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

interface StoreSettings {
  storeName: string;
  smsEnabled: boolean;
}

const STATUSES = ["INTAKE", "IN_PROGRESS", "READY", "PICKED_UP", "ARCHIVED"];

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [smsMessage, setSmsMessage] = useState("");
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [sendingSms, setSendingSms] = useState(false);
  const [smsError, setSmsError] = useState<string | null>(null);
  const [storeSettings, setStoreSettings] = useState<StoreSettings | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Edit mode states
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [editingItem, setEditingItem] = useState(false);
  const [editingIssue, setEditingIssue] = useState(false);
  const [customerEdits, setCustomerEdits] = useState({ firstName: "", lastName: "", phone: "", email: "" });
  const [itemEdits, setItemEdits] = useState({ itemType: "", itemMetal: "", itemStone: "", description: "" });
  const [issueEdit, setIssueEdit] = useState("");

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

  const fetchStoreSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        setStoreSettings(await res.json());
      }
    } catch (error) {
      console.error("Error fetching store settings:", error);
    }
  };

  useEffect(() => {
    fetchJob();
    fetchUsers();
    fetchStoreSettings();
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

  const handleMarkPickedUp = async () => {
    await updateJob({ status: "PICKED_UP" });
  };

  const handleArchive = async () => {
    await updateJob({ status: "ARCHIVED" });
    router.push("/jobs");
  };

  const handleSendSms = async () => {
    if (!job || !job.customer.phone || !smsMessage) return;

    setSendingSms(true);
    setSmsError(null);

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

      const data = await res.json();

      if (res.ok) {
        setShowSmsModal(false);
        setSmsMessage("");
        fetchJob();
      } else {
        setSmsError(data.error || "Failed to send SMS");
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      setSmsError("An unexpected error occurred");
    } finally {
      setSendingSms(false);
    }
  };

  const getDefaultSmsMessage = () => {
    if (!job || !storeSettings) return "";
    return `Hi ${job.customer.firstName}, your item is ready for pickup at ${storeSettings.storeName}. Thank you!`;
  };

  const handleOpenSmsModal = () => {
    setSmsError(null);
    // Pre-fill with default message if empty
    if (!smsMessage) {
      setSmsMessage(getDefaultSmsMessage());
    }
    setShowSmsModal(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !job) return;

    setUploadingPhoto(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        // Validate file type
        if (!file.type.startsWith("image/")) continue;
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) continue;

        const formData = new FormData();
        formData.append("file", file);

        await fetch(`/api/jobs/${job.id}/photos`, {
          method: "POST",
          body: formData,
        });
      }
      fetchJob();
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!job) return;

    setDeletingPhotoId(photoId);
    try {
      const res = await fetch(`/api/jobs/${job.id}/photos/${photoId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchJob();
      }
    } catch (error) {
      console.error("Error deleting photo:", error);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  // Edit handlers
  const startEditingCustomer = () => {
    if (!job) return;
    setCustomerEdits({
      firstName: job.customer.firstName,
      lastName: job.customer.lastName,
      phone: job.customer.phone || "",
      email: job.customer.email || "",
    });
    setEditingCustomer(true);
  };

  const saveCustomerEdits = async () => {
    if (!job) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/customers/${job.customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(customerEdits),
      });
      if (res.ok) {
        fetchJob();
        setEditingCustomer(false);
      }
    } catch (error) {
      console.error("Error updating customer:", error);
    } finally {
      setUpdating(false);
    }
  };

  const startEditingItem = () => {
    if (!job) return;
    setItemEdits({
      itemType: job.itemType,
      itemMetal: job.itemMetal || "",
      itemStone: job.itemStone || "",
      description: job.description || "",
    });
    setEditingItem(true);
  };

  const saveItemEdits = async () => {
    if (!job) return;
    await updateJob({
      itemType: itemEdits.itemType,
      itemMetal: itemEdits.itemMetal || null,
      itemStone: itemEdits.itemStone || null,
      description: itemEdits.description || null,
    } as Partial<Job>);
    setEditingItem(false);
  };

  const startEditingIssue = () => {
    if (!job) return;
    setIssueEdit(job.issue);
    setEditingIssue(true);
  };

  const saveIssueEdit = async () => {
    if (!job) return;
    await updateJob({ issue: issueEdit } as Partial<Job>);
    setEditingIssue(false);
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

  const overdue = job.promisedAt ? isOverdue(job.promisedAt, job.status) : false;
  const subtotal = job.services.reduce(
    (sum, s) => sum + s.qty * s.unitPriceCents,
    0
  );

  // Format promised date as MM/DD (if exists)
  let formattedPromised = "Not set";
  if (job.promisedAt) {
    const promisedDate = new Date(job.promisedAt);
    formattedPromised = `${String(promisedDate.getMonth() + 1).padStart(2, '0')}/${String(promisedDate.getDate()).padStart(2, '0')}`;
  }

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
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-semibold">Customer</CardTitle>
                      {!editingCustomer && (
                        <Button variant="ghost" size="sm" onClick={startEditingCustomer}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingCustomer ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="First Name"
                              value={customerEdits.firstName}
                              onChange={(e) => setCustomerEdits({ ...customerEdits, firstName: e.target.value })}
                            />
                            <Input
                              placeholder="Last Name"
                              value={customerEdits.lastName}
                              onChange={(e) => setCustomerEdits({ ...customerEdits, lastName: e.target.value })}
                            />
                          </div>
                          <Input
                            placeholder="Phone"
                            value={customerEdits.phone}
                            onChange={(e) => setCustomerEdits({ ...customerEdits, phone: e.target.value })}
                          />
                          <Input
                            placeholder="Email"
                            value={customerEdits.email}
                            onChange={(e) => setCustomerEdits({ ...customerEdits, email: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveCustomerEdits} disabled={updating}>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingCustomer(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                          {job.customer.email && (
                            <div className="text-sm text-slate-500 mt-1">
                              {job.customer.email}
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>

                  {/* Item */}
                  <Card>
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-semibold">Item</CardTitle>
                      {!editingItem && (
                        <Button variant="ghost" size="sm" onClick={startEditingItem}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingItem ? (
                        <div className="space-y-3">
                          <Input
                            placeholder="Item Type (e.g., Ring, Necklace)"
                            value={itemEdits.itemType}
                            onChange={(e) => setItemEdits({ ...itemEdits, itemType: e.target.value })}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Input
                              placeholder="Metal (optional)"
                              value={itemEdits.itemMetal}
                              onChange={(e) => setItemEdits({ ...itemEdits, itemMetal: e.target.value })}
                            />
                            <Input
                              placeholder="Stone (optional)"
                              value={itemEdits.itemStone}
                              onChange={(e) => setItemEdits({ ...itemEdits, itemStone: e.target.value })}
                            />
                          </div>
                          <Textarea
                            placeholder="Description"
                            value={itemEdits.description}
                            onChange={(e) => setItemEdits({ ...itemEdits, description: e.target.value })}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveItemEdits} disabled={updating}>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingItem(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
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
                    <CardHeader className="pb-3 flex flex-row items-center justify-between">
                      <CardTitle className="text-base font-semibold">Issue</CardTitle>
                      {!editingIssue && (
                        <Button variant="ghost" size="sm" onClick={startEditingIssue}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent>
                      {editingIssue ? (
                        <div className="space-y-3">
                          <Textarea
                            value={issueEdit}
                            onChange={(e) => setIssueEdit(e.target.value)}
                            rows={3}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveIssueEdit} disabled={updating}>
                              <Save className="h-4 w-4 mr-1" /> Save
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingIssue(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-slate-900">{job.issue}</p>
                      )}
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
                onClick={handleOpenSmsModal}
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
              {job.status === "READY" && (
                <Button
                  className="w-full"
                  variant="gold"
                  onClick={handleMarkPickedUp}
                  disabled={updating}
                >
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Mark Picked Up
                </Button>
              )}
              {job.status === "PICKED_UP" && (
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleArchive}
                  disabled={updating}
                >
                  <Archive className="h-5 w-5 mr-2" />
                  Archive Ticket
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
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Photos & Media</CardTitle>
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploadingPhoto}
                      >
                        {uploadingPhoto ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4 mr-2" />
                            Add Photos
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {job.media.length === 0 ? (
                      <div className="text-center py-12">
                        <ImageIcon className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No photos uploaded</p>
                        <Button
                          variant="outline"
                          className="mt-4"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingPhoto}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload First Photo
                        </Button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                        {job.media.map((media) => (
                          <div
                            key={media.id}
                            className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group cursor-pointer"
                            onClick={() => setSelectedPhoto(media.url)}
                          >
                            <img
                              src={media.url}
                              alt={media.filename || "Job photo"}
                              className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(media.id);
                              }}
                              disabled={deletingPhotoId === media.id}
                              className="absolute top-2 right-2 bg-black/60 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              {deletingPhotoId === media.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                            {media.filename && (
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                                {media.filename}
                              </div>
                            )}
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
                  disabled={sendingSms}
                />
              </div>
              {smsError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{smsError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowSmsModal(false);
                    setSmsMessage("");
                    setSmsError(null);
                  }}
                  disabled={sendingSms}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSendSms}
                  disabled={!smsMessage.trim() || sendingSms}
                >
                  {sendingSms ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Photo Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-slate-300 transition-colors"
            onClick={() => setSelectedPhoto(null)}
          >
            <X className="h-8 w-8" />
          </button>
          <img
            src={selectedPhoto}
            alt="Full size photo"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
