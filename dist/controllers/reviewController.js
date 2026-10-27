"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminReview = exports.rejectReview = exports.approveReview = exports.listReviews = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Request_1 = require("../models/Request");
const User_1 = require("../models/User");
const expertProfileService_1 = require("../services/expertProfileService");
const http_1 = require("../utils/http");
const populate_1 = require("../utils/populate");
const effectiveStatus = (review) => review?.status ?? Request_1.ReviewStatus.APPROVED; // legacy reviews count as approved
const toAdminReview = (request) => {
    const plain = typeof request.toObject === "function" ? request.toObject() : request;
    const review = plain.review;
    const customer = plain.customer;
    const expert = plain.expert ?? plain.task?.expert;
    return {
        _id: String(plain._id), // review id === request id
        requestId: String(plain._id),
        rating: review.rating,
        comment: review.comment,
        status: effectiveStatus(review),
        adminWritten: Boolean(review.adminWritten),
        customerName: review.customerName,
        rejectionReason: review.rejectionReason,
        reviewedAt: review.reviewedAt,
        createdAt: review.createdAt,
        customer: customer && typeof customer === "object"
            ? { _id: customer._id, name: customer.name, email: customer.email }
            : customer,
        // Admin always sees the real expert name
        expert: expert && typeof expert === "object"
            ? {
                _id: expert._id,
                name: expert.name,
                email: expert.email,
                hideName: expert.hideName ?? false,
                displayName: expert.displayName,
            }
            : expert,
        requestDescription: plain.description,
        requestCategory: plain.category ?? null,
        requestCustomCategory: plain.customCategory ?? null,
    };
};
const loadReviewRequest = async (id) => {
    if (!mongoose_1.default.Types.ObjectId.isValid(id)) {
        throw new http_1.HttpError(404, "Review not found");
    }
    const request = await Request_1.RequestModel.findById(id);
    if (!request || !request.review?.rating) {
        throw new http_1.HttpError(404, "Review not found");
    }
    return request;
};
const populateForAdmin = (id) => Request_1.RequestModel.findById(id)
    .populate("customer", "name email")
    .populate("expert", populate_1.EXPERT_REF_SELECT)
    .populate("task.expert", populate_1.EXPERT_REF_SELECT);
const expertIdOf = (request) => request.expert || request.task?.expert;
// @desc    List reviews by moderation status (default: pending)
// @route   GET /api/admin/reviews?status=pending|approved|rejected|all
// @access  Private/Admin
const listReviews = async (req, res) => {
    const status = String(req.query.status ?? "pending");
    if (!["pending", "approved", "rejected", "all"].includes(status)) {
        throw new http_1.HttpError(400, "status must be pending, approved, rejected or all");
    }
    const filter = { "review.rating": { $exists: true } };
    if (status === Request_1.ReviewStatus.APPROVED) {
        filter["review.status"] = { $nin: [Request_1.ReviewStatus.PENDING, Request_1.ReviewStatus.REJECTED] };
    }
    else if (status !== "all") {
        filter["review.status"] = status;
    }
    const requests = await Request_1.RequestModel.find(filter)
        .populate("customer", "name email")
        .populate("expert", populate_1.EXPERT_REF_SELECT)
        .populate("task.expert", populate_1.EXPERT_REF_SELECT)
        .sort({ "review.createdAt": -1 });
    res.json(requests.map(toAdminReview));
};
exports.listReviews = listReviews;
const moderate = async (req, res, next) => {
    const request = await loadReviewRequest(String(req.params.id));
    const review = request.review;
    review.status = next;
    review.reviewedAt = new Date();
    review.reviewedBy = req.user._id;
    review.rejectionReason =
        next === Request_1.ReviewStatus.REJECTED ? req.body?.reason?.trim() || undefined : undefined;
    request.markModified("review");
    await request.save();
    const expertId = expertIdOf(request);
    if (expertId)
        await (0, expertProfileService_1.recalculateExpertRating)(String(expertId));
    res.json(toAdminReview(await populateForAdmin(request._id)));
};
// @desc    Approve a review (becomes public and counts towards rating)
// @route   PATCH /api/admin/reviews/:id/approve
// @access  Private/Admin
const approveReview = (req, res) => moderate(req, res, Request_1.ReviewStatus.APPROVED);
exports.approveReview = approveReview;
// @desc    Reject a review (hidden, does not count)
// @route   PATCH /api/admin/reviews/:id/reject
// @access  Private/Admin
const rejectReview = (req, res) => moderate(req, res, Request_1.ReviewStatus.REJECTED);
exports.rejectReview = rejectReview;
// @desc    Create a review on behalf of a customer (auto-approved, adminWritten)
// @route   POST /api/admin/reviews
// @access  Private/Admin
const createAdminReview = async (req, res) => {
    const { requestId, rating, comment, customerName } = req.body;
    if (!mongoose_1.default.Types.ObjectId.isValid(requestId)) {
        throw new http_1.HttpError(404, "Request not found");
    }
    const request = await Request_1.RequestModel.findById(requestId);
    if (!request)
        throw new http_1.HttpError(404, "Request not found");
    if (request.status !== Request_1.RequestStatus.COMPLETED) {
        throw new http_1.HttpError(400, "Reviews can only be added to completed requests");
    }
    if (request.review?.rating) {
        throw new http_1.HttpError(409, "This request already has a review");
    }
    const expertId = expertIdOf(request);
    if (!expertId) {
        throw new http_1.HttpError(400, "No expert assigned to this request");
    }
    const customer = await User_1.User.findById(request.customer);
    const now = new Date();
    request.review = {
        rating,
        comment: comment.trim(),
        customerName: customerName || customer?.name,
        status: Request_1.ReviewStatus.APPROVED,
        adminWritten: true,
        reviewedAt: now,
        reviewedBy: req.user._id,
        createdAt: now,
    };
    await request.save();
    await (0, expertProfileService_1.recalculateExpertRating)(String(expertId));
    res.status(201).json(toAdminReview(await populateForAdmin(request._id)));
};
exports.createAdminReview = createAdminReview;
