import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { User, UserRole } from "./src/models/User";
import { ExpertProfile } from "./src/models/ExpertProfile";
import { RequestModel, RequestStatus, QuoteStatus, TaskStatus } from "./src/models/Request";
import { Payment, PaymentStatus } from "./src/models/Payment";
import { Category, CategoryStatus } from "./src/models/Category";
import { recalculateExpertRating } from "./src/services/expertProfileService";
import dotenv from "dotenv";

dotenv.config();

const EXPERTS = [
  {
    name: "Alex Rivera",
    phone: "+15550000001",
    bio: "Senior Cloud Architect",
    headline: "Senior Cloud Architect",
    categories: ["AWS", "Kubernetes", "Terraform"],
    experience: 6,
    rating: 0,
  },
  {
    name: "Sarah Chen",
    phone: "+15550000002",
    bio: "Azure Solutions Expert",
    headline: "Azure Solutions Expert",
    categories: ["Azure", "DevOps"],
    experience: 5,
    rating: 0,
  },
  {
    name: "Michael Okoro",
    phone: "+15550000003",
    bio: "Google Cloud Specialist",
    headline: "Google Cloud Specialist",
    categories: ["GCP", "Python", "BigQuery"],
    experience: 4,
    rating: 0,
  },
  {
    name: "Elena Rodriguez",
    phone: "+15550000004",
    bio: "Hybrid Cloud Architect",
    headline: "Hybrid Cloud Architect",
    categories: ["VMware", "AWS"],
    experience: 6,
    rating: 0,
  },
  {
    name: "Marcus Chen",
    phone: "+15550000005",
    bio: "Cloud Architect",
    headline: "Cloud Architect",
    categories: ["AWS", "Cloud"],
    experience: 6,
    rating: 0,
  },
  {
    name: "David Miller",
    phone: "+15550000006",
    bio: "Legal Consultant",
    headline: "Legal Consultant",
    categories: ["Legal", "Compliance"],
    experience: 4,
    rating: 0,
  },
];

const SERVICE_CATEGORIES = [
  {
    name: "Legal",
    label: "Legal & Compliance",
    description: "Corporate law, contracts, IP",
    icon: "gavel",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "AWS",
    label: "Cloud Infrastructure",
    description: "AWS, Azure, DevOps, K8s",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "Azure",
    label: "Cloud Infrastructure",
    description: "AWS, Azure, DevOps, K8s",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "GCP",
    label: "Data Science & AI",
    description: "Machine Learning, Big Data",
    icon: "biotech",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "Kubernetes",
    label: "Cloud Infrastructure",
    description: "AWS, Azure, DevOps, K8s",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "DevOps",
    label: "Cloud Infrastructure",
    description: "AWS, Azure, DevOps, K8s",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "Compliance",
    label: "Legal & Compliance",
    description: "Corporate law, contracts, IP",
    icon: "gavel",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "Marketing",
    label: "Growth & Marketing",
    description: "SEO, SEM, Branding strategy",
    icon: "campaign",
    status: CategoryStatus.INACTIVE,
  },
  {
    name: "Python",
    label: "Data Science & AI",
    description: "Machine Learning, Big Data",
    icon: "biotech",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "Terraform",
    label: "Cloud Infrastructure",
    description: "AWS, Azure, DevOps, K8s",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "Cloud",
    label: "Cloud Infrastructure",
    description: "AWS, Azure, DevOps, K8s",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "VMware",
    label: "Cloud Infrastructure",
    description: "Virtualization, private cloud, hybrid infrastructure",
    icon: "cloud",
    status: CategoryStatus.ACTIVE,
  },
  {
    name: "BigQuery",
    label: "Data Science & AI",
    description: "Machine Learning, Big Data",
    icon: "biotech",
    status: CategoryStatus.ACTIVE,
  },
];

const DEMO_CUSTOMER = {
  name: "Sarah Jenkins",
  phone: "+15550001000",
  location: "San Francisco, CA",
  profileComplete: true,
};

