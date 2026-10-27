"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitRequestReview = exports.rescheduleRequest = exports.expertRespondToRequest = exports.getRequestById = exports.updateRequestStatus = exports.assignExpertToRequest = exports.deleteRequest = exports.cancelRequest = exports.updateRequest = exports.getRequests = exports.createRequest = void 0;
const Request_1 = require("../models/Request");
const ExpertProfile_1 = require("../models/ExpertProfile");
const User_1 = require("../models/User");
const requestStatusEnrichment_1 = require("../utils/requestStatusEnrichment");
const expertProfileService_1 = require("../services/expertProfileService");
const storageService_1 = require("../services/storageService");
const populate_1 = require("../utils/populate");
const requestShape_1 = require("../utils/requestShape");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const Payment_1 = require("../models/Payment");
const listQuery_1 = require("../utils/listQuery");
// @desc    Create a new request
// @route   POST /api/requests
// @access  Private/Customer
const createRequest = async (req, res) => {
    const { description, attachments, expertId, scheduledDate, budget, category, customCategory, } = req.body;
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
        ...(category ? { category } : {}),
        ...(category === marketplaceSchemas_1.OTHER_CATEGORY && customCategory ? { customCategory } : {}),
        attachments: [...(attachments || []), ...fileAttachments],
        scheduledDate: scheduledDate || new Date(), // Fallback if not provided
        budget,
        status: Request_1.RequestStatus.PENDING,
    });
    res.status(201).json((0, requestShape_1.shapeRequestForViewer)(request, req.user));
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
    // Optional server-side filters: ?status=a,b &category= &search= &page= &limit=
    const filters = [query];
    const status = (0, listQuery_1.queryString)(req.query.status);
    if (status) {
        const valid = status
            .split(",")
            .map((x) => x.trim())
            .filter((x) => Object.values(Request_1.RequestStatus).includes(x));
        filters.push({ status: { $in: valid } });
    }
    const category = (0, listQuery_1.queryString)(req.query.category);
    if (category)
        filters.push({ category });
    const lq = (0, listQuery_1.parseListQuery)(req.query);
    if (lq.search) {
        const rx = new RegExp((0, listQuery_1.escapeRegex)(lq.search), "i");
        filters.push({ $or: [{ description: rx }, { category: rx }, { customCategory: rx }] });
    }
    const requests = await Request_1.RequestModel.find(filters.length > 1 ? { $and: filters } : query)
        .sort({ createdAt: -1 })
        .populate(populate_1.requestPopulate);
    const enriched = await (0, requestStatusEnrichment_1.enrichRequestsWithStatus)(requests, req.user);
    res.json((0, listQuery_1.paginate)(res, enriched, lq));
};
exports.getRequests = getRequests;
const EDITABLE_STATUSES = [Request_1.RequestStatus.PENDING, Request_1.RequestStatus.REVIEWED];
const CANCELLABLE_STATUSES = [
    Request_1.RequestStatus.PENDING,
    Request_1.RequestStatus.REVIEWED,
    Request_1.RequestStatus.QUOTED,
    Request_1.RequestStatus.ACCEPTED,
];
const loadOwnRequest = async (req, res) => {
    const request = await Request_1.RequestModel.findById(req.params.id);
    if (!request) {
        res.status(404).json({ message: "Request not found" });
        return null;
    }
    if (String(request.customer) !== String(req.user._id)) {
        res.status(403).json({ message: "Not authorized" });
        return null;
    }
    return request;
};
// @desc    Edit own request (only before a quote is sent)
// @route   PATCH /api/requests/:id
// @access  Private/Customer
const updateRequest = async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request)
        return;
    if (!EDITABLE_STATUSES.includes(request.status)) {
        return res.status(400).json({
            message: "This request can no longer be edited (a quote has been sent or it is closed)",
        });
    }
    const { description, category, customCategory, scheduledDate, budget, attachments } = req.body;
    if (description !== undefined)
        request.description = description;
    if (category !== undefined) {
        request.category = category;
        request.customCategory =
            category === marketplaceSchemas_1.OTHER_CATEGORY ? customCategory || undefined : undefined;
    }
    else if (customCategory !== undefined && request.category === marketplaceSchemas_1.OTHER_CATEGORY) {
        if (!customCategory) {
            return res.status(400).json({ message: "customCategory is required when category is 'Other'" });
        }
        request.customCategory = customCategory;
    }
    if (scheduledDate !== undefined)
        request.scheduledDate = new Date(scheduledDate);
    if (budget !== undefined)
        request.budget = budget;
    if (attachments !== undefined)
        request.attachments = attachments;
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(populate_1.requestPopulate);
    res.json(populated ? (0, requestShape_1.shapeRequestForViewer)(populated, req.user) : populated);
};
exports.updateRequest = updateRequest;
// @desc    Cancel own request (kept for history; status becomes "rejected")
// @route   PATCH /api/requests/:id/cancel
// @access  Private/Customer
const cancelRequest = async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request)
        return;
    if (request.cancelledAt) {
        return res.status(400).json({ message: "Request is already cancelled" });
    }
    if (!CANCELLABLE_STATUSES.includes(request.status)) {
        return res.status(400).json({
            message: "This request can no longer be cancelled. Please contact support.",
        });
    }
    const paid = await Payment_1.Payment.countDocuments({ request: request._id });
    if (paid > 0) {
        return res.status(400).json({
            message: "A payment was already made for this request. Please contact support to cancel.",
        });
    }
    request.status = Request_1.RequestStatus.REJECTED;
    request.cancelledAt = new Date();
    request.cancelledBy = "customer";
    request.cancelReason = req.body?.reason || undefined;
    if (request.quote && request.quote.status === "pending") {
        request.quote.status = "rejected";
        request.markModified("quote");
    }
    await request.save();
    const populated = await Request_1.RequestModel.findById(request._id).populate(populate_1.requestPopulate);
    res.json(populated ? (0, requestShape_1.shapeRequestForViewer)(populated, req.user) : populated);
};
exports.cancelRequest = cancelRequest;
// @desc    Delete own request (only while pending and unassigned)
// @route   DELETE /api/requests/:id
// @access  Private/Customer
const deleteRequest = async (req, res) => {
    const request = await loadOwnRequest(req, res);
    if (!request)
        return;
    const cancelled = Boolean(request.cancelledAt);
    if (!(request.status === Request_1.RequestStatus.PENDING && !request.expert) && !cancelled) {
        return res.status(400).json({
            message: "Only new, unassigned requests (or cancelled ones) can be deleted. Cancel it instead.",
        });
    }
    const paid = await Payment_1.Payment.countDocuments({ request: request._id });
    if (paid > 0) {
        return res.status(400).json({ message: "Requests with payments cannot be deleted" });
    }
    await request.deleteOne();
    res.json({ success: true, id: String(request._id) });
};
exports.deleteRequest = deleteRequest;
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
        .populate(populate_1.requestPopulate);
    res.json(populated ? (0, requestShape_1.shapeRequestForViewer)(populated, req.user) : populated);
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
    // Only admins reach this route (see requestRoutes); "completed" is
    // admin-only by design. Keep the embedded task in sync when completing.
    const role = req.user?.role;
    if (status === Request_1.RequestStatus.COMPLETED && role !== User_1.UserRole.ADMIN) {
        return res
            .status(403)
            .json({ message: "Only an admin can mark a request as completed" });
    }
    request.status = status;
    if (status === Request_1.RequestStatus.COMPLETED && request.task) {
        request.task.status = Request_1.TaskStatus.COMPLETED;
        request.markModified("task");
    }
    const updatedRequest = await request.save();
    res.json((0, requestShape_1.shapeRequestForViewer)(updatedRequest, req.user));
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
    await request.populate(populate_1.requestPopulate);
    res.json(await (0, requestStatusEnrichment_1.enrichRequestWithStatus)(request, req.user));
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
        // A customer may have addressed this request to this expert. Declining it
        // releases it to the open pool instead of leaving it stuck on them.
        if (request.expert &&
            String(request.expert) === String(req.user._id) &&
            request.status === Request_1.RequestStatus.PENDING) {
            request.expert = undefined;
            await request.save();
        }
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
        .populate(populate_1.requestPopulate);
    res.json({
        success: true,
        action: "accept",
        request: populated ? (0, requestShape_1.shapeRequestForViewer)(populated, req.user) : populated,
    });
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
        .populate(populate_1.requestPopulate);
    res.json(populated ? (0, requestShape_1.shapeRequestForViewer)(populated, req.user) : populated);
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
        status: Request_1.ReviewStatus.PENDING, // needs admin approval before it is public
        adminWritten: false,
        createdAt: new Date(),
    };
    await request.save();
    // Pending reviews do not count towards the rating; recalculating keeps the
    // stored rating consistent (approved-only).
    await (0, expertProfileService_1.recalculateExpertRating)(String(expertId));
    await request.populate(populate_1.requestPopulate);
    res.json(await (0, requestStatusEnrichment_1.enrichRequestWithStatus)(request, req.user));
};
exports.submitRequestReview = submitRequestReview;
