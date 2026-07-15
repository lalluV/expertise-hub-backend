import { Response } from "express";
import { RequestModel, RequestStatus, QuoteStatus } from "../models/Request";
import { User, UserRole } from "../models/User";
import { ExpertProfile } from "../models/ExpertProfile";

interface NotificationItem {
  id: string;
  group: "today" | "yesterday" | "earlier";
  audience: "customer" | "expert" | "all";
  title: string;
  body: string;
  actionLabel: string;
  actionType: string;
  actionIcon?: string;
  icon: string;
  iconBg: string;
  iconColor: string;
  timeAgo?: string;
  unread: boolean;
  requestId?: string;
  quoteId?: string;
  taskId?: string;
  createdAt: string;
}

const getGroup = (date: Date): NotificationItem["group"] => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  if (date >= startOfToday) return "today";
  if (date >= startOfYesterday) return "yesterday";
  return "earlier";
};

const formatTimeAgo = (date: Date): string => {
  const diffMs = Date.now() - date.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const parseCategory = (description?: string) => {
  const match = description?.match(/^\[([^\]]+)\]/);
  return match?.[1] || "Service Request";
};

// @desc    Get notifications for current user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req: any, res: Response) => {
  const userId = req.user._id;
  const role = req.user.role;

  let readIds = new Set<string>();
  if (role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(userId);
    readIds = new Set(expert?.readNotificationIds || []);
  } else {
    const user = await User.findById(userId);
    readIds = new Set(user?.readNotificationIds || []);
  }

  const items: NotificationItem[] = [];

  if (role === UserRole.CUSTOMER) {
    const requests = await RequestModel.find({ customer: userId })
      .populate("expert", "name")
      .sort({ updatedAt: -1 });

    for (const request of requests) {
      const category = parseCategory(request.description);
      const date = request.updatedAt || request.createdAt;

      if (
        request.status === RequestStatus.QUOTED &&
        request.quote?.status === QuoteStatus.PENDING
      ) {
        const quoteCreatedAt =
          request.quote.createdAt || request.updatedAt || request.createdAt;
        items.push({
          id: `quote-${request._id}`,
          group: getGroup(quoteCreatedAt),
          audience: "customer",
          title: `Quote Received: ${category}`,
          body: `A quote for your ${category} request is ready for review. Payment is arranged outside the app after acceptance.`,
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

      if (
        request.status === RequestStatus.ASSIGNED &&
        request.expert
      ) {
        const expertName =
          typeof request.expert === "object" && "name" in request.expert
            ? (request.expert as { name?: string }).name
            : "Expert";
        items.push({
          id: `assigned-${request._id}`,
          group: getGroup(date),
          audience: "customer",
          title: `Expert Assigned: ${expertName}`,
          body: `${expertName} has been assigned to your ${category}. Schedule your kickoff call.`,
          actionLabel: "View Status",
          actionType: "view_status",
          actionIcon: "chevron-right",
          icon: "how-to-reg",
          iconBg: "#d1fae5",
          iconColor: "#059669",
          timeAgo: formatTimeAgo(date),
          unread: !readIds.has(`assigned-${request._id}`),
          requestId: String(request._id),
          createdAt: date.toISOString(),
        });
      }

      if (request.status === RequestStatus.COMPLETED) {
        items.push({
          id: `completed-${request._id}`,
          group: getGroup(date),
          audience: "customer",
          title: `Job Completed: ${category}`,
          body: `Your ${category} has been marked as finished. Please rate your expert.`,
          actionLabel: "Leave Review",
          actionType: "leave_review",
          actionIcon: "star",
          icon: "task-alt",
          iconBg: "#dbeafe",
          iconColor: "#2563eb",
          timeAgo: formatTimeAgo(date),
          unread: !readIds.has(`completed-${request._id}`),
          requestId: String(request._id),
          createdAt: date.toISOString(),
        });
      }
    }
  }

  if (role === UserRole.EXPERT) {
    const assignedRequests = await RequestModel.find({
      task: { $exists: true },
      "task.expert": userId,
    })
      .populate({ path: "customer", select: "name" })
      .sort({ updatedAt: -1 });

    for (const request of assignedRequests) {
      if (!request.task) continue;
      const category = parseCategory(request.description);
      const taskStatus = request.task.status;
      const date = request.task.updatedAt || request.updatedAt || request.createdAt;

      if (taskStatus === "assigned") {
        items.push({
          id: `task-${request._id}`,
          group: getGroup(request.task.createdAt || request.createdAt),
          audience: "expert",
          title: `New Request: ${category}`,
          body: `You've been assigned a ${category} engagement. Review the details and get started.`,
          actionLabel: "Review Request",
          actionType: "review_request",
          actionIcon: "chevron-right",
          icon: "event-note",
          iconBg: "rgba(0, 74, 198, 0.2)",
          iconColor: "#004ac6",
          unread: !readIds.has(`task-${request._id}`),
          taskId: String(request._id),
          requestId: String(request._id),
          createdAt: (request.task.createdAt || request.createdAt).toISOString(),
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

    const openRequests = await RequestModel.find({
      expert: userId,
      status: { $in: [RequestStatus.PENDING, RequestStatus.REVIEWED] },
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

  items.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json(items);
};

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllNotificationsRead = async (req: any, res: Response) => {
  const { notificationIds } = req.body;

  if (req.user.role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(req.user._id);
    if (!expert) {
      return res.status(404).json({ message: "Expert profile not found" });
    }

    if (Array.isArray(notificationIds)) {
      const existing = new Set(expert.readNotificationIds || []);
      notificationIds.forEach((id: string) => existing.add(id));
      expert.readNotificationIds = [...existing];
    } else {
      expert.readNotificationIds = ["*"];
    }

    await expert.save();
    return res.json({ success: true });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (Array.isArray(notificationIds)) {
    const existing = new Set(user.readNotificationIds || []);
    notificationIds.forEach((id: string) => existing.add(id));
    user.readNotificationIds = [...existing];
  } else {
    user.readNotificationIds = ["*"];
  }

  await user.save();
  res.json({ success: true });
};

// @desc    Mark a notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markNotificationRead = async (req: any, res: Response) => {
  if (req.user.role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(req.user._id);
    if (!expert) {
      return res.status(404).json({ message: "Expert profile not found" });
    }

    const ids = new Set(expert.readNotificationIds || []);
    ids.add(req.params.id);
    expert.readNotificationIds = [...ids];
    await expert.save();
    return res.json({ success: true });
  }

  const user = await User.findById(req.user._id);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const ids = new Set(user.readNotificationIds || []);
  ids.add(req.params.id);
  user.readNotificationIds = [...ids];
  await user.save();

  res.json({ success: true });
};
