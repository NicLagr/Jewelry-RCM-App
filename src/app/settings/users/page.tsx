"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Plus,
  Mail,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  createdAt: string;
}

const ROLES = [
  { value: "OWNER", label: "Administrator", color: "bg-purple-100 text-purple-800" },
  { value: "ADMIN", label: "Administrator", color: "bg-purple-100 text-purple-800" },
  { value: "MANAGER", label: "Manager", color: "bg-blue-100 text-blue-800" },
  { value: "JEWELER", label: "Jeweler", color: "bg-amber-100 text-amber-800" },
  { value: "STAFF", label: "Staff", color: "bg-slate-100 text-slate-800" },
];

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewUserModal, setShowNewUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "STAFF",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setShowNewUserModal(false);
        setNewUser({ name: "", email: "", password: "", role: "STAFF" });
        fetchUsers();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to create user");
      }
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const handleUpdateUser = async (user: User) => {
    try {
      await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      fetchUsers();
      setEditingUser(null);
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  const getRoleInfo = (role: string) => {
    return ROLES.find((r) => r.value === role) || ROLES[4];
  };

  const getStatusBadge = (user: User) => {
    // Simulate status based on some logic
    const statuses = ["Active", "Active", "Away", "Offline"];
    const index = users.indexOf(user) % 4;
    const status = statuses[index];
    
    return {
      label: status,
      color: status === "Active" ? "bg-green-100 text-green-800" : 
             status === "Away" ? "bg-amber-100 text-amber-800" : 
             "bg-slate-100 text-slate-800"
    };
  };

  const getLastActive = (user: User) => {
    const times = ["2 minutes ago", "5 minutes ago", "1 hour ago", "2 days ago"];
    const index = users.indexOf(user) % 4;
    return times[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
      </div>
    );
  }

  // Stats
  const totalUsers = users.length;
  const activeNow = users.filter((_, i) => i < 2).length;
  const administrators = users.filter(u => u.role === "OWNER" || u.role === "ADMIN").length;

  return (
    <div className="min-h-screen bg-[#f8f9fa] pb-8">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
            <Button onClick={() => setShowNewUserModal(true)}>
              <Plus className="h-5 w-5 mr-2" />
              Add User
            </Button>
          </div>

          {/* Settings Nav */}
          <div className="flex gap-2 mt-4">
            <Link
              href="/settings/store"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:border-slate-300"
            >
              Store Info
            </Link>
            <Link
              href="/settings/users"
              className="px-4 py-2 rounded-lg text-sm font-medium bg-[#1a4d3e] text-white"
            >
              Users
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats */}
        <div className="flex flex-wrap gap-4 mb-6">
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Users</p>
            <p className="text-2xl font-bold text-slate-900">{totalUsers}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Active Now</p>
            <p className="text-2xl font-bold text-slate-900">{activeNow}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 px-5 py-3">
            <p className="text-xs text-slate-500 uppercase tracking-wide">Administrators</p>
            <p className="text-2xl font-bold text-slate-900">{administrators}</p>
          </div>
        </div>

        {/* Users Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Name
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Email
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Role
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-left py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Last Active
                    </th>
                    <th className="text-right py-4 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const roleInfo = getRoleInfo(user.role);
                    const statusInfo = getStatusBadge(user);
                    const titles = ["Owner", "Store Manager", "Jeweler", "Sales Associate"];
                    const title = titles[index % 4];
                    
                    return (
                      <tr
                        key={user.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#1a4d3e] flex items-center justify-center text-white font-medium text-sm">
                              {user.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)
                                .toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{user.name}</p>
                              <p className="text-sm text-slate-500">{title}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-600">
                          {user.email}
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={cn("text-xs", roleInfo.color)}>
                            {roleInfo.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <Badge className={cn("text-xs", statusInfo.color)}>
                            {statusInfo.label}
                          </Badge>
                        </td>
                        <td className="py-4 px-4 text-sm text-slate-500">
                          {getLastActive(user)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="flex flex-col gap-2 mt-4">
          <p className="text-xs text-slate-500">
            Note: User permissions and role-based access not yet implemented for demo
          </p>
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Showing 1-{users.length} of {users.length} users
            </p>
            <p className="text-sm text-slate-500">
              Last saved: Today at 2:45 PM
            </p>
          </div>
        </div>
      </div>

      {/* New User Modal */}
      {showNewUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Add New User</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={newUser.name}
                    onChange={(e) =>
                      setNewUser({ ...newUser, name: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Password *</Label>
                  <Input
                    type="password"
                    value={newUser.password}
                    onChange={(e) =>
                      setNewUser({ ...newUser, password: e.target.value })
                    }
                    required
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={newUser.role}
                    onChange={(e) =>
                      setNewUser({ ...newUser, role: e.target.value })
                    }
                    className="mt-1"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowNewUserModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Create User
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Edit User</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleUpdateUser(editingUser);
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Name</Label>
                  <Input
                    value={editingUser.name}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, email: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Role</Label>
                  <Select
                    value={editingUser.role}
                    onChange={(e) =>
                      setEditingUser({ ...editingUser, role: e.target.value })
                    }
                    className="mt-1"
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setEditingUser(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="flex-1">
                    Save Changes
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
