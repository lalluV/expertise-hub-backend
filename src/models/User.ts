import mongoose, { Document, Schema } from "mongoose";

export enum UserRole {
  CUSTOMER = "customer",
  EXPERT = "expert",
  ADMIN = "admin",
}

export interface IUser extends Document {
  name: string;
  phone: string;
  email?: string;
  password?: string;
  role: UserRole;
  avatarUri?: string;
  location?: string;
  headline?: string;
  bio?: string;
  available?: boolean;
  profileComplete?: boolean;
  readNotificationIds?: string[];
  declinedRequestIds?: string[];
  savedExpertIds?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    phone: { type: String, required: true, unique: true },
    email: { type: String, unique: true, sparse: true },
    password: { type: String }, // Optional since OTP flow might not use password
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
      required: true,
    },
    avatarUri: { type: String },
    location: { type: String },
    headline: { type: String },
    bio: { type: String },
    available: { type: Boolean, default: true },
    profileComplete: { type: Boolean, default: false },
    readNotificationIds: [{ type: String }],
    declinedRequestIds: [{ type: String }],
    savedExpertIds: [{ type: Schema.Types.ObjectId, ref: "ExpertProfile" }],
  },
  { timestamps: true, strict: true },
);

export const User = mongoose.model<IUser>("User", UserSchema);
