import mongoose, { Document, Schema } from "mongoose";

export enum CategoryStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export interface ICategory extends Document {
  name: string;
  label: string;
  description: string;
  icon: string;
  status: CategoryStatus;
  createdAt: Date;
  updatedAt: Date;
}

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, unique: true, trim: true },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    icon: { type: String, default: "category" },
    status: {
      type: String,
      enum: Object.values(CategoryStatus),
      default: CategoryStatus.ACTIVE,
    },
  },
  { timestamps: true, strict: true },
);

export const Category = mongoose.model<ICategory>("Category", CategorySchema);
