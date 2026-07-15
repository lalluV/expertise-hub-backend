import mongoose, { Document, Schema } from "mongoose";

export enum RequestStatus {
  PENDING = "pending",
  REVIEWED = "reviewed",
  QUOTED = "quoted",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
  ASSIGNED = "assigned",
  COMPLETED = "completed",
}

export enum QuoteStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

export enum TaskStatus {
  ASSIGNED = "assigned",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}

export interface IRequestQuote {
  basePrice: number;
  commission: number;
  finalPrice: number;
  notes?: string;
  status: QuoteStatus;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRequestTask {
  expert: mongoose.Types.ObjectId;
  status: TaskStatus;
  notes?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IRequestReview {
  rating: number;
  comment: string;
  customerName?: string;
  createdAt?: Date;
}

export interface IRequest extends Document {
  customer: mongoose.Types.ObjectId;
  expert?: mongoose.Types.ObjectId;
  description: string;
  attachments: string[];
  status: RequestStatus;
  scheduledDate: Date;
  budget?: number;
  quote?: IRequestQuote;
  task?: IRequestTask;
  review?: IRequestReview;
  createdAt: Date;
  updatedAt: Date;
}

const QuoteEmbedSchema = new Schema<IRequestQuote>(
  {
    basePrice: { type: Number, required: true },
    commission: { type: Number, required: true },
    finalPrice: { type: Number, required: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: Object.values(QuoteStatus),
      default: QuoteStatus.PENDING,
      required: true,
    },
  },
  { timestamps: true, _id: false },
);

const TaskEmbedSchema = new Schema<IRequestTask>(
  {
    expert: {
      type: Schema.Types.ObjectId,
      ref: "ExpertProfile",
      required: true,
    },
    status: {
      type: String,
      enum: Object.values(TaskStatus),
      default: TaskStatus.ASSIGNED,
      required: true,
    },
    notes: { type: String, default: "" },
  },
  { timestamps: true, _id: false },
);

const ReviewEmbedSchema = new Schema<IRequestReview>(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, maxlength: 2000 },
    customerName: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false }, _id: false },
);

const RequestSchema = new Schema<IRequest>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    expert: { type: Schema.Types.ObjectId, ref: "ExpertProfile", required: false },
    description: { type: String, required: true },
    attachments: [{ type: String }],
    status: {
      type: String,
      enum: Object.values(RequestStatus),
      default: RequestStatus.PENDING,
      required: true,
    },
    scheduledDate: { type: Date, required: true },
    budget: { type: Number },
    quote: { type: QuoteEmbedSchema, required: false },
    task: { type: TaskEmbedSchema, required: false },
    review: { type: ReviewEmbedSchema, required: false },
  },
  { timestamps: true, strict: true },
);

export const RequestModel = mongoose.model<IRequest>("Request", RequestSchema);
