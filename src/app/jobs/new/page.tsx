"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertTriangle,
  Search,
  Camera,
  FileText,
  ImageIcon,
  X,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents, cn } from "@/lib/utils";

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

export default function NewTicketPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [services, setServices] = useState<ServiceCatalog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);

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

  const setQuickDate = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    setPromisedDate(date.toISOString().split("T")[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const promisedAt = promisedTime
        ? `${promisedDate}T${promisedTime}:00`
        : `${promisedDate}T17:00:00`;

      const payload = {
        customerId: selectedCustomer?.id,
        newCustomer: isNewCustomer ? newCustomer : null,
        itemType: "Ring", // Default for now
        description: itemInfo.description,
        issue: itemInfo.description,
        promisedAt,
        assigneeId: null,
        depositCents: 0,
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

  const isValid =
    (selectedCustomer || (isNewCustomer && newCustomer.firstName && newCustomer.lastName)) &&
    promisedDate;

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
        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Customer Info & Services */}
          <div className="space-y-6">
            {/* Customer Info */}
        <Card>
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
        <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Services</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
                {/* Services Table */}
                {serviceLines.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-medium text-slate-500">Service Name</th>
                          <th className="text-center py-2 font-medium text-slate-500 w-16">Qty</th>
                          <th className="text-right py-2 font-medium text-slate-500 w-24">Unit Price</th>
                          <th className="text-right py-2 font-medium text-slate-500 w-24">Total</th>
                          <th className="w-10"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {serviceLines.map((line) => (
                          <tr key={line.id} className="border-b border-slate-100">
                            <td className="py-2">
                    <Select
                      value={line.serviceCatalogId || "custom"}
                      onChange={(e) => handleServiceSelect(line.id, e.target.value)}
                                className="text-sm"
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
                                  className="mt-1 text-sm"
                      />
                    )}
                            </td>
                            <td className="py-2 text-center">
                    <Input
                      type="number"
                      min="1"
                      value={line.qty}
                                onChange={(e) => updateServiceLine(line.id, { qty: parseInt(e.target.value) || 1 })}
                                className="w-16 text-center text-sm"
                    />
                            </td>
                            <td className="py-2 text-right">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={(line.unitPriceCents / 100).toFixed(2)}
                                onChange={(e) => updateServiceLine(line.id, { unitPriceCents: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                                className="w-24 text-right text-sm"
                    />
                            </td>
                            <td className="py-2 text-right font-medium">
                              {formatCents(line.qty * line.unitPriceCents)}
                            </td>
                            <td className="py-2">
                <Button
                  type="button"
                  variant="ghost"
                                size="sm"
                  onClick={() => removeServiceLine(line.id)}
                                className="h-8 w-8 p-0"
                >
                                <X className="h-4 w-4 text-slate-400" />
                </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
                  <div className="flex justify-end pt-2 border-t border-slate-200">
                <div className="text-right">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="ml-3 text-lg font-bold text-slate-900">
                    {formatCents(subtotal)}
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
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Item Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-slate-500 text-sm">Description</Label>
                  <Textarea
                    value={itemInfo.description}
                    onChange={(e) => setItemInfo({ ...itemInfo, description: e.target.value })}
                    placeholder="e.g., Solitaire, loose prong"
                    className="mt-1"
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photo Upload */}
        <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Photo Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  onClick={() => setShowPhotoModal(true)}
                  className="w-full border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors"
                >
                  <Camera className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-600 font-medium">Add Photo</p>
                  <p className="text-sm text-slate-400 mt-1">
                    Tap to upload photos
                  </p>
                </button>
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Note: Photo upload not yet implemented for demo
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Promised Date - Full Width */}
        <Card className="mt-6">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Promised Date</CardTitle>
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
                <Label className="text-slate-500 text-sm">Time (optional)</Label>
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
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800">
                This date will be shown to customer in SMS notifications
              </p>
            </div>
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
          <div className="flex flex-col gap-2">
            <div className="flex gap-3">
              <Button type="button" variant="outline" size="lg" disabled title="Not yet implemented">
                Save Draft
              </Button>
          <Button
            type="submit"
            size="lg"
                className={cn(!isValid && "opacity-50")}
            disabled={!isValid || loading}
          >
                {loading ? "Creating..." : "Save Job"}
          </Button>
            </div>
            <p className="text-xs text-slate-400 text-right">
              Save Draft not yet implemented for demo
            </p>
          </div>
        </div>
      </form>

      {/* Photo Upload Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-sm">
            <CardHeader>
              <CardTitle>Add Photo</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowPhotoModal(false)} disabled>
                <Camera className="h-5 w-5 mr-3" />
                Take Photo
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowPhotoModal(false)} disabled>
                <FileText className="h-5 w-5 mr-3" />
                Scan Document
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => setShowPhotoModal(false)} disabled>
                <ImageIcon className="h-5 w-5 mr-3" />
                Choose from Library
              </Button>
              <p className="text-xs text-slate-500 text-center py-2">
                Note: Photo features not yet implemented for demo
              </p>
              <Button variant="ghost" className="w-full" onClick={() => setShowPhotoModal(false)}>
                Cancel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
