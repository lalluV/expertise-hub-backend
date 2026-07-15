import { Request, Response } from "express";
import {
  RequestModel,
  RequestStatus,
  TaskStatus,
} from "../models/Request";
import { UserRole } from "../models/User";
import { assignManagedTask } from "../services/marketplaceService";
import { toTaskApiResponse } from "../utils/taskResponse";

const taskPopulate = [
  { path: "customer", select: "name phone email avatarUri" },
  {
    path: "expert",
    select:
      "name phone headline avatarUri categories experience rating available",
  },
  { path: "task.expert", select: "name phone headline avatarUri" },
];

// @desc    Assign a task to an expert (stored on the request document)
// @route   POST /api/tasks/assign
// @access  Private/Admin
export const assignTask = async (req: Request, res: Response) => {
  const { requestId, expertId } = req.body;
  const task = await assignManagedTask({ requestId, expertId });
  res.status(201).json(task);
};

// @desc    Update task status (Expert) — task id === request id
// @route   PATCH /api/tasks/:id/status
// @access  Private/Expert, Admin
export const updateTaskStatus = async (req: any, res: Response) => {
  const { status, notes } = req.body;

  const request = await RequestModel.findOne({
    _id: req.params.id,
    task: { $exists: true },
  });

  if (!request?.task) {
    return res.status(404).json({ message: "Task not found" });
  }

  if (
    req.user.role === UserRole.EXPERT &&
    String(request.task.expert) !== String(req.user._id)
  ) {
    return res
      .status(403)
      .json({ message: "Not authorized to update this task" });
  }

  if (status) request.task.status = status;
  if (notes !== undefined) request.task.notes = notes;

  if (status === TaskStatus.COMPLETED) {
    request.status = RequestStatus.COMPLETED;
  }

  request.markModified("task");
  await request.save();

  const populated = await RequestModel.findById(request._id).populate(taskPopulate);
  const task = populated ? toTaskApiResponse(populated) : null;
  res.json(task);
};

// @desc    Get tasks (requests that have an embedded task)
// @route   GET /api/tasks
// @access  Private
export const getTasks = async (req: any, res: Response) => {
  const query =
    req.user.role === UserRole.EXPERT
      ? { task: { $exists: true }, "task.expert": req.user._id }
      : { task: { $exists: true } };

  const requests = await RequestModel.find(query).populate(taskPopulate);

  const tasks = requests
    .map((request) => toTaskApiResponse(request))
    .filter((task): task is NonNullable<typeof task> => Boolean(task));

  res.json(tasks);
};
