import { Request, Response } from "express";
import { RequestModel, RequestStatus } from "../models/Request";
import { ExpertProfile } from "../models/ExpertProfile";
import { User, UserRole } from "../models/User";
import {
  enrichRequestWithStatus,
  enrichRequestsWithStatus,
} from "../utils/requestStatusEnrichment";
import { recalculateExpertRating } from "../services/expertProfileService";
import { uploadMulterFiles } from "../services/storageService";

// @desc    Create a new request
// @route   POST /api/requests
// @access  Private/Customer
export const createRequest = async (req: any, res: Response) => {
  const { description, attachments, expertId, scheduledDate, budget } =
    req.body;
  const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
  const fileAttachments =
    uploadedFiles.length > 0
      ? await uploadMulterFiles(uploadedFiles, "requests")
      : [];

  let assignedExpertId: string | undefined;
  if (expertId) {
    const expertProfile = await ExpertProfile.findById(expertId);
    if (!expertProfile) {
      return res.status(400).json({ message: "Expert profile not found" });
    }
    assignedExpertId = String(expertProfile._id);
  }

  const request = await RequestModel.create({
    customer: req.user._id,
    ...(assignedExpertId ? { expert: assignedExpertId } : {}),
    description,
    attachments: [...(attachments || []), ...fileAttachments],
    scheduledDate: scheduledDate || new Date(), // Fallback if not provided
    budget,
    status: RequestStatus.PENDING,
  });

  res.status(201).json(request);
};

// @desc    Get requests
// @route   GET /api/requests
// @access  Private
export const getRequests = async (req: any, res: Response) => {
  let query = {};

  if (req.user.role === UserRole.CUSTOMER) {
    query = { customer: req.user._id };
  } else if (req.user.role === UserRole.EXPERT) {
    const expert = await ExpertProfile.findById(req.user._id).select(
      "declinedRequestIds",
    );
    const declinedIds = expert?.declinedRequestIds ?? [];

    const openStatuses = [RequestStatus.PENDING, RequestStatus.REVIEWED];

    query = {
      $or: [
        { expert: req.user._id },
        { "task.expert": req.user._id },
        {
          status: { $in: openStatuses },
          _id: { $nin: declinedIds },
          $or: [{ expert: { $exists: false } }, { expert: null }],
        },
      ],
    };
  }
  // Admin sees all, so query remains {}

  const requests = await RequestModel.find(query)
    .populate("customer", "name phone email avatarUri")
    .populate(
      "expert",
      "name phone headline avatarUri categories experience rating available",
    );

  res.json(await enrichRequestsWithStatus(requests));
};

// @desc    Assign expert to request (Admin)
// @route   PATCH /api/requests/:id/expert
// @access  Private/Admin
export const assignExpertToRequest = async (req: any, res: Response) => {
  const { expertId } = req.body;
  const request = await RequestModel.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  if (
    [RequestStatus.COMPLETED, RequestStatus.REJECTED].includes(request.status)
  ) {
    return res.status(400).json({ message: "Request is no longer available" });
  }

  const expert = await ExpertProfile.findById(expertId);
  if (!expert) {
    return res.status(400).json({ message: "Expert profile not found" });
  }

  request.expert = expertId;
  if (request.status === RequestStatus.PENDING) {
    request.status = RequestStatus.REVIEWED;
  }
  await request.save();

  const populated = await RequestModel.findById(request._id)
    .populate("customer", "name phone email avatarUri")
    .populate(
      "expert",
      "name phone headline avatarUri categories experience rating available",
    );

  res.json(populated);
};

// @desc    Update request status
// @route   PATCH /api/requests/:id/status
// @access  Private/Admin
export const updateRequestStatus = async (req: any, res: Response) => {
  const { status } = req.body;
  const request = await RequestModel.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  request.status = status;
  const updatedRequest = await request.save();

  res.json(updatedRequest);
};

// @desc    Get request by ID
// @route   GET /api/requests/:id
// @access  Private
export const getRequestById = async (req: any, res: Response) => {
  const request = await RequestModel.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  if (
    req.user.role === UserRole.CUSTOMER &&
    String(request.customer) !== String(req.user._id)
  ) {
    return res.status(403).json({ message: "Not authorized" });
  }

  if (req.user.role === UserRole.EXPERT) {
    const allowed = await expertCanAccessRequest(
      String(request._id),
      String(req.user._id),
    );
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized" });
    }
  }

  await request.populate([
    { path: "customer", select: "name phone email avatarUri" },
    {
      path: "expert",
      select:
        "name phone headline avatarUri categories experience rating available",
    },
  ]);

  res.json(await enrichRequestWithStatus(request));
};

