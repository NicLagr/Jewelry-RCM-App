"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  AlertTriangle,
  Calendar,
  User,
  Archive,
  GripVertical,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
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

const STATUSES = [
  { key: "INTAKE", label: "Intake" },
  { key: "IN_PROGRESS", label: "In Progress" },
  { key: "READY", label: "Ready" },
  { key: "PICKED_UP", label: "Picked Up" },
];

// Helper to check if a date is within the current month
function isWithinCurrentMonth(dateString: string): boolean {
  const date = new Date(dateString);
  const now = new Date();
  
  // Get start of current month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  // Get end of current month
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);
  
  return date >= startOfMonth && date <= endOfMonth;
}

export default function JobsPage() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [activeJob, setActiveJob] = useState<Job | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const searchQuery = searchParams.get("search");

  // Configure sensors for drag detection
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    })
  );

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
    let filtered = jobs.filter((job) => job.status === status);
    
    // For Picked Up, only show jobs from current month
    if (status === "PICKED_UP") {
      filtered = filtered.filter((job) => isWithinCurrentMonth(job.updatedAt || job.promisedAt));
    }
    
    return filtered;
  };

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const draggedJob = jobs.find((job) => job.id === active.id);
    if (draggedJob) {
      setActiveJob(draggedJob);
    }
  };

  // Handle drag end - update job status
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveJob(null);

    if (!over) return;

    const jobId = active.id as string;
    const newStatus = over.id as string;
    const job = jobs.find((j) => j.id === jobId);

    if (!job || job.status === newStatus) return;

    // Optimistically update the UI
    setJobs((prevJobs) =>
      prevJobs.map((j) =>
        j.id === jobId ? { ...j, status: newStatus } : j
      )
    );

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        // Revert on error
        setJobs((prevJobs) =>
          prevJobs.map((j) =>
            j.id === jobId ? { ...j, status: job.status } : j
          )
        );
        console.error("Failed to update job status");
      }
    } catch (error) {
      // Revert on error
      setJobs((prevJobs) =>
        prevJobs.map((j) =>
          j.id === jobId ? { ...j, status: job.status } : j
        )
      );
      console.error("Error updating job status:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  const overdueJobs = jobs.filter((job) => isOverdue(job.promisedAt, job.status));
  const todayJobs = jobs.filter((job) => isPromisedToday(job.promisedAt));

  const archivedCount = jobs.filter((job) => job.status === "ARCHIVED").length;

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
            <Link href="/jobs/archived">
              <button
                className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all border bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              >
                <Archive className="h-4 w-4 text-slate-500" />
                Archived
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1a4d3e]" />
          </div>
        ) : searchQuery ? (
          /* Search Results - List View */
          <div>
            <p className="text-sm text-slate-500 mb-4">
              Found {jobs.length} result{jobs.length !== 1 ? "s" : ""} for &quot;{searchQuery}&quot;
            </p>
            {jobs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-500">No tickets found matching your search.</p>
                <Link href="/jobs">
                  <Button variant="outline" className="mt-4">
                    Clear Search
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Kanban Board - Default View */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
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
                    <DroppableColumn status={status.key}>
                      <div className="space-y-3 max-h-[calc(100vh-320px)] overflow-y-auto">
                        {statusJobs.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-8">
                            No jobs
                          </p>
                        ) : (
                          statusJobs.map((job) => (
                            <DraggableJobCard
                              key={job.id}
                              job={job}
                              isDragging={activeJob?.id === job.id}
                            />
                          ))
                        )}
                      </div>
                    </DroppableColumn>
                  </div>
                );
              })}
            </div>
            
            {/* Drag Overlay - Shows preview of card being dragged */}
            <DragOverlay>
              {activeJob ? (
                <JobCardContent job={activeJob} isOverlay />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  );
}

// Droppable column wrapper for each status column
function DroppableColumn({
  status,
  children,
}: {
  status: string;
  children: React.ReactNode;
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: status,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-slate-100 rounded-xl p-3 flex-1 min-h-[400px] transition-colors duration-200",
        isOver && "bg-[#1a4d3e]/10 ring-2 ring-[#1a4d3e] ring-inset"
      )}
    >
      {children}
    </div>
  );
}

// Draggable job card wrapper
function DraggableJobCard({
  job,
  isDragging,
}: {
  job: Job;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: job.id,
    data: { job },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "touch-none",
        isDragging && "opacity-50"
      )}
    >
      <JobCardContent
        job={job}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// Job card content (used for both draggable and overlay)
function JobCardContent({
  job,
  dragHandleProps,
  isOverlay,
}: {
  job: Job;
  dragHandleProps?: Record<string, unknown>;
  isOverlay?: boolean;
}) {
  const overdue = isOverdue(job.promisedAt, job.status);
  const isCompleted = job.status === "PICKED_UP" || job.status === "ARCHIVED";

  // Format customer name as initial + last name (e.g., "O. Rivera")
  const customerInitial = job.customer.firstName[0];
  const customerDisplay = `${customerInitial}. ${job.customer.lastName}`;

  // Format dates as MM/DD
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

  return (
    <Card
      className={cn(
        "p-4 transition-all border group",
        overdue ? "border-red-300 bg-red-50" : "border-slate-200 bg-white",
        isOverlay && "shadow-xl rotate-2 scale-105"
      )}
    >
      {/* Drag Handle and Job Number */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <button
            {...dragHandleProps}
            className={cn(
              "cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors",
              isOverlay && "cursor-grabbing"
            )}
            onClick={(e) => e.preventDefault()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <Link
            href={`/jobs/${job.id}`}
            className="font-medium text-slate-900 hover:text-[#1a4d3e] hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            #{job.jobNumber} • {customerDisplay}
          </Link>
        </div>
      </div>

      {/* Status Badge */}
      <div className="mb-2 ml-7">
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

      {/* Item and Date */}
      <p className="text-sm text-slate-600 mb-1 ml-7">
        {job.itemType} • {isCompleted 
          ? `Completed: ${formatDateShort(job.updatedAt)} (Promised: ${formatDateShort(job.promisedAt)})` 
          : `Promised: ${formatDateShort(job.promisedAt)}`}
      </p>

      {/* Issue */}
      <p className="text-sm text-slate-500 ml-7">
        Issue: {job.issue}
      </p>
    </Card>
  );
}

// Simple job card for search results (not draggable)
function JobCard({ job }: { job: Job }) {
  const overdue = isOverdue(job.promisedAt, job.status);
  const isCompleted = job.status === "PICKED_UP" || job.status === "ARCHIVED";

  // Format customer name as initial + last name (e.g., "O. Rivera")
  const customerInitial = job.customer.firstName[0];
  const customerDisplay = `${customerInitial}. ${job.customer.lastName}`;

  // Format dates as MM/DD
  const formatDateShort = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  };

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

        {/* Item and Date */}
        <p className="text-sm text-slate-600 mb-1">
          {job.itemType} • {isCompleted 
            ? `Completed: ${formatDateShort(job.updatedAt)} (Promised: ${formatDateShort(job.promisedAt)})` 
            : `Promised: ${formatDateShort(job.promisedAt)}`}
        </p>

        {/* Issue */}
        <p className="text-sm text-slate-500">
          Issue: {job.issue}
        </p>
      </Card>
    </Link>
  );
}
