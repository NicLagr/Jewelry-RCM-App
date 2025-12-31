"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  AlertTriangle,
  Search,
  X,
  Upload,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, cn } from "@/lib/utils";
import { compressImageForUpload } from "@/lib/client-image-compression";

interface PendingPhoto {
  id: string;
  file: File;
  preview: string;
}

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
}

interface ServiceCatalog {
  id: string;
  name: string;
  defaultUnitPriceCents: number;
}

interface ServiceLine {
  id: string;
  serviceCatalogId: string | null;
  name: string;
  qty: number;
  unitPriceCents: number;
}

interface User {
  id: string;
  name: string;
  role: string;
}

// Price input component that allows natural typing
function PriceInput({ value, onChange }: { value: number; onChange: (cents: number) => void }) {
  const [displayValue, setDisplayValue] = useState(value ? (value / 100).toString() : "");

  // Update display when external value changes (e.g., selecting a service)
  useEffect(() => {
    if (value && !displayValue) {
      setDisplayValue((value / 100).toString());
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow typing naturally - only filter out non-numeric chars except decimal
    const input = e.target.value.replace(/[^0-9.]/g, "");
    // Prevent multiple decimals
    const parts = input.split(".");
    const cleaned = parts.length > 2 ? parts[0] + "." + parts.slice(1).join("") : input;
    setDisplayValue(cleaned);
  };

  const handleBlur = () => {
    // Format and save on blur
    const num = parseFloat(displayValue) || 0;
    const cents = Math.round(num * 100);
    onChange(cents);
    // Format display to 2 decimal places if there's a value
    if (cents > 0) {
      setDisplayValue((cents / 100).toFixed(2));
    } else {
      setDisplayValue("");
    }
  };

  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
      <Input
        type="text"
        inputMode="decimal"
        placeholder="0.00"
        value={displayValue}
        onChange={handleChange}
        onBlur={handleBlur}
        className="w-full text-right text-sm pl-7 pr-3"
      />
    </div>
  );
}

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });

  const [itemInfo, setItemInfo] = useState({
    description: "",
  });

  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [promisedDate, setPromisedDate] = useState("");
  const [promisedTime, setPromisedTime] = useState("");
  const [customJobNumber, setCustomJobNumber] = useState("");
  const [depositCents, setDepositCents] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [customersRes, servicesRes, usersRes] = await Promise.all([
        fetch("/api/customers"),
        fetch("/api/services"),
        fetch("/api/users"),
      ]);

      if (customersRes.ok) setCustomers(await customersRes.json());
      if (servicesRes.ok) setServices(await servicesRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  };

  const filteredCustomers = customers.filter((c) => {
    const search = customerSearch.toLowerCase();
    return (
      c.firstName.toLowerCase().includes(search) ||
      c.lastName.toLowerCase().includes(search) ||
      c.phone?.includes(search) ||
      c.email?.toLowerCase().includes(search)
    );
  });

  const addServiceLine = () => {
    setServiceLines([
      ...serviceLines,
      {
        id: crypto.randomUUID(),
        serviceCatalogId: null,
        name: "",
        qty: 1,
        unitPriceCents: 0,
      },
    ]);
  };

  const updateServiceLine = (id: string, updates: Partial<ServiceLine>) => {
    setServiceLines(
      serviceLines.map((line) =>
        line.id === id ? { ...line, ...updates } : line
      )
    );
  };

  const removeServiceLine = (id: string) => {
    setServiceLines(serviceLines.filter((line) => line.id !== id));
  };

  const handleServiceSelect = (lineId: string, serviceCatalogId: string) => {
    if (serviceCatalogId === "custom") {
      updateServiceLine(lineId, { serviceCatalogId: null, name: "", unitPriceCents: 0 });
    } else {
      const service = services.find((s) => s.id === serviceCatalogId);
      if (service) {
        updateServiceLine(lineId, {
          serviceCatalogId: service.id,
          name: service.name,
          unitPriceCents: service.defaultUnitPriceCents,
        });
      }
    }
  };

  const subtotal = serviceLines.reduce(
    (sum, line) => sum + line.qty * line.unitPriceCents,
    0
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newPhotos: PendingPhoto[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Validate file type
      if (!file.type.startsWith("image/")) continue;
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) continue;

      newPhotos.push({
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setPendingPhotos([...pendingPhotos, ...newPhotos]);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePendingPhoto = (id: string) => {
    const photo = pendingPhotos.find((p) => p.id === id);
    if (photo) {
      URL.revokeObjectURL(photo.preview);
    }
    setPendingPhotos(pendingPhotos.filter((p) => p.id !== id));
  };

  const uploadPhotosForJob = async (jobId: string) => {
    if (pendingPhotos.length === 0) return;

    setUploadingPhotos(true);
    try {
      for (const photo of pendingPhotos) {
        // Compress image client-side before upload
        const compressedFile = await compressImageForUpload(photo.file);
        
        const formData = new FormData();
        formData.append("file", compressedFile);

        const res = await fetch(`/api/jobs/${jobId}/photos`, {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error("Photo upload failed:", errorData);
        }
      }
    } catch (error) {
      console.error("Error uploading photos:", error);
    } finally {
      setUploadingPhotos(false);
      // Cleanup preview URLs
      pendingPhotos.forEach((p) => URL.revokeObjectURL(p.preview));
    }
  };

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setPromisedDate(date.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Handle optional promised date
      let promisedAt = null;
      if (promisedDate) {
        promisedAt = promisedTime
          ? `${promisedDate}T${promisedTime}:00`
          : `${promisedDate}T17:00:00`;
      }

      const payload = {
        customerId: selectedCustomer?.id,
        newCustomer: isNewCustomer ? newCustomer : null,
        customJobNumber: customJobNumber ? parseInt(customJobNumber) : null,
        itemType: "Ring", // Default for now
        description: itemInfo.description,
        issue: itemInfo.description,
        promisedAt,
        assigneeId: null,
        depositCents: depositCents,
        services: serviceLines.map((line) => ({
          serviceCatalogId: line.serviceCatalogId,
          name: line.name,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
        })),
      };

      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const job = await res.json();
        // Upload photos after job is created
        if (pendingPhotos.length > 0) {
          await uploadPhotosForJob(job.id);
        }
        router.push(`/jobs/${job.id}`);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create job");
      }
    } catch (error) {
      console.error("Error creating job:", error);
      alert("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Promised date is now optional
  const isValid =
    (selectedCustomer || (isNewCustomer && newCustomer.firstName && newCustomer.lastName));

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/jobs">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-slate-900">Ticket Creation</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Job Number Input */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Job Number</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1 max-w-xs">
                <Input
                  type="number"
                  placeholder="Enter job/envelope number"
                  value={customJobNumber}
                  onChange={(e) => setCustomJobNumber(e.target.value)}
                  className="text-lg font-mono"
                />
              </div>
              <p className="text-sm text-slate-500">
                Enter the number from your job envelope. Leave blank to auto-generate.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left Column - Customer Info & Services */}
          <div className="space-y-6">
            {/* Customer Info */}
            <Card className="min-h-[280px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Customer Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isNewCustomer && !selectedCustomer && (
              <div className="relative">
                <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                        placeholder="Search customers..."
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerSearch(true);
                    }}
                    onFocus={() => setShowCustomerSearch(true)}
                        className="pl-10"
                  />
                </div>
                {showCustomerSearch && customerSearch && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length === 0 ? (
                      <div className="p-4 text-center text-slate-500">
                        No customers found
                      </div>
                    ) : (
                      filteredCustomers.map((customer) => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => {
                            setSelectedCustomer(customer);
                            setShowCustomerSearch(false);
                            setCustomerSearch("");
                                setNewCustomer({
                                  firstName: customer.firstName,
                                  lastName: customer.lastName,
                                  phone: customer.phone || "",
                                  email: customer.email || "",
                                });
                          }}
                          className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0"
                        >
                          <div className="font-medium">
                            {customer.firstName} {customer.lastName}
                          </div>
                          <div className="text-sm text-slate-500">
                            {customer.phone} {customer.email && `• ${customer.email}`}
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

                {(selectedCustomer || isNewCustomer) && (
                  <div className="space-y-4">
                    <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                        onClick={() => {
                          setSelectedCustomer(null);
                          setIsNewCustomer(false);
                          setNewCustomer({ firstName: "", lastName: "", phone: "", email: "" });
                        }}
                  >
                        Change Customer
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                        <Label className="text-slate-500 text-sm">First Name</Label>
                    <Input
                          value={selectedCustomer ? selectedCustomer.firstName : newCustomer.firstName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, firstName: e.target.value })}
                          disabled={!!selectedCustomer}
                      className="mt-1"
                    />
                  </div>
                  <div>
                        <Label className="text-slate-500 text-sm">Last Name</Label>
                    <Input
                          value={selectedCustomer ? selectedCustomer.lastName : newCustomer.lastName}
                          onChange={(e) => setNewCustomer({ ...newCustomer, lastName: e.target.value })}
                          disabled={!!selectedCustomer}
                      className="mt-1"
                    />
                      </div>
                  </div>
                  <div>
                      <Label className="text-slate-500 text-sm">Phone</Label>
                    <Input
                      type="tel"
                        value={selectedCustomer ? (selectedCustomer.phone || "") : newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                        disabled={!!selectedCustomer}
                      className="mt-1"
                    />
                  </div>
                  <div>
                      <Label className="text-slate-500 text-sm">Email</Label>
                    <Input
                      type="email"
                        value={selectedCustomer ? (selectedCustomer.email || "") : newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                        disabled={!!selectedCustomer}
                      className="mt-1"
                    />
                  </div>
                </div>
                )}

                {!selectedCustomer && !isNewCustomer && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNewCustomer(true)}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Customer
                  </Button>
            )}
          </CardContent>
        </Card>

            {/* Services */}
            <Card className="min-h-[200px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Services List */}
                {serviceLines.length > 0 && (
                  <div className="space-y-4">
                    {serviceLines.map((line, index) => (
                      <div key={line.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-start justify-between gap-3">
                          {/* Service Name Section */}
                          <div className="flex-1 min-w-0">
                            <Label className="text-xs text-slate-500 mb-1 block">Service</Label>
                            <Select
                              value={line.serviceCatalogId || "custom"}
                              onChange={(e) => handleServiceSelect(line.id, e.target.value)}
                              className="w-full text-sm"
                            >
                              <option value="custom">Select or type service...</option>
                              {services.map((service) => (
                                <option key={service.id} value={service.id}>
                                  {service.name}
                                </option>
                              ))}
                            </Select>
                            {!line.serviceCatalogId && (
                              <Input
                                placeholder="Custom service name"
                                value={line.name}
                                onChange={(e) => updateServiceLine(line.id, { name: e.target.value })}
                                className="mt-2 text-sm"
                              />
                            )}
                          </div>
                          
                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeServiceLine(line.id)}
                            className="h-8 w-8 p-0 shrink-0"
                          >
                            <X className="h-4 w-4 text-slate-400" />
                          </Button>
                        </div>
                        
                        {/* Qty, Price, Total Row */}
                        <div className="grid grid-cols-3 gap-4 mt-3 pt-3 border-t border-slate-200">
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Qty</Label>
                            <Input
                              type="number"
                              min="1"
                              value={line.qty}
                              onChange={(e) => updateServiceLine(line.id, { qty: parseInt(e.target.value) || 1 })}
                              className="w-full text-sm text-center"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Unit Price</Label>
                            <PriceInput
                              value={line.unitPriceCents}
                              onChange={(cents) => updateServiceLine(line.id, { unitPriceCents: cents })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-slate-500 mb-1 block">Total</Label>
                            <div className="h-10 flex items-center justify-end font-semibold text-slate-900">
                              {formatCents(line.qty * line.unitPriceCents)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={addServiceLine}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>

                {serviceLines.length > 0 && (
                  <div className="pt-4 border-t border-slate-200 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="text-lg font-semibold text-slate-900">
                        {formatCents(subtotal)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Deposit:</span>
                      <div className="w-32">
                        <PriceInput
                          value={depositCents}
                          onChange={(cents) => setDepositCents(cents)}
                        />
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                      <span className="font-medium text-slate-700">Balance Due:</span>
                      <span className="text-xl font-bold text-slate-900">
                        {formatCents(subtotal - depositCents)}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Item Info & Photo Upload */}
          <div className="space-y-6">
            {/* Item Info */}
            <Card className="min-h-[280px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Item Info</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label className="text-slate-500 text-sm">Description</Label>
                  <Textarea
                    value={itemInfo.description}
                    onChange={(e) => setItemInfo({ ...itemInfo, description: e.target.value })}
                    placeholder="Describe the item and any issues (e.g., Gold solitaire ring, loose center prong)"
                    className="mt-1 min-h-[140px]"
                    rows={5}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <Card className="min-h-[200px]">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Photo Upload</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-colors"
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-slate-600 font-medium">Add Photos</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Click to select images (max 10MB each)
                  </p>
                </button>

                {/* Pending Photos Preview */}
                {pendingPhotos.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-slate-600">
                      {pendingPhotos.length} photo{pendingPhotos.length !== 1 ? "s" : ""} selected
                    </p>
                    <div className="grid grid-cols-4 gap-2">
                      {pendingPhotos.map((photo) => (
                        <div
                          key={photo.id}
                          className="relative aspect-square bg-slate-100 rounded-lg overflow-hidden group"
                        >
                          <img
                            src={photo.preview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removePendingPhoto(photo.id)}
                            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Promised Date - Full Width */}
        <Card className="mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">Promised Date</CardTitle>
              <span className="text-sm text-slate-400 font-normal">(optional)</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-500 text-sm">Date</Label>
                <Input
                  type="date"
                  value={promisedDate}
                  onChange={(e) => setPromisedDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-500 text-sm">Time</Label>
                <Input
                  type="time"
                  value={promisedTime}
                  onChange={(e) => setPromisedTime(e.target.value)}
                  placeholder="HH:MM AM"
                  className="mt-1"
                />
              </div>
              </div>

            {/* Quick Select Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-slate-500">Quick Select:</span>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate(0)}>
                Today
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate(1)}>
                Tomorrow
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate(3)}>
                3 Days
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setQuickDate(7)}>
                1 Week
              </Button>
              {promisedDate && (
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => { setPromisedDate(""); setPromisedTime(""); }}
                  className="text-slate-500"
                >
                  Clear
                </Button>
              )}
            </div>

            {/* Info message */}
            <p className="text-sm text-slate-500">
              Leave blank if no specific date is promised. If set, this date will be shown to the customer in SMS notifications.
            </p>
          </CardContent>
        </Card>

        {/* Footer Buttons */}
        <div className="flex justify-between gap-4 pt-6 mt-6 border-t border-slate-200">
          <Link href="/jobs">
            <Button type="button" variant="outline" size="lg">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <Button
            type="submit"
            size="lg"
            className={cn(!isValid && "opacity-50")}
            disabled={!isValid || loading || uploadingPhotos}
          >
            {loading || uploadingPhotos ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingPhotos ? "Uploading photos..." : "Creating..."}
              </>
            ) : (
              "Save Job"
            )}
          </Button>
        </div>
      </form>

    </div>
  );
}
