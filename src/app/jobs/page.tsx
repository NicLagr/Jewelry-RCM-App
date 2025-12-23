"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  AlertTriangle,
  Calendar,
  User,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  getStatusColor,
  getStatusLabel,
  isOverdue,
  isPromisedToday,
  cn,
} from "@/lib/utils";

interface Job {
  id: string;
  jobNumber: number;
  status: string;
  itemType: string;
  issue: string;
  promisedAt: string;
  depositCents: number;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string | null;
  };
  assignee: {
    id: string;
    name: string;
  } | null;
  services: {
    qty: number;
    unitPriceCents: number;
  }[];
}

const STATUSES = [
  { key: "INTAKE", label: "Intake" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "READY", label: "Ready" },
  { key: "PICKED_UP", label: "Picked Up" },
];

export default function JobsPage() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  const searchQuery = searchParams.get("search");

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (activeFilter) params.set("filter", activeFilter);

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const getJobsByStatus = (status: string) => {
    return jobs.filter((job) => job.status === status);
  };

  const overdueJobs = jobs.filter((job) => isOverdue(job.promisedAt, job.status));
  const todayJobs = jobs.filter((job) => isPromisedToday(job.promisedAt));

  const filters = [
    {
      id: "overdue",
      label: "Overdue",
      count: overdueJobs.length,
      icon: AlertTriangle,
      color: "text-red-600",
    },
    {
      id: "today",
      label: "Promised Today",
      count: todayJobs.length,
      icon: Calendar,
      color: "text-amber-600",
    },
    {
      id: "my-jobs",
      label: "My Jobs",
      icon: User,
      color: "text-blue-600",
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Home — Job Board</h1>
              {searchQuery && (
                <p className="text-sm text-slate-500 mt-1">
                  Showing results for &quot;{searchQuery}&quot;
                </p>
              )}
            </div>
            <Link href="/jobs/new">
              <Button size="lg" className="w-full sm:w-auto">
                <Plus className="h-5 w-5 mr-2" />
                New Ticket
              </Button>
            </Link>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() =>
                    setActiveFilter(isActive ? null : filter.id)
                  }
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border",
                    isActive
                      ? "bg-[#1a4d3e] text-white border-[#1a4d3e]"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
                  )}
                >
                  <Icon className={cn("h-4 w-4", !isActive && filter.color)} />
                  {filter.label}
                  {filter.count !== undefined && (
                    <span
                      className={cn(
                        "px-2 py-0.5 rounded-full text-xs",
                        isActive
                          ? "bg-white/20"
                          : "bg-slate-100"
                      )}
                    >
                      {filter.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-xs text-slate-500 mb-4">
          Note: Drag-and-drop between columns not yet implemented for demo. Click cards to change status.
        </p>
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {STATUSES.map((status) => {
              const statusJobs = getJobsByStatus(status.key);
              return (
                <div key={status.key} className="flex flex-col">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h2 className="font-semibold text-slate-900 text-base">
                      {status.label}
                      </h2>
                    <Badge variant="secondary" className="text-xs">
                      {statusJobs.length}
                    </Badge>
                    </div>
                  
                  {/* Column Content */}
                  <div className="bg-slate-100 rounded-xl p-3 flex-1 min-h-[400px]">
                    <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                      {statusJobs.length === 0 ? (
                        <p className="text-sm text-slate-500 text-center py-8">
                          No jobs
                        </p>
                      ) : (
                        statusJobs.map((job) => (
                          <JobCard key={job.id} job={job} />
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job }: { job: Job }) {
  const overdue = isOverdue(job.promisedAt, job.status);
  const promisedToday = isPromisedToday(job.promisedAt);

  // Format customer name as initial + last name (e.g., "O. Rivera")
  const customerInitial = job.customer.firstName[0];
  const customerDisplay = `${customerInitial}. ${job.customer.lastName}`;

  // Format promised date as MM/DD
  const promisedDate = new Date(job.promisedAt);
  const formattedPromised = `${String(promisedDate.getMonth() + 1).padStart(2, '0')}/${String(promisedDate.getDate()).padStart(2, '0')}`;

  return (
    <Link href={`/jobs/${job.id}`}>
      <Card
        className={cn(
          "p-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.98] border",
          overdue ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
        )}
      >
        {/* Job Number and Customer */}
        <div className="flex items-start justify-between mb-2">
          <div className="font-medium text-slate-900">
            #{job.jobNumber} • {customerDisplay}
          </div>
        </div>

        {/* Status Badge */}
        <div className="mb-2">
          <Badge
            className={cn(
              "text-xs",
              overdue
                ? "bg-red-100 text-red-800"
                : getStatusColor(job.status)
            )}
          >
            {overdue ? "Overdue" : getStatusLabel(job.status)}
          </Badge>
        </div>

        {/* Item and Promised Date */}
        <p className="text-sm text-slate-600 mb-1">
          {job.itemType} • Promised: {formattedPromised}
        </p>

        {/* Issue */}
        <p className="text-sm text-slate-500">
          Issue: {job.issue}
        </p>
      </Card>
    </Link>
  );
}
