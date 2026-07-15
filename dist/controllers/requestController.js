"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRequestReview = exports.rescheduleRequest = exports.expertRespondToRequest = exports.getRequestById = exports.updateRequestStatus = exports.assignExpertToRequest = exports.getRequests = exports.createRequest = void 0;
const Request_1 = require("../models/Request");
const ExpertProfile_1 = require("../models/ExpertProfile");
const User_1 = require("../models/User");
const requestStatusEnrichment_1 = require("../utils/requestStatusEnrichment");
const expertProfileService_1 = require("../services/expertProfileService");
const storageService_1 = require("../services/storageService");
// @desc    Create a new request
// @route   POST /api/requests
// @access  Private/Customer
const createRequest = async (req, res) => {
    const { description, attachments, expertId, scheduledDate, budget } = req.body;
    const uploadedFiles = req.files ?? [];
    const fileAttachments = uploadedFiles.length > 0
        ? await (0, storageService_1.uploadMulterFiles)(uploadedFiles, "requests")
        : [];
    let assignedExpertId;
    if (expertId) {
        const expertProfile = await ExpertProfile_1.ExpertProfile.findById(expertId);
        if (!expertProfile) {
            return res.status(400).json({ message: "Expert profile not found" });
        }
        assignedExpertId = String(expertProfile._id);
    }
    const request = await Request_1.RequestModel.create({
        customer: req.user._id,
        ...(assignedExpertId ? { expert: assignedExpertId } : {}),
        description,
        attachments: [...(attachments || []), ...fileAttachments],
        scheduledDate: scheduledDate || new Date(), // Fallback if not provided
        budget,
        status: Request_1.RequestStatus.PENDING,
    });
    res.status(201).json(request);
};
exports.createRequest = createRequest;
// @desc    Get requests
// @route   GET /api/requests
// @access  Private
const getRequests = async (req, res) => {
    let query = {};
    if (req.user.role === User_1.UserRole.CUSTOMER) {
        query = { customer: req.user._id };
    }
    else if (req.user.role === User_1.UserRole.EXPERT) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id).select("declinedRequestIds");
        const declinedIds = expert?.declinedRequestIds ?? [];
        const openStatuses = [Request_1.RequestStatus.PENDING, Request_1.RequestStatus.REVIEWED];
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
    const requests = await Request_1.RequestModel.find(query)
        .populate("customer", "name phone email avatarUri")
        .populate("expert", "name phone headline avatarUri categories experience rating available");
    res.json(await (0, requestStatusEnrichment_1.enrichRequestsWithStatus)(requests));
};
exports.getRequests = getRequests;
// @desc    Assign expert to request (Admin)
// @route   PATCH /api/requests/:id/expert
// @access  Private/Admin
const assignExpertToRequest = async (req, res) => {
    const { expertId } = req.body;
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if ([Request_1.RequestStatus.COMPLETED, Request_1.RequestStatus.REJECTED].includes(request.status)) {
        return res.status(400).json({ message: "Request is no longer available" });
    }
    const expert = await ExpertProfile_1.ExpertProfile.findById(expertId);
    if (!expert) {
        return res.status(400).json({ message: "Expert profile not found" });
    }
    request.expert = expertId;
    if (request.status === Request_1.RequestStatus.PENDING) {
        request.status = Request_1.RequestStatus.REVIEWED;
    }
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id)
        .populate("customer", "name phone email avatarUri")
        .populate("expert", "name phone headline avatarUri categories experience rating available");
    res.json(populated);
};
exports.assignExpertToRequest = assignExpertToRequest;
// @desc    Update request status
// @route   PATCH /api/requests/:id/status
// @access  Private/Admin
const updateRequestStatus = async (req, res) => {
    const { status } = req.body;
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    request.status = status;
    const updatedRequest = await request.save();
    res.json(updatedRequest);
};
exports.updateRequestStatus = updateRequestStatus;
// @desc    Get request by ID
// @route   GET /api/requests/:id
// @access  Private
const getRequestById = async (req, res) => {
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if (req.user.role === User_1.UserRole.CUSTOMER &&
        String(request.customer) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
    }
    if (req.user.role === User_1.UserRole.EXPERT) {
        const allowed = await expertCanAccessRequest(String(request._id), String(req.user._id));
        if (!allowed) {
            return res.status(403).json({ message: "Not authorized" });
        }
    }
    await request.populate([
        { path: "customer", select: "name phone email avatarUri" },
        {
            path: "expert",
            select: "name phone headline avatarUri categories experience rating available",
        },
    ]);
    res.json(await (0, requestStatusEnrichment_1.enrichRequestWithStatus)(request));
};
exports.getRequestById = getRequestById;
const expertCanAccessRequest = async (requestId, expertId) => {
    const request = await Request_1.RequestModel.findById(requestId);
    if (!request)
        return null;
    const isAssignedExpert = request.expert && String(request.expert) === String(expertId);
    if (isAssignedExpert)
        return request;
    if (request.task && String(request.task.expert) === String(expertId)) {
        return request;
    }
    if ([Request_1.RequestStatus.PENDING, Request_1.RequestStatus.REVIEWED].includes(request.status) &&
        !request.expert) {
        const expert = await ExpertProfile_1.ExpertProfile.findById(expertId).select("declinedRequestIds");
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
const expertRespondToRequest = async (req, res) => {
    const { action } = req.body;
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if ([Request_1.RequestStatus.COMPLETED, Request_1.RequestStatus.REJECTED].includes(request.status)) {
        return res.status(400).json({ message: "Request is no longer available" });
    }
    const expert = await ExpertProfile_1.ExpertProfile.findById(req.user._id);
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
    if (request.status === Request_1.RequestStatus.PENDING ||
        request.status === Request_1.RequestStatus.REVIEWED) {
        request.status = Request_1.RequestStatus.REVIEWED;
    }
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id)
        .populate("customer", "name phone")
        .populate("expert", "name phone headline avatarUri");
    res.json({ success: true, action: "accept", request: populated });
};
exports.expertRespondToRequest = expertRespondToRequest;
// @desc    Reschedule a request (expert or customer)
// @route   PATCH /api/requests/:id/schedule
// @access  Private
const rescheduleRequest = async (req, res) => {
    const { scheduledDate } = req.body;
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if (req.user.role === User_1.UserRole.CUSTOMER) {
        if (String(request.customer) !== String(req.user._id)) {
            return res.status(403).json({ message: "Not authorized" });
        }
    }
    else if (req.user.role === User_1.UserRole.EXPERT) {
        const allowed = await expertCanAccessRequest(String(request._id), String(req.user._id));
        if (!allowed) {
            return res.status(403).json({ message: "Not authorized" });
        }
    }
    else if (req.user.role !== User_1.UserRole.ADMIN) {
        return res.status(403).json({ message: "Not authorized" });
    }
    request.scheduledDate = new Date(scheduledDate);
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id)
        .populate("customer", "name phone")
        .populate("expert", "name phone headline avatarUri");
    res.json(populated);
};
exports.rescheduleRequest = rescheduleRequest;
// @desc    Submit a review for a completed request
// @route   POST /api/requests/:id/review
// @access  Private/Customer
const submitRequestReview = async (req, res) => {
    const { rating, comment } = req.body;
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        return res.status(404).json({ message: "Request not found" });
    }
    if (String(request.customer) !== String(req.user._id)) {
        return res.status(403).json({ message: "Not authorized" });
    }
    if (request.status !== Request_1.RequestStatus.COMPLETED) {
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
    const customer = await User_1.User.findById(req.user._id);
    request.review = {
        rating,
        comment: comment.trim(),
        customerName: customer?.name,
        createdAt: new Date(),
    };
    await request.save();
    await (0, expertProfileService_1.recalculateExpertRating)(String(expertId));
    await request.populate([
        { path: "customer", select: "name phone email avatarUri" },
        {
            path: "expert",
            select: "name phone headline avatarUri categories experience rating available",
        },
    ]);
    res.json(await (0, requestStatusEnrichment_1.enrichRequestWithStatus)(request));
};
exports.submitRequestReview = submitRequestReview;
