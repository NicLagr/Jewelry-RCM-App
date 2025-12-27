import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isOverdue(promisedAt: Date | string, status: string): boolean {
  if (status === "READY" || status === "PICKED_UP" || status === "ARCHIVED") return false;
  return new Date(promisedAt) < new Date();
}

export function isPromisedToday(promisedAt: Date | string): boolean {
  const today = new Date();
  const promised = new Date(promisedAt);
  return (
    promised.getDate() === today.getDate() &&
    promised.getMonth() === today.getMonth() &&
    promised.getFullYear() === today.getFullYear()
  );
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "INTAKE":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "IN_PROGRESS":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "OVERDUE":
      return "bg-red-100 text-red-800 border-red-200";
    case "READY":
      return "bg-green-100 text-green-800 border-green-200";
    case "PICKED_UP":
      return "bg-gray-100 text-gray-800 border-gray-200";
    case "ARCHIVED":
      return "bg-slate-100 text-slate-600 border-slate-200";
    default:
      return "bg-gray-100 text-gray-800 border-gray-200";
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case "INTAKE":
      return "Intake";
    case "IN_PROGRESS":
      return "In Progress";
    case "OVERDUE":
      return "Overdue";
    case "READY":
      return "Ready";
    case "PICKED_UP":
      return "Picked Up";
    case "ARCHIVED":
      return "Archived";
    default:
      return status;
  }
}

export function generateJobNumber(): number {
  return Math.floor(10000 + Math.random() * 90000);
}

