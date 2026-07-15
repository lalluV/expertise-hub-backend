"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPayments = exports.processPayment = void 0;
const marketplaceService_1 = require("../services/marketplaceService");
const Payment_1 = require("../models/Payment");
const Request_1 = require("../models/Request");
const User_1 = require("../models/User");
// @desc    Process payment
// @route   POST /api/payments/process
// @access  Private/Customer
const processPayment = async (req, res) => {
    const { requestId, amount } = req.body;
    const payment = await (0, marketplaceService_1.processManagedPayment)({
        requestId,
        amount,
        customerId: req.user._id.toString(),
    });
    res.status(201).json(payment);
};
exports.processPayment = processPayment;
// @desc    Get payments
// @route   GET /api/payments
// @access  Private
const getPayments = async (req, res) => {
    let query = {};
    if (req.user.role === User_1.UserRole.CUSTOMER) {
        query = { customer: req.user._id };
    }
    else if (req.user.role === User_1.UserRole.EXPERT) {
        const requests = await Request_1.RequestModel.find({
            task: { $exists: true },
            "task.expert": req.user._id,
        }).select("_id");
        const requestIds = requests.map((r) => r._id);
        query = { request: { $in: requestIds }, status: Payment_1.PaymentStatus.SUCCESS };
    }
    const payments = await Payment_1.Payment.find(query)
        .populate("request", "description budget")
        .populate("customer", "name")
        .sort({ createdAt: -1 });
    res.json(payments);
};
exports.getPayments = getPayments;
