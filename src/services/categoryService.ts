import { Category, CategoryStatus } from "../models/Category";
import { ExpertProfile } from "../models/ExpertProfile";

export const countExpertsForCategory = async (categoryName: string) => {
  return ExpertProfile.countDocuments({
    categories: categoryName,
    available: { $ne: false },
  });
};

export const enrichCategoriesForPublic = async (
  categories: InstanceType<typeof Category>[],
) => {
  const maxExperts = await ExpertProfile.countDocuments({
    available: { $ne: false },
  });

  return Promise.all(
    categories.map(async (category) => {
      const expertCount = await countExpertsForCategory(category.name);
      return {
        name: category.name,
        label: category.label,
        icon: category.icon,
        expertCount,
        fillPercent:
          maxExperts > 0 ? Math.round((expertCount / maxExperts) * 100) : 0,
      };
    }),
  );
};

export const enrichCategoriesForAdmin = async (
  categories: InstanceType<typeof Category>[],
) => {
  const maxExperts = await ExpertProfile.countDocuments({
    available: { $ne: false },
  });

  return Promise.all(
    categories.map(async (category) => {
      const expertCount = await countExpertsForCategory(category.name);
      return {
        ...category.toObject(),
        expertCount,
        fillPercent:
          maxExperts > 0 ? Math.round((expertCount / maxExperts) * 100) : 0,
      };
    }),
  );
};

export const getActiveCategories = () =>
  Category.find({ status: CategoryStatus.ACTIVE }).sort({ label: 1, name: 1 });

export const getPublicServiceCategories = async () => {
  const categories = await getActiveCategories();
  return enrichCategoriesForPublic(categories);
};

export const getPickableCategoryNames = async (): Promise<string[]> => {
  const activeCategories = await getActiveCategories();
  const activeNames = activeCategories.map((category) => category.name);

  const inactiveNames = new Set(
    (
      await Category.find({ status: CategoryStatus.INACTIVE }, "name")
    ).map((category) => category.name),
  );

  const experts = await ExpertProfile.find({}, "categories");
  const usedTags = [
    ...new Set(experts.flatMap((expert) => expert.categories || [])),
  ];

  const legacyTags = usedTags.filter((tag) => !inactiveNames.has(tag));

  return [...new Set([...activeNames, ...legacyTags])].sort((a, b) =>
    a.localeCompare(b),
  );
};
