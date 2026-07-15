import { Request, Response } from "express";
import { User, UserRole } from "../models/User";
import { ExpertProfile } from "../models/ExpertProfile";

export type ManagedUserStatus = "active" | "pending" | "inactive";

function resolveStatus(entity: {
  available?: boolean;
  profileComplete?: boolean;
}): ManagedUserStatus {
  if (entity.available === false) return "inactive";
  if (entity.profileComplete === false) return "pending";
  return "active";
}

function formatCustomer(user: InstanceType<typeof User>) {
  return {
    _id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: "customer" as const,
    status: resolveStatus(user),
    avatarUri: user.avatarUri,
    createdAt: user.createdAt,
  };
}

function formatExpert(expert: InstanceType<typeof ExpertProfile>) {
  return {
    _id: String(expert._id),
    name: expert.name,
    email: expert.email,
    phone: expert.phone,
    role: "expert" as const,
    status: resolveStatus(expert),
    avatarUri: expert.avatarUri,
    createdAt: expert.createdAt,
  };
}

// @desc    Get managed users (customers + experts)
// @route   GET /api/users
// @access  Private/Admin
export const getManagedUsers = async (_req: Request, res: Response) => {
  const [customers, experts] = await Promise.all([
    User.find({ role: UserRole.CUSTOMER }).select("-password").sort({ createdAt: -1 }),
    ExpertProfile.find({}).sort({ createdAt: -1 }),
  ]);

  const users = [
    ...customers.map(formatCustomer),
    ...experts.map(formatExpert),
  ].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  res.json(users);
};

// @desc    Create customer user
// @route   POST /api/users
// @access  Private/Admin
export const createManagedUser = async (req: Request, res: Response) => {
  const { name, phone, email } = req.body;

  const existing = await User.findOne({ phone });
  if (existing) {
    return res
      .status(400)
      .json({ message: "A user with this phone number already exists" });
  }

  const user = await User.create({
    name,
    phone,
    email,
    role: UserRole.CUSTOMER,
    profileComplete: true,
    available: true,
  });

  res.status(201).json(formatCustomer(user));
};

// @desc    Update user status
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
export const updateManagedUserStatus = async (req: Request, res: Response) => {
  const { role, status } = req.body as {
    role: "customer" | "expert";
    status: ManagedUserStatus;
  };

  if (role === "expert") {
    const expert = await ExpertProfile.findById(req.params.id);
    if (!expert) {
      return res.status(404).json({ message: "User not found" });
    }

    if (status === "inactive") {
      expert.available = false;
    } else if (status === "pending") {
      expert.available = true;
      expert.profileComplete = false;
    } else {
      expert.available = true;
      expert.profileComplete = true;
    }

    await expert.save();
    return res.json(formatExpert(expert));
  }

  const user = await User.findOne({
    _id: req.params.id,
    role: UserRole.CUSTOMER,
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  if (status === "inactive") {
    user.available = false;
  } else if (status === "pending") {
    user.available = true;
    user.profileComplete = false;
  } else {
    user.available = true;
    user.profileComplete = true;
  }

  await user.save();
  res.json(formatCustomer(user));
};
