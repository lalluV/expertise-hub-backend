"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPickableCategoryNames = exports.getPublicServiceCategories = exports.getActiveCategories = exports.enrichCategoriesForAdmin = exports.enrichCategoriesForPublic = exports.countExpertsForCategory = void 0;
const Category_1 = require("../models/Category");
const ExpertProfile_1 = require("../models/ExpertProfile");
const countExpertsForCategory = async (categoryName) => {
    return ExpertProfile_1.ExpertProfile.countDocuments({
        categories: categoryName,
        available: { $ne: false },
    });
};
exports.countExpertsForCategory = countExpertsForCategory;
const enrichCategoriesForPublic = async (categories) => {
    const maxExperts = await ExpertProfile_1.ExpertProfile.countDocuments({
        available: { $ne: false },
    });
    return Promise.all(categories.map(async (category) => {
        const expertCount = await (0, exports.countExpertsForCategory)(category.name);
        return {
            name: category.name,
            label: category.label,
            icon: category.icon,
            expertCount,
            fillPercent: maxExperts > 0 ? Math.round((expertCount / maxExperts) * 100) : 0,
        };
    }));
};
exports.enrichCategoriesForPublic = enrichCategoriesForPublic;
const enrichCategoriesForAdmin = async (categories) => {
    const maxExperts = await ExpertProfile_1.ExpertProfile.countDocuments({
        available: { $ne: false },
    });
    return Promise.all(categories.map(async (category) => {
        const expertCount = await (0, exports.countExpertsForCategory)(category.name);
        return {
            ...category.toObject(),
            expertCount,
            fillPercent: maxExperts > 0 ? Math.round((expertCount / maxExperts) * 100) : 0,
        };
    }));
};
exports.enrichCategoriesForAdmin = enrichCategoriesForAdmin;
const getActiveCategories = () => Category_1.Category.find({ status: Category_1.CategoryStatus.ACTIVE }).sort({ label: 1, name: 1 });
exports.getActiveCategories = getActiveCategories;
const getPublicServiceCategories = async () => {
    const categories = await (0, exports.getActiveCategories)();
    return (0, exports.enrichCategoriesForPublic)(categories);
};
exports.getPublicServiceCategories = getPublicServiceCategories;
const getPickableCategoryNames = async () => {
    const activeCategories = await (0, exports.getActiveCategories)();
    const activeNames = activeCategories.map((category) => category.name);
    const inactiveNames = new Set((await Category_1.Category.find({ status: Category_1.CategoryStatus.INACTIVE }, "name")).map((category) => category.name));
    const experts = await ExpertProfile_1.ExpertProfile.find({}, "categories");
    const usedTags = [
        ...new Set(experts.flatMap((expert) => expert.categories || [])),
    ];
    const legacyTags = usedTags.filter((tag) => !inactiveNames.has(tag));
    return [...new Set([...activeNames, ...legacyTags])].sort((a, b) => a.localeCompare(b));
};
exports.getPickableCategoryNames = getPickableCategoryNames;
