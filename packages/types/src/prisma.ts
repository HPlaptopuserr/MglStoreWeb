import type {
  Prisma,
  User,
  Profile,
  UserSession,
  PasswordResetToken,
  AuditLog,
  RegistrationRequest,
  Organization,
  Branch,
  Address,
  Product,
  ProductImage,
  Reel,
  ReelAsset,
  ReelProcessingJob,
  ReelInteraction,
  Category,
  Discount,
  InventoryLedger,
  Order,
  OrderItem,
  OrderHistory,
  PaymentAttempt,
  Delivery,
  CourierLocationHistory,
  ReturnRequest,
} from "@prisma/client";

//////////////////////////////////////////////////
// BASE MODEL TYPES
//////////////////////////////////////////////////

export type UserModel = User;
export type ProfileModel = Profile;
export type UserSessionModel = UserSession;
export type PasswordResetTokenModel = PasswordResetToken;
export type AuditLogModel = AuditLog;
export type RegistrationRequestModel = RegistrationRequest;
export type OrganizationModel = Organization;
export type BranchModel = Branch;
export type AddressModel = Address;
export type ProductModel = Product;
export type ProductImageModel = ProductImage;
export type ReelModel = Reel;
export type ReelAssetModel = ReelAsset;
export type ReelProcessingJobModel = ReelProcessingJob;
export type ReelInteractionModel = ReelInteraction;
export type CategoryModel = Category;
export type DiscountModel = Discount;
export type InventoryLedgerModel = InventoryLedger;
export type OrderModel = Order;
export type OrderItemModel = OrderItem;
export type OrderHistoryModel = OrderHistory;
export type PaymentAttemptModel = PaymentAttempt;
export type DeliveryModel = Delivery;
export type CourierLocationHistoryModel = CourierLocationHistory;
export type ReturnRequestModel = ReturnRequest;

//////////////////////////////////////////////////
// USER RELATIONS
//////////////////////////////////////////////////

export type UserWithProfile = Prisma.UserGetPayload<{
  include: {
    profile: true;
    organization: true;
    addresses: true;
  };
}>;

export type UserWithSessions = Prisma.UserGetPayload<{
  include: {
    sessions: true;
  };
}>;

export type UserWithAuditLogs = Prisma.UserGetPayload<{
  include: {
    auditLogs: true;
  };
}>;

export type UserWithOrders = Prisma.UserGetPayload<{
  include: {
    orders: {
      include: {
        items: true;
        payments: true;
        delivery: true;
      };
    };
  };
}>;

//////////////////////////////////////////////////
// REGISTRATION
//////////////////////////////////////////////////

export type RegistrationRequestWithReviewer =
  Prisma.RegistrationRequestGetPayload<{
    include: {
      reviewedBy: true;
      approvedUser: true;
    };
  }>;

//////////////////////////////////////////////////
// ORGANIZATION
//////////////////////////////////////////////////

export type OrganizationWithMembers = Prisma.OrganizationGetPayload<{
  include: {
    members: true;
  };
}>;

export type OrganizationWithProducts = Prisma.OrganizationGetPayload<{
  include: {
    products: true;
  };
}>;

export type OrganizationFull = Prisma.OrganizationGetPayload<{
  include: {
    users: true;
    branches: true;
    products: true;
    orders: true;
  };
}>;

//////////////////////////////////////////////////
// PRODUCT
//////////////////////////////////////////////////

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
    discounts: true;
    organization: true;
  };
}>;

export type ProductFull = Prisma.ProductGetPayload<{
  include: {
    category: true;
    images: true;
    discounts: true;
    inventoryLogs: true;
    organization: true;
  };
}>;

//////////////////////////////////////////////////
// REELS
//////////////////////////////////////////////////

export type ReelWithMedia = Prisma.ReelGetPayload<{
  include: {
    assets: true;
    processingJobs: true;
  };
}>;

export type ReelWithOwner = Prisma.ReelGetPayload<{
  include: {
    organization: true;
    author: {
      include: {
        profile: true;
      };
    };
    businessCategory: true;
    product: {
      include: {
        images: true;
      };
    };
  };
}>;

export type ReelFull = Prisma.ReelGetPayload<{
  include: {
    organization: true;
    author: {
      include: {
        profile: true;
      };
    };
    reviewedBy: {
      include: {
        profile: true;
      };
    };
    businessCategory: true;
    product: {
      include: {
        images: true;
      };
    };
    assets: true;
    processingJobs: true;
    interactions: true;
  };
}>;

export type CategoryTree = Prisma.CategoryGetPayload<{
  include: {
    parent: true;
    children: true;
    products: true;
  };
}>;

