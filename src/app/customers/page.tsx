"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Users,
  Briefcase,
  DollarSign,
  Star,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { formatCents, formatDate, cn } from "@/lib/utils";

interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  vip: boolean;
  lastVisitAt: string;
  totalJobs: number;
  activeJobs: number;
  lifetimeValueCents: number;
}

export default function CustomersPage() {
  const searchParams = useSearchParams();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "");
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [newCustomer, setNewCustomer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    vip: false,
  });
  const [deletingCustomerId, setDeletingCustomerId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [editForm, setEditForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    vip: false,
  });
  const [saving, setSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (activeFilter === "vip") params.set("filter", "vip");
      if (activeFilter === "recent") params.set("filter", "recent");

      const res = await fetch(`/api/customers?${params.toString()}`);
      if (res.ok) {
        setCustomers(await res.json());
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      if (res.ok) {
        setShowNewCustomerModal(false);
        setNewCustomer({
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          vip: false,
        });
        fetchCustomers();
      }
    } catch (error) {
      console.error("Error creating customer:", error);
    }
  };

  const handleEditCustomer = (customer: Customer) => {
    setEditingCustomer(customer);
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone || "",
      email: customer.email || "",
      vip: customer.vip,
    });
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/customers/${editingCustomer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (res.ok) {
        setEditingCustomer(null);
        fetchCustomers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to update customer");
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      alert("An error occurred while updating");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (customerId: string, customerName: string) => {
    if (!confirm(`Are you sure you want to delete ${customerName}? This cannot be undone.`)) {
      return;
    }

    setDeletingCustomerId(customerId);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchCustomers();
      } else {
        const data = await res.json();
        setDeleteError(data.error || "Failed to delete customer");
        setTimeout(() => setDeleteError(null), 5000);
      }
    } catch (error) {
      console.error("Error deleting customer:", error);
      setDeleteError("An error occurred while deleting");
      setTimeout(() => setDeleteError(null), 5000);
    } finally {
      setDeletingCustomerId(null);
    }
  };

  // Calculate summary stats
  const totalCustomers = customers.length;
  const totalActiveJobs = customers.reduce((sum, c) => sum + c.activeJobs, 0);
  const totalLifetimeValue = customers.reduce(
    (sum, c) => sum + c.lifetimeValueCents,
    0
  );

  // Pagination
  const totalPages = Math.ceil(customers.length / itemsPerPage);
  const paginatedCustomers = customers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const filters = [
    { id: "all", label: "All" },
    { id: "recent", label: "Recent" },
    { id: "vip", label: "VIP" },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Delete Error Toast */}
      {deleteError && (
        <div className="fixed top-20 right-4 z-50 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg shadow-lg max-w-sm">
          <p className="text-sm font-medium">{deleteError}</p>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <h1 className="text-2xl font-bold text-slate-900">Customer Directory</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Summary Stats and Filters Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Summary Stats */}
          <div className="flex flex-wrap gap-4">
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-400" />
                <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Total Customers</p>
                <p className="text-xl font-bold text-slate-900">{totalCustomers}</p>
              </div>
                </div>
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-3">
              <Briefcase className="h-5 w-5 text-slate-400" />
                <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Active Jobs</p>
                <p className="text-xl font-bold text-slate-900">{totalActiveJobs}</p>
              </div>
                </div>
            <div className="bg-white rounded-xl border border-slate-200 px-5 py-3 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-slate-400" />
                <div>
                <p className="text-xs text-slate-500 uppercase tracking-wide">Lifetime Value</p>
                <p className="text-xl font-bold text-slate-900">{formatCents(totalLifetimeValue)}</p>
              </div>
        </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all border",
                  activeFilter === filter.id
                    ? "bg-[#1a4d3e] text-white border-[#1a4d3e]"
                    : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search customers by name, phone, or email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white"
          />
        </div>

        {/* Customer Table */}
        <Card className="border border-slate-200">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
              </div>
            ) : customers.length === 0 ? (
              <div className="text-center py-20">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No customers found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50">
                      <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Name
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">
                        Contact
                      </th>
                      <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">
                        Last Visit
                      </th>
                      <th className="text-center py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Total Jobs
                      </th>
                      <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                        Lifetime Value
                      </th>
                      <th className="py-4 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-medium">
                              {customer.firstName[0]}
                              {customer.lastName[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-slate-900">
                                  {customer.firstName} {customer.lastName}
                                </span>
                              </div>
                              {customer.vip && (
                                <span className="text-xs text-amber-600 font-medium flex items-center gap-1 mt-0.5">
                                  <Star className="h-3 w-3 fill-amber-500" />
                                  VIP Customer
                                </span>
                              )}
                              <div className="sm:hidden text-sm text-slate-500 mt-1">
                                {customer.phone || customer.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell">
                          <div className="space-y-1">
                            {customer.phone && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Phone className="h-3.5 w-3.5 text-slate-400" />
                                {customer.phone}
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-1 text-sm text-slate-600">
                                <Mail className="h-3.5 w-3.5 text-slate-400" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600 hidden md:table-cell">
                          {formatDate(customer.lastVisitAt)}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className="text-sm text-slate-600">{customer.totalJobs} jobs</span>
                        </td>
                        <td className="py-4 px-4 text-right font-medium text-slate-900">
                          {formatCents(customer.lifetimeValueCents)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                          <Link href={`/jobs/new?customerId=${customer.id}`}>
                              <Button size="sm" variant="gold">
                              New Ticket
                            </Button>
                          </Link>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                              onClick={() => handleEditCustomer(customer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                              onClick={() => handleDeleteCustomer(customer.id, `${customer.firstName} ${customer.lastName}`)}
                              disabled={deletingCustomerId === customer.id}
                            >
                              {deletingCustomerId === customer.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-400" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer with Pagination and New Customer Button */}
        <div className="flex items-center justify-between">
          {/* Pagination */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span>
              Showing {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, customers.length)} of {customers.length} customers
            </span>
            <div className="flex items-center gap-1 ml-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(3, totalPages) }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={currentPage === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className="h-8 w-8 p-0"
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* New Customer Button */}
          <Button onClick={() => setShowNewCustomerModal(true)}>
            <Plus className="h-5 w-5 mr-2" />
            New Customer
          </Button>
        </div>
      </div>

      {/* New Customer Modal */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>New Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={newCustomer.firstName}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, firstName: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={newCustomer.lastName}
                      onChange={(e) =>
                        setNewCustomer({ ...newCustomer, lastName: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, phone: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, email: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="vip"
                    checked={newCustomer.vip}
                    onChange={(e) =>
                      setNewCustomer({ ...newCustomer, vip: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <Label htmlFor="vip" className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    VIP Customer
                  </Label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowNewCustomerModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Create Customer
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Customer Modal */}
      {editingCustomer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>First Name *</Label>
                    <Input
                      value={editForm.firstName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, firstName: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Last Name *</Label>
                    <Input
                      value={editForm.lastName}
                      onChange={(e) =>
                        setEditForm({ ...editForm, lastName: e.target.value })
                      }
                      required
                      className="mt-1"
                    />
                  </div>
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    type="tel"
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm({ ...editForm, phone: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm({ ...editForm, email: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-vip"
                    checked={editForm.vip}
                    onChange={(e) =>
                      setEditForm({ ...editForm, vip: e.target.checked })
                    }
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  <Label htmlFor="edit-vip" className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-500" />
                    VIP Customer
                  </Label>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingCustomer(null)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
