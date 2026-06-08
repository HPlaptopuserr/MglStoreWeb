export type ProjectItem = {
  id: string;
  title: string;
  category?: string;
  summary?: string;
  details?: string;
  price?: number;
  imageUrl?: string;
  imageUrls?: string[];
  pdfUrl?: string;
  teacherInfo?: string;
  duration?: string;
  capacity?: string;
  priceNote?: string;
  tags?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
};

export type ProjectShowcaseSection = {
  id: string;
  title: string;
  subtitle?: string;
  projectIds: string[];
};

export type ProjectPaymentDeepLink = {
  name: string;
  description: string;
  logo: string;
  link: string;
};

export type ProjectPaymentSession = {
  invoiceId: string;
  providerInvoiceId?: string;
  amount: number;
  qrText: string;
  qrImage: string;
  urls: ProjectPaymentDeepLink[];
  expiresAt?: string;
};
