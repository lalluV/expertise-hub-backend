"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCustomCategoryEntries = exports.deleteCategory = exports.updateCategory = exports.createCategory = exports.getCategories = exports.getPublicCategories = void 0;
const Category_1 = require("../models/Category");
const Request_1 = require("../models/Request");
const ExpertProfile_1 = require("../models/ExpertProfile");
const marketplaceSchemas_1 = require("../validation/marketplaceSchemas");
const categoryService_1 = require("../services/categoryService");
// @desc    Get active service categories (public)
// @route   GET /api/categories/public
// @access  Public
const getPublicCategories = async (_req, res) => {
    const categories = await (0, categoryService_1.getPublicServiceCategories)();
    res.json(categories);
};
exports.getPublicCategories = getPublicCategories;
// @desc    Get all categories with expert counts
// @route   GET /api/categories
// @access  Private/Admin
const getCategories = async (_req, res) => {
    const categories = await Category_1.Category.find({}).sort({ label: 1 });
    const enriched = await (0, categoryService_1.enrichCategoriesForAdmin)(categories);
    res.json(enriched);
};
exports.getCategories = getCategories;
// @desc    Create category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
    const { name, label, description, icon, status } = req.body;
    const existing = await Category_1.Category.findOne({
        name: { $regex: new RegExp(`^${name.trim()}$`, "i") },
    });
    if (existing) {
        return res.status(400).json({ message: "Category already exists" });
    }
    const category = await Category_1.Category.create({
        name: name.trim(),
        label: label?.trim() || name.trim(),
        description: description?.trim() ?? "",
        icon: icon ?? "category",
        status: status ?? Category_1.CategoryStatus.ACTIVE,
    });
    const [enriched] = await (0, categoryService_1.enrichCategoriesForAdmin)([category]);
    res.status(201).json(enriched);
};
exports.createCategory = createCategory;
// @desc    Update category
// @route   PATCH /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
    const category = await Category_1.Category.findById(req.params.id);
    if (!category) {
        return res.status(404).json({ message: "Category not found" });
    }
    const { label, description, icon, status } = req.body;
    if (label !== undefined)
        category.label = label.trim();
    if (description !== undefined)
        category.description = description.trim();
    if (icon !== undefined)
        category.icon = icon;
    if (status !== undefined)
        category.status = status;
    await category.save();
    const [enriched] = await (0, categoryService_1.enrichCategoriesForAdmin)([category]);
    res.json(enriched);
};
exports.updateCategory = updateCategory;
// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
    const category = await Category_1.Category.findById(req.params.id);
    if (!category) {
        return res.status(404).json({ message: "Category not found" });
    }
    await category.deleteOne();
    res.json({ message: "Category deleted" });
};
exports.deleteCategory = deleteCategory;
// @desc    Custom "Other" category/skill entries entered by customers and experts
// @route   GET /api/categories/custom-entries
// @access  Private/Admin
const getCustomCategoryEntries = async (_req, res) => {
    const [requests, experts] = await Promise.all([
        Request_1.RequestModel.find({
            category: marketplaceSchemas_1.OTHER_CATEGORY,
            customCategory: { $exists: true, $ne: "" },
        })
            .populate("customer", "name email")
            .sort({ createdAt: -1 }),
        ExpertProfile_1.ExpertProfile.find({
            customCategory: { $exists: true, $ne: "" },
        }).sort({ updatedAt: -1 }),
    ]);
    const entries = [
        ...requests.map((r) => ({
            source: "request",
            id: String(r._id),
            customCategory: r.customCategory,
            requestStatus: r.status,
            submittedBy: r.customer
                ? {
                    _id: String(r.customer._id),
                    name: r.customer.name,
                    email: r.customer.email,
                }
                : null,
            createdAt: r.createdAt,
        })),
        ...experts.map((e) => ({
            source: "expert",
            id: String(e._id),
            customCategory: e.customCategory,
            submittedBy: { _id: String(e._id), name: e.name, email: e.email },
            createdAt: e.createdAt,
        })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(entries);
};
exports.getCustomCategoryEntries = getCustomCategoryEntries;
