import { Response } from "express";
import { processManagedPayment } from "../services/marketplaceService";
import { Payment, PaymentStatus } from "../models/Payment";
import { RequestModel } from "../models/Request";
import { UserRole } from "../models/User";

// @desc    Process payment
// @route   POST /api/payments/process
// @access  Private/Customer
export const processPayment = async (req: any, res: Response) => {
  const { requestId, amount } = req.body;
  const payment = await processManagedPayment({
    requestId,
    amount,
    customerId: req.user._id.toString(),
  });
  res.status(201).json(payment);
};

// @desc    Get payments
// @route   GET /api/payments
// @access  Private
export const getPayments = async (req: any, res: Response) => {
  let query = {};

  if (req.user.role === UserRole.CUSTOMER) {
    query = { customer: req.user._id };
  } else if (req.user.role === UserRole.EXPERT) {
    const requests = await RequestModel.find({
      task: { $exists: true },
      "task.expert": req.user._id,
    }).select("_id");
    const requestIds = requests.map((r) => r._id);
    query = { request: { $in: requestIds }, status: PaymentStatus.SUCCESS };
  }

  const payments = await Payment.find(query)
    .populate("request", "description budget")
    .populate("customer", "name")
    .sort({ createdAt: -1 });

  res.json(payments);
};
