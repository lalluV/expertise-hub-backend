import { Request, Response } from "express";
import { Category, CategoryStatus } from "../models/Category";
import {
  getPublicServiceCategories,
  enrichCategoriesForAdmin,
} from "../services/categoryService";

// @desc    Get active service categories (public)
// @route   GET /api/categories/public
// @access  Public
export const getPublicCategories = async (_req: Request, res: Response) => {
  const categories = await getPublicServiceCategories();
  res.json(categories);
};

// @desc    Get all categories with expert counts
// @route   GET /api/categories
// @access  Private/Admin
export const getCategories = async (_req: Request, res: Response) => {
  const categories = await Category.find({}).sort({ label: 1 });
  const enriched = await enrichCategoriesForAdmin(categories);
  res.json(enriched);
};

// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
export const createCategory = async (req: Request, res: Response) => {
  const { name, label, description, icon, status } = req.body;

  const existing = await Category.findOne({
    name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
  });
  if (existing) {
    return res.status(400).json({ message: "Category already exists" });
  }

  const category = await Category.create({
    name: name.trim(),
    label: label?.trim() || name.trim(),
    description: description?.trim() ?? "",
    icon: icon ?? "category",
    status: status ?? CategoryStatus.ACTIVE,
  });

  const [enriched] = await enrichCategoriesForAdmin([category]);
  res.status(201).json(enriched);
};

// @desc    Update category
// @route   PATCH /api/categories/:id
// @access  Private/Admin
export const updateCategory = async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  const { label, description, icon, status } = req.body;
  if (label !== undefined) category.label = label.trim();
  if (description !== undefined) category.description = description.trim();
  if (icon !== undefined) category.icon = icon;
  if (status !== undefined) category.status = status;

  await category.save();
  const [enriched] = await enrichCategoriesForAdmin([category]);
  res.json(enriched);
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req: Request, res: Response) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    return res.status(404).json({ message: "Category not found" });
  }

  await category.deleteOne();
  res.json({ message: "Category deleted" });
};
