"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markNotificationRead = exports.markAllNotificationsRead = exports.getNotifications = void 0;
const Request_1 = require("../models/Request");
const User_1 = require("../models/User");
const ExpertProfile_1 = require("../models/ExpertProfile");
const expertPrivacy_1 = require("../utils/expertPrivacy");
const getGroup = (date) => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);
    if (date >= startOfToday)
        return "today";
    if (date >= startOfYesterday)
        return "yesterday";
    return "earlier";
};
const formatTimeAgo = (date) => {
    const diffMs = Math.max(0, Date.now() - date.getTime());
    const minutes = Math.floor(diffMs / (1000 * 60));
    if (minutes < 1)
        return "Just now";
    if (minutes < 60)
        return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24)
        return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7)
        return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};
const parseCategory = (description) => {
    const match = description?.match(/^\[([^\]]+)\]/);
    return match?.[1] || "Service Request";
};
// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
    const userId = req.user._id;
    const role = req.user.role;
    let readIds = new Set();
    if (role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(userId);
        readIds = new Set(expert?.readNotificationIds || []);
    }
    else {
        const user = await User_1.User.findById(userId);
        readIds = new Set(user?.readNotificationIds || []);
    }
    const items = [];
    if (role === User_1.UserRole.CUSTOMER) {
        const requests = await Request_1.RequestModel.find({ customer: userId })
            .populate("expert", "name hideName displayName")
            .sort({ updatedAt: -1 });
        for (const request of requests) {
            const category = parseCategory(request.description);
            const created = request.createdAt;
            if (request.status === Request_1.RequestStatus.QUOTED &&
                request.quote?.status === Request_1.QuoteStatus.PENDING) {
                const quoteCreatedAt = request.quote.createdAt || request.updatedAt || request.createdAt;
                items.push({
                    id: `quote-${request._id}`,
                    group: getGroup(quoteCreatedAt),
                    audience: "customer",
                    title: `Quote Received: ${category}`,
                    body: `A quote for your ${category} request is ready. Accept it to confirm, or decline it. Payment is arranged with our team, not in the app.`,
                    actionLabel: "Review Quote",
                    actionType: "review_quote",
                    actionIcon: "chevron-right",
                    icon: "payments",
                    iconBg: "#fef3c7",
                    iconColor: "#d97706",
                    timeAgo: formatTimeAgo(quoteCreatedAt),
                    unread: !readIds.has(`quote-${request._id}`),
                    requestId: String(request._id),
                    quoteId: String(request._id),
                    createdAt: quoteCreatedAt.toISOString(),
                });
            }
            if (request.status === Request_1.RequestStatus.ASSIGNED &&
                request.expert) {
                // Customer-facing: respect expert name privacy (displayName / initials)
                const expertName = (0, expertPrivacy_1.publicExpertName)(request.expert);
                items.push({
                    id: `assigned-${request._id}`,
                    group: getGroup(created),
                    audience: "customer",
                    title: `Expert Assigned: ${expertName}`,
                    body: `${expertName} has been assigned to your ${category}. Schedule your kickoff call.`,
                    actionLabel: "View Status",
                    actionType: "view_status",
                    actionIcon: "chevron-right",
                    icon: "how-to-reg",
                    iconBg: "#d1fae5",
                    iconColor: "#059669",
                    timeAgo: formatTimeAgo(created),
                    unread: !readIds.has(`assigned-${request._id}`),
                    requestId: String(request._id),
                    createdAt: created.toISOString(),
                });
            }
            if (request.status === Request_1.RequestStatus.COMPLETED) {
                items.push({
                    id: `completed-${request._id}`,
                    group: getGroup(created),
                    audience: "customer",
                    title: `Job Completed: ${category}`,
                    body: `Your ${category} has been marked as finished. Please rate your expert.`,
                    actionLabel: "Leave Review",
                    actionType: "leave_review",
                    actionIcon: "star",
                    icon: "task-alt",
                    iconBg: "#dbeafe",
                    iconColor: "#2563eb",
                    timeAgo: formatTimeAgo(created),
                    unread: !readIds.has(`completed-${request._id}`),
                    requestId: String(request._id),
                    createdAt: created.toISOString(),
                });
            }
        }
    }
    if (role === User_1.UserRole.EXPERT) {
        const assignedRequests = await Request_1.RequestModel.find({
            task: { $exists: true },
            "task.expert": userId,
        })
            .populate({ path: "customer", select: "name" })
            .sort({ updatedAt: -1 });
        for (const request of assignedRequests) {
            if (!request.task)
                continue;
            const category = parseCategory(request.description);
            const taskStatus = request.task.status;
            const date = request.task.createdAt || request.createdAt;
            if (taskStatus === "assigned") {
                const assignedAt = request.task.createdAt || request.createdAt;
                items.push({
                    id: `task-${request._id}`,
                    group: getGroup(assignedAt),
                    audience: "expert",
                    title: `New Request: ${category}`,
                    body: `You've been assigned a ${category} engagement. Review the details and get started.`,
                    actionLabel: "Review Request",
                    actionType: "review_request",
                    actionIcon: "chevron-right",
                    icon: "event-note",
                    iconBg: "rgba(0, 74, 198, 0.2)",
                    iconColor: "#004ac6",
                    timeAgo: formatTimeAgo(assignedAt),
                    unread: !readIds.has(`task-${request._id}`),
                    taskId: String(request._id),
                    requestId: String(request._id),
                    createdAt: assignedAt.toISOString(),
                });
            }
            if (taskStatus === "completed") {
                items.push({
                    id: `task-done-${request._id}`,
                    group: getGroup(date),
                    audience: "expert",
                    title: `Job Completed: ${category}`,
                    body: `The ${category} job has been marked complete.`,
                    actionLabel: "View Details",
                    actionType: "review_request",
                    actionIcon: "chevron-right",
                    icon: "task-alt",
                    iconBg: "#dbeafe",
                    iconColor: "#2563eb",
                    timeAgo: formatTimeAgo(date),
                    unread: !readIds.has(`task-done-${request._id}`),
                    taskId: String(request._id),
                    requestId: String(request._id),
                    createdAt: date.toISOString(),
                });
            }
        }
        const openRequests = await Request_1.RequestModel.find({
            expert: userId,
            status: { $in: [Request_1.RequestStatus.PENDING, Request_1.RequestStatus.REVIEWED] },
        })
            .sort({ createdAt: -1 })
            .limit(3);
        for (const request of openRequests) {
            const category = parseCategory(request.description);
            items.push({
                id: `open-${request._id}`,
                group: getGroup(request.createdAt),
                audience: "expert",
                title: `Open Request: ${category}`,
                body: `A new ${category} request is available in the marketplace.`,
                actionLabel: "View Requests",
                actionType: "view_requests",
                actionIcon: "chevron-right",
                icon: "event-note",
                iconBg: "rgba(0, 74, 198, 0.2)",
                iconColor: "#004ac6",
                timeAgo: formatTimeAgo(request.createdAt),
                unread: !readIds.has(`open-${request._id}`),
                requestId: String(request._id),
                createdAt: request.createdAt.toISOString(),
            });
        }
    }
    items.push({
        id: "system-tos",
        group: "earlier",
        audience: "all",
        title: "Terms of Service Update",
        body: "We have updated our terms of service to better reflect our expert vetting process.",
        actionLabel: "Read More",
        actionType: "read_more",
        icon: "info",
        iconBg: "#f1f5f9",
        iconColor: "#475569",
        timeAgo: "2d ago",
        unread: !readIds.has("system-tos"),
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(items);
};
exports.getNotifications = getNotifications;
// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
const markAllNotificationsRead = async (req, res) => {
    const { notificationIds } = req.body;
    if (req.user.role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
        if (!expert) {
            return res.status(404).json({ message: "Expert profile not found" });
        }
        if (Array.isArray(notificationIds)) {
            const existing = new Set(expert.readNotificationIds || []);
            notificationIds.forEach((id) => existing.add(id));
            expert.readNotificationIds = [...existing];
        }
        else {
            expert.readNotificationIds = ["*"];
        }
        await expert.save();
        return res.json({ success: true });
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    if (Array.isArray(notificationIds)) {
        const existing = new Set(user.readNotificationIds || []);
        notificationIds.forEach((id) => existing.add(id));
        user.readNotificationIds = [...existing];
    }
    else {
        user.readNotificationIds = ["*"];
    }
    await user.save();
    res.json({ success: true });
};
exports.markAllNotificationsRead = markAllNotificationsRead;
// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
const MAX_READ_IDS = 500;
/** Keeps the read-id list bounded (ids are client-supplied). */
const addReadId = (list, id) => [...new Set([...(list || []), id])].slice(-MAX_READ_IDS);
const markNotificationRead = async (req, res) => {
    if (typeof req.params.id !== "string" || req.params.id.length > 120) {
        return res.status(400).json({ message: "Invalid notification id" });
    }
    if (req.user.role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
        if (!expert) {
            return res.status(404).json({ message: "Expert profile not found" });
        }
        expert.readNotificationIds = addReadId(expert.readNotificationIds, req.params.id);
        await expert.save();
        return res.json({ success: true });
    }
    const user = await User_1.User.findById(req.user._id);
    if (!user) {
        return res.status(404).json({ message: "User not found" });
    }
    user.readNotificationIds = addReadId(user.readNotificationIds, req.params.id);
    await user.save();
    res.json({ success: true });
};
exports.markNotificationRead = markNotificationRead;
