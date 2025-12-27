"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ArrowLeft, Archive, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  formatDate,
  getStatusColor,
  cn,
} from "@/lib/utils";

interface Job {
  id: string;
  jobNumber: number;
  status: string;
  itemType: string;
  issue: string;
  promisedAt: string;
  updatedAt: string;
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

export default function ArchivedJobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?status=ARCHIVED`);
      if (res.ok) {
        const data = await res.json();
        setJobs(data);
      }
    } catch (error) {
      console.error("Error fetching archived jobs:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const handleRestore = async (jobId: string) => {
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PICKED_UP" }),
      });
      if (res.ok) {
        fetchJobs();
      }
    } catch (error) {
      console.error("Error restoring job:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link href="/jobs">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3">
              <Archive className="h-6 w-6 text-slate-500" />
              <h1 className="text-2xl font-bold text-slate-900">Archived Tickets</h1>
            </div>
            <Badge variant="secondary" className="ml-2">
              {jobs.length}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <Archive className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-700 mb-2">No archived tickets</h2>
            <p className="text-slate-500 mb-6">
              Completed tickets will appear here after being archived.
            </p>
            <Link href="/jobs">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Job Board
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((job) => (
              <Card
                key={job.id}
                className="p-4 border border-slate-200 bg-white hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-medium text-slate-900">
                      #{job.jobNumber} - {job.customer.firstName} {job.customer.lastName}
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {job.itemType}
                    </p>
                  </div>
                  <Badge className={cn("text-xs", getStatusColor("ARCHIVED"))}>
                    Archived
                  </Badge>
                </div>

                <p className="text-sm text-slate-600 mb-3 line-clamp-2">
                  {job.issue}
                </p>

                <div className="text-xs text-slate-400 mb-4">
                  Completed: {formatDate(job.updatedAt)}
                </div>

                <div className="flex gap-2">
                  <Link href={`/jobs/${job.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(job.id)}
                    title="Restore to Picked Up"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