//////////////////////////////////////////////////
// ORDER
//////////////////////////////////////////////////

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
      };
    };
  };
}>;

export type OrderWithCustomer = Prisma.OrderGetPayload<{
  include: {
    customer: {
      include: {
        profile: true;
      };
    };
    shippingAddressRef: true;
  };
}>;

export type OrderFull = Prisma.OrderGetPayload<{
  include: {
    organization: true;
    customer: {
      include: {
        profile: true;
        organization: true;
      };
    };
    shippingAddressRef: true;
    items: {
      include: {
        product: {
          include: {
            images: true;
            category: true;
          };
        };
      };
    };
    history: {
      include: {
        changedBy: {
          include: {
            profile: true;
          };
        };
      };
    };
    delivery: {
      include: {
        courier: {
          include: {
            profile: true;
          };
        };
      };
    };
    returnRequest: {
      include: {
        resolvedBy: {
          include: {
            profile: true;
          };
        };
      };
    };
    payments: true;
  };
}>;

//////////////////////////////////////////////////
// DELIVERY
//////////////////////////////////////////////////

export type DeliveryFull = Prisma.DeliveryGetPayload<{
  include: {
    order: {
      include: {
        customer: {
          include: {
            profile: true;
          };
        };
        items: {
          include: {
            product: true;
          };
        };
      };
    };
    courier: {
      include: {
        profile: true;
      };
    };
  };
}>;

//////////////////////////////////////////////////
// RETURNS
//////////////////////////////////////////////////

export type ReturnRequestFull = Prisma.ReturnRequestGetPayload<{
  include: {
    order: {
      include: {
        customer: {
          include: {
            profile: true;
          };
        };
        items: {
          include: {
            product: true;
          };
        };
      };
    };
    resolvedBy: {
      include: {
        profile: true;
      };
    };
  };
}>;

//////////////////////////////////////////////////
// CREATE / UPDATE INPUT TYPES
//////////////////////////////////////////////////

export type UserCreateInput = Prisma.UserCreateInput;
export type UserUpdateInput = Prisma.UserUpdateInput;
export type ProfileCreateInput = Prisma.ProfileCreateInput;
export type ProfileUpdateInput = Prisma.ProfileUpdateInput;

export type OrganizationCreateInput = Prisma.OrganizationCreateInput;
export type OrganizationUpdateInput = Prisma.OrganizationUpdateInput;

export type BranchCreateInput = Prisma.BranchCreateInput;
export type BranchUpdateInput = Prisma.BranchUpdateInput;

export type AddressCreateInput = Prisma.AddressCreateInput;
export type AddressUpdateInput = Prisma.AddressUpdateInput;

export type CategoryCreateInput = Prisma.CategoryCreateInput;
export type CategoryUpdateInput = Prisma.CategoryUpdateInput;

export type ProductCreateInput = Prisma.ProductCreateInput;
export type ProductUpdateInput = Prisma.ProductUpdateInput;

export type DiscountCreateInput = Prisma.DiscountCreateInput;
export type DiscountUpdateInput = Prisma.DiscountUpdateInput;

export type InventoryLedgerCreateInput = Prisma.InventoryLedgerCreateInput;

export type OrderCreateInput = Prisma.OrderCreateInput;
export type OrderUpdateInput = Prisma.OrderUpdateInput;
export type OrderItemCreateInput = Prisma.OrderItemCreateInput;
export type OrderHistoryCreateInput = Prisma.OrderHistoryCreateInput;

export type PaymentAttemptCreateInput = Prisma.PaymentAttemptCreateInput;
export type PaymentAttemptUpdateInput = Prisma.PaymentAttemptUpdateInput;

export type DeliveryCreateInput = Prisma.DeliveryCreateInput;
export type DeliveryUpdateInput = Prisma.DeliveryUpdateInput;

export type ReturnRequestCreateInput = Prisma.ReturnRequestCreateInput;
export type ReturnRequestUpdateInput = Prisma.ReturnRequestUpdateInput;

export type RegistrationRequestCreateInput =
  Prisma.RegistrationRequestCreateInput;
export type RegistrationRequestUpdateInput =
  Prisma.RegistrationRequestUpdateInput;

//////////////////////////////////////////////////
// WHERE / FILTER TYPES
//////////////////////////////////////////////////

export type UserWhereInput = Prisma.UserWhereInput;
export type ProductWhereInput = Prisma.ProductWhereInput;
export type OrderWhereInput = Prisma.OrderWhereInput;
export type OrganizationWhereInput = Prisma.OrganizationWhereInput;
export type RegistrationRequestWhereInput =
  Prisma.RegistrationRequestWhereInput;
