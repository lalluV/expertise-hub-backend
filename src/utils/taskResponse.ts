import { IRequest } from "../models/Request";

export interface TaskApiResponse {
  _id: string;
  request: Record<string, unknown>;
  expert: unknown;
  status: string;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type RequestWithTask = {
  _id: unknown;
  task?: {
    expert: unknown;
    status: string;
    notes?: string;
    createdAt?: Date;
    updatedAt?: Date;
  };
  toObject?: () => Record<string, unknown>;
  [key: string]: unknown;
};

export function toTaskApiResponse(
  request: IRequest | RequestWithTask,
): TaskApiResponse | null {
  const plain =
    typeof request.toObject === "function"
      ? (request.toObject() as RequestWithTask)
      : { ...request };

  if (!plain.task) return null;

  const { task, ...requestFields } = plain;

  return {
    _id: String(plain._id),
    request: requestFields as Record<string, unknown>,
    expert: task.expert,
    status: task.status,
    notes: task.notes,
    createdAt: task.createdAt,
    updatedAt: task.updatedAt,
  };
}
