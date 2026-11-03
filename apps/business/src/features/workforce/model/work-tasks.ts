export type WorkTaskStatus =
  | "PENDING"
  | "IN_PROGRESS"
  | "PENDING_REVIEW"
  | "DONE"
  | "CANCELLED";
export interface WorkTaskReport {
  id: string;
  taskId: string;
  userId: string;
  name: string;
  title: string;
  description: string | null;
  priority: string;
  status: WorkTaskStatus;
  dueAt: string | null;
  createdAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  performanceStars: number | null;
  productivityPercent: number | null;
  evaluationNote: string | null;
  createdBy: string;
  subTasks: { id: string; title: string; completed: boolean }[];
  evidence: { id: string; url: string; name: string | null }[];
  comments: { id: string; body: string; createdAt: string; author: string }[];
}
export const workTaskStatusLabels: Record<WorkTaskStatus, string> = {
  PENDING: "Төлөвлөсөн",
  IN_PROGRESS: "Хийгдэж буй",
  PENDING_REVIEW: "Хянаж батлах",
  DONE: "Батлагдсан",
  CANCELLED: "Цуцалсан",
};