const expertCanAccessRequest = async (requestId: string, expertId: string) => {
  const request = await RequestModel.findById(requestId);
  if (!request) return null;

  const isAssignedExpert =
    request.expert && String(request.expert) === String(expertId);
  if (isAssignedExpert) return request;

  if (request.task && String(request.task.expert) === String(expertId)) {
    return request;
  }

  if (
    [RequestStatus.PENDING, RequestStatus.REVIEWED].includes(request.status) &&
    !request.expert
  ) {
    const expert = await ExpertProfile.findById(expertId).select(
      "declinedRequestIds",
    );
    const declinedIds = (expert?.declinedRequestIds ?? []).map(String);
    if (!declinedIds.includes(String(request._id))) {
      return request;
    }
  }

  return null;
};

// @desc    Expert accepts or declines a marketplace invitation
// @route   PATCH /api/requests/:id/respond
// @access  Private/Expert
export const expertRespondToRequest = async (req: any, res: Response) => {
  const { action } = req.body;
  const request = await RequestModel.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  if (
    [RequestStatus.COMPLETED, RequestStatus.REJECTED].includes(request.status)
  ) {
    return res.status(400).json({ message: "Request is no longer available" });
  }

  const expert = await ExpertProfile.findById(req.user._id);
  if (!expert) {
    return res.status(404).json({ message: "Expert profile not found" });
  }

  if (action === "decline") {
    const declined = new Set(expert.declinedRequestIds ?? []);
    declined.add(String(request._id));
    expert.declinedRequestIds = Array.from(declined);
    await expert.save();
    return res.json({ success: true, action: "decline" });
  }

  if (request.expert && String(request.expert) !== String(req.user._id)) {
    return res
      .status(409)
      .json({ message: "This request was assigned to another expert" });
  }

  request.expert = req.user._id;
  if (
    request.status === RequestStatus.PENDING ||
    request.status === RequestStatus.REVIEWED
  ) {
    request.status = RequestStatus.REVIEWED;
  }
  await request.save();

  const populated = await RequestModel.findById(request._id)
    .populate("customer", "name phone")
    .populate("expert", "name phone headline avatarUri");

  res.json({ success: true, action: "accept", request: populated });
};

// @desc    Reschedule a request (expert or customer)
// @route   PATCH /api/requests/:id/schedule
// @access  Private
export const rescheduleRequest = async (req: any, res: Response) => {
  const { scheduledDate } = req.body;
  const request = await RequestModel.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  if (req.user.role === UserRole.CUSTOMER) {
    if (String(request.customer) !== String(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }
  } else if (req.user.role === UserRole.EXPERT) {
    const allowed = await expertCanAccessRequest(
      String(request._id),
      String(req.user._id),
    );
    if (!allowed) {
      return res.status(403).json({ message: "Not authorized" });
    }
  } else if (req.user.role !== UserRole.ADMIN) {
    return res.status(403).json({ message: "Not authorized" });
  }

  request.scheduledDate = new Date(scheduledDate);
  await request.save();

  const populated = await RequestModel.findById(request._id)
    .populate("customer", "name phone")
    .populate("expert", "name phone headline avatarUri");

  res.json(populated);
};

// @desc    Submit a review for a completed request
// @route   POST /api/requests/:id/review
// @access  Private/Customer
export const submitRequestReview = async (req: any, res: Response) => {
  const { rating, comment } = req.body;
  const request = await RequestModel.findById(req.params.id);

  if (!request) {
    return res.status(404).json({ message: "Request not found" });
  }

  if (String(request.customer) !== String(req.user._id)) {
    return res.status(403).json({ message: "Not authorized" });
  }

  if (request.status !== RequestStatus.COMPLETED) {
    return res.status(400).json({
      message: "Reviews can only be submitted for completed requests",
    });
  }

  if (request.review?.rating) {
    return res.status(400).json({ message: "Request already reviewed" });
  }

  const expertId = request.expert || request.task?.expert;
  if (!expertId) {
    return res.status(400).json({ message: "No expert assigned to this request" });
  }

  const customer = await User.findById(req.user._id);
  request.review = {
    rating,
    comment: comment.trim(),
    customerName: customer?.name,
    createdAt: new Date(),
  };
  await request.save();

  await recalculateExpertRating(String(expertId));

  await request.populate([
    { path: "customer", select: "name phone email avatarUri" },
    {
      path: "expert",
      select:
        "name phone headline avatarUri categories experience rating available",
    },
  ]);

  res.json(await enrichRequestWithStatus(request));
};
