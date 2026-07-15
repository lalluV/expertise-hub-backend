"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTasks = exports.updateTaskStatus = exports.assignTask = void 0;
const Request_1 = require("../models/Request");
const User_1 = require("../models/User");
const marketplaceService_1 = require("../services/marketplaceService");
const taskResponse_1 = require("../utils/taskResponse");
const taskPopulate = [
    { path: "customer", select: "name phone email avatarUri" },
    {
        path: "expert",
        select: "name phone headline avatarUri categories experience rating available",
    },
    { path: "task.expert", select: "name phone headline avatarUri" },
];
// @desc    Assign a task to an expert (stored on the request document)
// @route   POST /api/tasks/assign
// @access  Private/Admin
const assignTask = async (req, res) => {
    const { requestId, expertId } = req.body;
    const task = await (0, marketplaceService_1.assignManagedTask)({ requestId, expertId });
    res.status(201).json(task);
};
exports.assignTask = assignTask;
// @desc    Update task status (Expert) — task id === request id
// @route   PATCH /api/tasks/:id/status
// @access  Private/Expert, Admin
const updateTaskStatus = async (req, res) => {
    const { status, notes } = req.body;
    const request = await Request_1.RequestModel.findOne({
        _id: req.params.id,
        task: { $exists: true },
    });
    if (!request?.task) {
        return res.status(404).json({ message: "Task not found" });
    }
    if (req.user.role === User_1.UserRole.EXPERT &&
        String(request.task.expert) !== String(req.user._id)) {
        return res
            .status(403)
            .json({ message: "Not authorized to update this task" });
    }
    if (status)
        request.task.status = status;
    if (notes !== undefined)
        request.task.notes = notes;
    if (status === Request_1.TaskStatus.COMPLETED) {
        request.status = Request_1.RequestStatus.COMPLETED;
    }
    request.markModified("task");
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(taskPopulate);
    const task = populated ? (0, taskResponse_1.toTaskApiResponse)(populated) : null;
    res.json(task);
};
exports.updateTaskStatus = updateTaskStatus;
// @desc    Get tasks (requests that have an embedded task)
// @route   GET /api/tasks
// @access  Private
const getTasks = async (req, res) => {
    const query = req.user.role === User_1.UserRole.EXPERT
        ? { task: { $exists: true }, "task.expert": req.user._id }
        : { task: { $exists: true } };
    const requests = await Request_1.RequestModel.find(query).populate(taskPopulate);
    const tasks = requests
        .map((request) => (0, taskResponse_1.toTaskApiResponse)(request))
        .filter((task) => Boolean(task));
    res.json(tasks);
};
exports.getTasks = getTasks;
