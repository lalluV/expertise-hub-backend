import mongoose, { Document, Schema } from "mongoose";

export interface IExpertProfile extends Document {
  name: string;
  phone: string;
  email?: string;
  avatarUri?: string;
  headline?: string;
  location?: string;
  categories: string[];
  experience: number;
  rating: number;
  bio: string;
  available?: boolean;
  profileComplete?: boolean;
  readNotificationIds?: string[];
  declinedRequestIds?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ExpertProfileSchema = new Schema<IExpertProfile>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, sparse: true },
    avatarUri: { type: String },
    headline: { type: String },
    location: { type: String },
    categories: [{ type: String }],
    experience: { type: Number, default: 0 },
    rating: { type: Number, default: 0 },
    bio: { type: String, default: "" },
    available: { type: Boolean, default: true },
    profileComplete: { type: Boolean, default: false },
    readNotificationIds: [{ type: String }],
    declinedRequestIds: [{ type: String }],
  },
  { timestamps: true, strict: true },
);

export const ExpertProfile = mongoose.model<IExpertProfile>(
  "ExpertProfile",
  ExpertProfileSchema,
);