const seed = async () => {
  try {
    await mongoose.connect(
      process.env.MONGO_URI || "mongodb://127.0.0.1:27017/expertise-hub",
    );
    console.log("Connected to MongoDB for seeding...");

    const expertCollection = mongoose.connection.collection("expertprofiles");
    try {
      await expertCollection.dropIndex("user_1");
      console.log("✅ Dropped legacy user index on expert profiles");
    } catch {
      // Index may not exist on fresh databases
    }

    const existingAdmin = await User.findOne({
      phone: "0000000000",
      role: UserRole.ADMIN,
    });
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await User.create({
        name: "Super Admin",
        phone: "0000000000",
        password: hashedPassword,
        role: UserRole.ADMIN,
      });
      console.log("✅ Admin user created (Phone: 0000000000 / Password: admin123)");
    }

    const expertProfiles: InstanceType<typeof ExpertProfile>[] = [];
    for (const expert of EXPERTS) {
      let profile = await ExpertProfile.findOne({ phone: expert.phone });
      if (!profile) {
        profile = await ExpertProfile.create({
          name: expert.name,
          phone: expert.phone,
          bio: expert.bio,
          headline: expert.headline,
          categories: expert.categories,
          experience: expert.experience,
          rating: expert.rating,
          available: true,
          profileComplete: true,
        });
        console.log(`✅ Expert profile created: ${expert.name}`);
      } else {
        profile.name = expert.name;
        profile.bio = expert.bio;
        profile.headline = expert.headline;
        profile.categories = expert.categories;
        profile.experience = expert.experience;
        profile.rating = expert.rating;
        profile.available = true;
        profile.profileComplete = true;
        await profile.save();
        console.log(`✅ Expert profile updated: ${expert.name}`);
      }
      expertProfiles.push(profile);
    }

    let customer = await User.findOne({ phone: DEMO_CUSTOMER.phone });
    if (!customer) {
      customer = await User.create({
        ...DEMO_CUSTOMER,
        role: UserRole.CUSTOMER,
      });
      console.log("✅ Demo customer created");
    }

    const alex = expertProfiles[0];
    const david = expertProfiles[5];

    const existingRequests = await RequestModel.countDocuments({
      customer: customer._id,
    });

    if (existingRequests === 0) {
      const quotedRequest = await RequestModel.create({
        customer: customer._id,
        expert: alex._id,
        description:
          "[Smart Home Installation] · Remote\nFull setup of Nest ecosystem and security cameras throughout the property.",
        status: RequestStatus.QUOTED,
        scheduledDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        budget: 450,
        attachments: [],
        quote: {
          basePrice: 400,
          commission: 50,
          finalPrice: 450,
          status: QuoteStatus.PENDING,
        },
      });

      const inProgressRequest = await RequestModel.create({
        customer: customer._id,
        expert: alex._id,
        description:
          "[Technical Architecture Review] · Remote\nExpert consultation for infrastructure scalability and cloud deployment strategy.",
        status: RequestStatus.ASSIGNED,
        scheduledDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        budget: 1200,
        attachments: [],
        task: {
          expert: alex._id,
          status: TaskStatus.IN_PROGRESS,
          notes: "Milestone 2 of 4 in progress",
        },
      });

      const completedRequest = await RequestModel.create({
        customer: customer._id,
        expert: david._id,
        description:
          "[Security Audit] · Remote\nComprehensive security assessment of cloud infrastructure and access controls.",
        status: RequestStatus.COMPLETED,
        scheduledDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
        budget: 850,
        attachments: [],
        task: {
          expert: david._id,
          status: TaskStatus.COMPLETED,
          notes: "Audit report delivered",
        },
        review: {
          rating: 5,
          comment:
            "David delivered a thorough security audit with clear, actionable recommendations. Highly professional.",
          customerName: customer.name,
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      });

      await recalculateExpertRating(String(david._id));

      const acceptedRequest = await RequestModel.create({
        customer: customer._id,
        expert: alex._id,
        description:
          "[Interior Design] · On-site\nConsultation for modern interior design and space planning.",
        status: RequestStatus.ACCEPTED,
        scheduledDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        budget: 600,
        attachments: [],
        quote: {
          basePrice: 540,
          commission: 60,
          finalPrice: 600,
          status: QuoteStatus.ACCEPTED,
        },
      });

      await Payment.create({
        request: acceptedRequest._id,
        customer: customer._id,
        amount: 600,
        status: PaymentStatus.SUCCESS,
      });

      await RequestModel.create({
        customer: customer._id,
        description:
          "[Legal Consultation] · Remote\nPriority legal consultation regarding corporate structure.",
        status: RequestStatus.PENDING,
        scheduledDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        budget: 350,
        attachments: [],
      });

      console.log("✅ Demo requests, quotes, tasks, and payments created");
      console.log(`   Customer login phone: ${DEMO_CUSTOMER.phone}`);
      console.log(`   Expert login phone: ${EXPERTS[0].phone}`);
    }

    for (const category of SERVICE_CATEGORIES) {
      await Category.findOneAndUpdate(
        { name: category.name },
        category,
        { upsert: true, new: true },
      );
    }
    console.log("✅ Service categories seeded");

    console.log("🎉 Seeding complete!");
    process.exit(0);
  } catch (error) {
    console.error("Seeding failed", error);
    process.exit(1);
  }
};

seed();
