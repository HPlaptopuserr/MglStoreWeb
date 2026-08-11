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
  pdfPreviewUrl?: string;
  pdfThumbnailUrl?: string;
  teacherInfo?: string;
  duration?: string;
  capacity?: string;
  courseDate?: string;
  courseTime?: string;
  deliveryType?: string;
  location?: string;
  address?: string;
  registrationLabel?: string;
  scheduleNote?: string;
  priceNote?: string;
  originalPrice?: number;
  ticketOptions?: StudyTicketOption[];
  tags?: string[];
  isActive?: boolean;
  isFeatured?: boolean;
  featuredOrder?: number;
  hasPurchased?: boolean;
  responsiblePeople?: ProjectResponsiblePerson[];
};

export type StudyTicketOption = {
  id: string;
  label: string;
  price: number;
};

export type ProjectResponsiblePerson = {
  id?: string;
  teamMemberId?: string;
  name?: string;
  role?: string;
  responsibility?: string;
  phone?: string;
  email?: string;
  avatarUrl?: string;
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
