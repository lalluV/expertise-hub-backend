import mongoose, { Document, Schema } from "mongoose";

export enum PaymentStatus {
  PENDING = "pending",
  SUCCESS = "success",
  FAILED = "failed",
}

export interface IPayment extends Document {
  request: mongoose.Types.ObjectId;
  customer: mongoose.Types.ObjectId;
  amount: number;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    request: { type: Schema.Types.ObjectId, ref: "Request", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
      required: true,
    },
  },
  { timestamps: true, strict: true },
);

export const Payment = mongoose.model<IPayment>("Payment", PaymentSchema);
