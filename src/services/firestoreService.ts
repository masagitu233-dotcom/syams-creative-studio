import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
  writeBatch,
  type QueryDocumentSnapshot,
  type DocumentData,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';
import {
  INITIAL_FAQS,
  INITIAL_PORTFOLIO,
  INITIAL_SERVICES,
  INITIAL_SITE_SETTINGS,
} from '../data/initialCatalog';
import {
  formatServicePriceLabel,
  normalizeWhatsappNumber,
  sanitizeExternalUrl,
  slugify,
} from '../utils/studioLogic';
import type {
  ActivityLog,
  AdminRecord,
  ContactMessage,
  CustomerProfile,
  FaqItem,
  MediaAsset,
  OrderItem,
  OrderStatus,
  PortfolioItem,
  ServiceItem,
  SiteSettings,
} from '../types/studio';

function randomDocId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 10);
  const ts = Date.now().toString(36);
  return `${prefix}_${ts}_${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

// -----------------------------------------------------------------------------
// Admin & Customer Checks
// -----------------------------------------------------------------------------

export async function checkIsAdminDocument(uid: string): Promise<boolean> {
  if (!uid) return false;
  const path = `admins/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists() && snap.data()?.role === 'super_admin';
  } catch {
    return false;
  }
}

export async function ensureAdminRecord(params: {
  uid: string;
  email: string;
  displayName: string;
}): Promise<void> {
  const path = `admins/${params.uid}`;
  try {
    const ref = doc(db, 'admins', params.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: params.uid,
        email: params.email.slice(0, 200),
        displayName: (params.displayName || 'Administrator').slice(0, 120),
        role: 'super_admin',
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function listAdmins(): Promise<AdminRecord[]> {
  const path = 'admins';
  try {
    const snap = await getDocs(collection(db, path));
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<AdminRecord, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchCustomerProfile(uid: string): Promise<CustomerProfile | null> {
  const path = `customers/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'customers', uid));
    if (!snap.exists()) return null;
    return { id: snap.id, ...(snap.data() as Omit<CustomerProfile, 'id'>) };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function upsertCustomerProfile(params: {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  whatsapp: string;
}): Promise<void> {
  const path = `customers/${params.uid}`;
  try {
    const ref = doc(db, 'customers', params.uid);
    const existing = await getDoc(ref);
    const normalizedWa = normalizeWhatsappNumber(params.whatsapp).slice(0, 25);
    const safeName = (params.displayName || 'Pelanggan').trim().slice(0, 120);
    const safePhoto = sanitizeExternalUrl(params.photoURL).slice(0, 500);

    if (existing.exists()) {
      await updateDoc(ref, {
        displayName: safeName,
        photoURL: safePhoto,
        whatsapp: normalizedWa,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        uid: params.uid,
        displayName: safeName,
        email: params.email.trim().slice(0, 200),
        photoURL: safePhoto,
        whatsapp: normalizedWa,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// -----------------------------------------------------------------------------
// Public Catalog Subscriptions & Reads
// -----------------------------------------------------------------------------

export function subscribePublicServices(
  onData: (items: ServiceItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'services'), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceItem, 'id'>) }))
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
      onData(items);
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'services');
      } catch {
        // Error surfaced through onError callback for resilient public UI
      }
    }
  );
}

export function subscribePublicPortfolio(
  onData: (items: PortfolioItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'portfolio'), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PortfolioItem, 'id'>) }))
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
      onData(items);
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'portfolio');
      } catch {
        // Error surfaced through onError callback
      }
    }
  );
}

export function subscribePublicFaqs(
  onData: (items: FaqItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'faqs'), where('isPublished', '==', true));
  return onSnapshot(
    q,
    (snap) => {
      const items = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FaqItem, 'id'>) }))
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99));
      onData(items);
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, 'faqs');
      } catch {
        // Error surfaced through onError callback
      }
    }
  );
}

export function subscribeSiteSettings(
  onData: (settings: SiteSettings | null) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const ref = doc(db, 'site_settings', 'general');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData({ id: snap.id, ...(snap.data() as Omit<SiteSettings, 'id'>) });
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.GET, 'site_settings/general');
      } catch {
        // Error surfaced through onError callback
      }
    }
  );
}

// -----------------------------------------------------------------------------
// Customer Orders (Strict UID-Scoped Access)
// -----------------------------------------------------------------------------

export async function createOrderInFirestore(input: {
  orderCode: string;
  customerUid: string;
  customerName: string;
  customerEmail: string;
  customerWhatsapp: string;
  serviceId: string;
  serviceTitle: string;
  estimatedPriceLabel: string;
  quantityEstimate: number;
  projectTitle: string;
  projectBrief: string;
  deadline: string;
  attachmentName?: string;
  attachmentDriveFileId?: string;
  attachmentUrl?: string;
}): Promise<string> {
  const orderId = randomDocId('ord');
  const path = `orders/${orderId}`;
  try {
    const payload: Record<string, unknown> = {
      orderCode: input.orderCode.trim().slice(0, 32),
      customerUid: input.customerUid,
      customerName: input.customerName.trim().slice(0, 120),
      customerEmail: input.customerEmail.trim().slice(0, 200),
      customerWhatsapp: normalizeWhatsappNumber(input.customerWhatsapp).slice(0, 25),
      serviceId: input.serviceId.trim().slice(0, 128),
      serviceTitle: input.serviceTitle.trim().slice(0, 140),
      estimatedPriceLabel: input.estimatedPriceLabel.trim().slice(0, 100),
      quantityEstimate: Math.min(1000, Math.max(1, Math.round(input.quantityEstimate))),
      projectTitle: input.projectTitle.trim().slice(0, 160),
      projectBrief: input.projectBrief.trim().slice(0, 3000),
      deadline: input.deadline.trim().slice(0, 30),
      status: 'menunggu_konfirmasi',
      finalPrice: null,
      adminNote: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (input.attachmentName) {
      payload.attachmentName = input.attachmentName.trim().slice(0, 200);
    }
    if (input.attachmentDriveFileId) {
      payload.attachmentDriveFileId = input.attachmentDriveFileId.trim().slice(0, 200);
    }
    if (input.attachmentUrl) {
      payload.attachmentUrl = sanitizeExternalUrl(input.attachmentUrl).slice(0, 500);
    }

    await setDoc(doc(db, 'orders', orderId), payload);
    return orderId;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeCustomerOrders(
  customerUid: string,
  onData: (orders: OrderItem[]) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  const q = query(collection(db, 'orders'), where('customerUid', '==', customerUid));
  return onSnapshot(
    q,
    (snap) => {
      const orders = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<OrderItem, 'id'>) }))
        .sort((a, b) => {
          const aMs = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
          const bMs = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      onData(orders);
    },
    (error) => {
      onError(error);
      try {
        handleFirestoreError(error, OperationType.LIST, `orders?customerUid=${customerUid}`);
      } catch {
        // Surfaced via callback
      }
    }
  );
}

export async function cancelPendingOrderByCustomer(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: 'dibatalkan',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// Contact Messages (Public Submit + Admin Triage)
// -----------------------------------------------------------------------------

export async function submitContactMessage(input: {
  name: string;
  email: string;
  whatsapp?: string;
  subject: string;
  message: string;
}): Promise<string> {
  const id = randomDocId('msg');
  const path = `contact_messages/${id}`;
  try {
    const payload: Record<string, unknown> = {
      name: input.name.trim().slice(0, 120),
      email: input.email.trim().slice(0, 200),
      subject: input.subject.trim().slice(0, 160),
      message: input.message.trim().slice(0, 2000),
      status: 'baru',
      createdAt: serverTimestamp(),
    };
    if (input.whatsapp && input.whatsapp.trim()) {
      payload.whatsapp = normalizeWhatsappNumber(input.whatsapp).slice(0, 25);
    }
    await setDoc(doc(db, 'contact_messages', id), payload);
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// -----------------------------------------------------------------------------
// Admin Activity Logs (Append-only)
// -----------------------------------------------------------------------------

export async function logAdminActivity(input: {
  actorUid: string;
  actorEmail: string;
  action: string;
  entityType: ActivityLog['entityType'];
  entityId: string;
  summary: string;
}): Promise<void> {
  const id = randomDocId('log');
  const path = `activity_logs/${id}`;
  try {
    await setDoc(doc(db, 'activity_logs', id), {
      actorUid: input.actorUid,
      actorEmail: input.actorEmail.slice(0, 200),
      action: input.action.slice(0, 80),
      entityType: input.entityType,
      entityId: input.entityId.slice(0, 128),
      summary: input.summary.slice(0, 400),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// -----------------------------------------------------------------------------
// Admin Management CRUD & Paginated Queries
// -----------------------------------------------------------------------------

export interface PaginatedOrdersResult {
  orders: OrderItem[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

export async function fetchOrdersPage(options: {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  status?: OrderStatus | 'all';
}): Promise<PaginatedOrdersResult> {
  const pageSize = options.pageSize ?? 12;
  const path = 'orders';
  try {
    const constraints = [];
    if (options.status && options.status !== 'all') {
      constraints.push(where('status', '==', options.status));
    }
    constraints.push(orderBy('createdAt', 'desc'));
    if (options.cursor) {
      constraints.push(startAfter(options.cursor));
    }
    constraints.push(limit(pageSize + 1));

    const snap = await getDocs(query(collection(db, path), ...constraints));
    const hasMore = snap.docs.length > pageSize;
    const docs = hasMore ? snap.docs.slice(0, pageSize) : snap.docs;
    const orders = docs.map((d) => ({ id: d.id, ...(d.data() as Omit<OrderItem, 'id'>) }));
    const lastDoc = docs.length > 0 ? docs[docs.length - 1] : null;
    return { orders, lastDoc, hasMore };
  } catch (error) {
    // Fallback without composite index if status + createdAt index is still building
    try {
      const snap = await getDocs(collection(db, path));
      const all = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<OrderItem, 'id'>) }))
        .filter((o) => !options.status || options.status === 'all' || o.status === options.status)
        .sort((a, b) => {
          const aMs = (a.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
          const bMs = (b.createdAt as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;
          return bMs - aMs;
        });
      return { orders: all, lastDoc: null, hasMore: false };
    } catch (fallbackErr) {
      handleFirestoreError(fallbackErr || error, OperationType.LIST, path);
    }
  }
}

export async function fetchAllAdminCollections(): Promise<{
  orders: OrderItem[];
  services: ServiceItem[];
  portfolio: PortfolioItem[];
  media: MediaAsset[];
  faqs: FaqItem[];
  logs: ActivityLog[];
  messages: ContactMessage[];
  siteSettings: SiteSettings | null;
}> {
  try {
    const [
      ordersSnap,
      servicesSnap,
      portfolioSnap,
      mediaSnap,
      faqsSnap,
      logsSnap,
      messagesSnap,
      settingsSnap,
    ] = await Promise.all([
      getDocs(collection(db, 'orders')),
      getDocs(collection(db, 'services')),
      getDocs(collection(db, 'portfolio')),
      getDocs(collection(db, 'media')),
      getDocs(collection(db, 'faqs')),
      getDocs(collection(db, 'activity_logs')),
      getDocs(collection(db, 'contact_messages')),
      getDoc(doc(db, 'site_settings', 'general')),
    ]);

    const toMs = (v: unknown) =>
      (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? 0;

    return {
      orders: ordersSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<OrderItem, 'id'>) }))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
      services: servicesSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ServiceItem, 'id'>) }))
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
      portfolio: portfolioSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<PortfolioItem, 'id'>) }))
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
      media: mediaSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<MediaAsset, 'id'>) }))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
      faqs: faqsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<FaqItem, 'id'>) }))
        .sort((a, b) => (a.sortOrder ?? 99) - (b.sortOrder ?? 99)),
      logs: logsSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ActivityLog, 'id'>) }))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
      messages: messagesSnap.docs
        .map((d) => ({ id: d.id, ...(d.data() as Omit<ContactMessage, 'id'>) }))
        .sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)),
      siteSettings: settingsSnap.exists()
        ? { id: settingsSnap.id, ...(settingsSnap.data() as Omit<SiteSettings, 'id'>) }
        : null,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin_dashboard');
  }
}

export async function updateOrderByAdmin(
  orderId: string,
  updates: { status: OrderStatus; finalPrice: number | null; adminNote: string },
  actor: { uid: string; email: string; orderCode: string }
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await updateDoc(doc(db, 'orders', orderId), {
      status: updates.status,
      finalPrice:
        updates.finalPrice === null || Number.isNaN(updates.finalPrice)
          ? null
          : Math.max(0, Math.round(updates.finalPrice)),
      adminNote: updates.adminNote.trim().slice(0, 1500),
      updatedAt: serverTimestamp(),
    });
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'UPDATE_ORDER',
      entityType: 'order',
      entityId: orderId,
      summary: `Memperbarui pesanan ${actor.orderCode} menjadi status "${updates.status}"${
        updates.finalPrice !== null ? ` dengan harga final Rp${updates.finalPrice.toLocaleString('id-ID')}` : ''
      }.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteOrderByAdmin(
  orderId: string,
  actor: { uid: string; email: string; orderCode: string }
): Promise<void> {
  const path = `orders/${orderId}`;
  try {
    await deleteDoc(doc(db, 'orders', orderId));
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'DELETE_ORDER',
      entityType: 'order',
      entityId: orderId,
      summary: `Menghapus pesanan ${actor.orderCode}.`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveServiceByAdmin(
  service: Omit<ServiceItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: { uid: string; email: string }
): Promise<string> {
  const id = service.id && /^[a-zA-Z0-9_-]+$/.test(service.id) ? service.id : slugify(service.slug || service.title) || randomDocId('srv');
  const path = `services/${id}`;
  try {
    const ref = doc(db, 'services', id);
    const existing = await getDoc(ref);
    const cleanDeliverables = service.deliverables
      .map((item) => item.trim().slice(0, 180))
      .filter(Boolean)
      .slice(0, 12);
    if (cleanDeliverables.length === 0) {
      cleanDeliverables.push('Hasil akhir siap pakai sesuai kesepakatan brief');
    }
    const priceMin = Math.max(0, Math.round(service.priceMin));
    const priceMax = Math.max(priceMin, Math.round(service.priceMax));
    const priceLabel =
      service.priceLabel.trim() || formatServicePriceLabel(priceMin, priceMax, service.priceUnit);

    const payload: Record<string, unknown> = {
      slug: slugify(service.slug || service.title) || id,
      title: service.title.trim().slice(0, 140),
      category: service.category,
      shortDescription: service.shortDescription.trim().slice(0, 320),
      fullDescription: service.fullDescription.trim().slice(0, 3000),
      priceMin,
      priceMax,
      priceUnit: service.priceUnit.trim().slice(0, 40) || 'proyek',
      priceLabel: priceLabel.slice(0, 100),
      estimatedTurnaround: service.estimatedTurnaround.trim().slice(0, 60) || '2–5 hari kerja',
      deliverables: cleanDeliverables,
      accentColor: service.accentColor,
      imageUrl: sanitizeExternalUrl(service.imageUrl).slice(0, 500) || INITIAL_SERVICES[0].imageUrl,
      sortOrder: Math.max(0, Math.round(service.sortOrder ?? 1)),
      isFeatured: Boolean(service.isFeatured),
      isPublished: Boolean(service.isPublished),
      updatedAt: serverTimestamp(),
    };

    if (service.driveFileId && service.driveFileId.trim()) {
      payload.driveFileId = service.driveFileId.trim().slice(0, 200);
    }

    if (existing.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }

    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: existing.exists() ? 'UPDATE_SERVICE' : 'CREATE_SERVICE',
      entityType: 'service',
      entityId: id,
      summary: `${existing.exists() ? 'Memperbarui' : 'Menambahkan'} layanan "${payload.title}" (${payload.priceLabel}).`,
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteServiceByAdmin(
  serviceId: string,
  title: string,
  actor: { uid: string; email: string }
): Promise<void> {
  const path = `services/${serviceId}`;
  try {
    await deleteDoc(doc(db, 'services', serviceId));
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'DELETE_SERVICE',
      entityType: 'service',
      entityId: serviceId,
      summary: `Menghapus layanan "${title}".`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function savePortfolioByAdmin(
  item: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: { uid: string; email: string }
): Promise<string> {
  const id = item.id && /^[a-zA-Z0-9_-]+$/.test(item.id) ? item.id : slugify(item.title) || randomDocId('pf');
  const path = `portfolio/${id}`;
  try {
    const ref = doc(db, 'portfolio', id);
    const existing = await getDoc(ref);
    const payload: Record<string, unknown> = {
      title: item.title.trim().slice(0, 140),
      clientName: item.clientName.trim().slice(0, 100),
      category: item.category,
      year: item.year.trim().slice(0, 10) || '2026',
      summary: item.summary.trim().slice(0, 350),
      outcome: item.outcome.trim().slice(0, 1200),
      metrics: item.metrics.trim().slice(0, 120),
      imageUrl: sanitizeExternalUrl(item.imageUrl).slice(0, 500) || INITIAL_PORTFOLIO[0].imageUrl,
      isFeatured: Boolean(item.isFeatured),
      isPublished: Boolean(item.isPublished),
      sortOrder: Math.max(0, Math.round(item.sortOrder ?? 1)),
      updatedAt: serverTimestamp(),
    };
    if (item.challenge && item.challenge.trim()) {
      payload.challenge = item.challenge.trim().slice(0, 1200);
    }
    if (item.driveFileId && item.driveFileId.trim()) {
      payload.driveFileId = item.driveFileId.trim().slice(0, 200);
    }
    if (item.projectUrl && item.projectUrl.trim()) {
      payload.projectUrl = sanitizeExternalUrl(item.projectUrl).slice(0, 500);
    }

    if (existing.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }

    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: existing.exists() ? 'UPDATE_PORTFOLIO' : 'CREATE_PORTFOLIO',
      entityType: 'portfolio',
      entityId: id,
      summary: `${existing.exists() ? 'Memperbarui' : 'Menambahkan'} portofolio "${payload.title}".`,
    });

    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePortfolioByAdmin(
  portfolioId: string,
  title: string,
  actor: { uid: string; email: string }
): Promise<void> {
  const path = `portfolio/${portfolioId}`;
  try {
    await deleteDoc(doc(db, 'portfolio', portfolioId));
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'DELETE_PORTFOLIO',
      entityType: 'portfolio',
      entityId: portfolioId,
      summary: `Menghapus portofolio "${title}".`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveFaqByAdmin(
  faq: Omit<FaqItem, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  actor: { uid: string; email: string }
): Promise<string> {
  const id = faq.id && /^[a-zA-Z0-9_-]+$/.test(faq.id) ? faq.id : randomDocId('faq');
  const path = `faqs/${id}`;
  try {
    const ref = doc(db, 'faqs', id);
    const existing = await getDoc(ref);
    const payload = {
      question: faq.question.trim().slice(0, 260),
      answer: faq.answer.trim().slice(0, 2000),
      category: faq.category,
      sortOrder: Math.max(0, Math.round(faq.sortOrder ?? 1)),
      isPublished: Boolean(faq.isPublished),
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, { ...payload, createdAt: serverTimestamp() });
    }
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: existing.exists() ? 'UPDATE_FAQ' : 'CREATE_FAQ',
      entityType: 'faq',
      entityId: id,
      summary: `${existing.exists() ? 'Memperbarui' : 'Menambahkan'} FAQ: "${payload.question.slice(0, 70)}".`,
    });
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteFaqByAdmin(
  faqId: string,
  question: string,
  actor: { uid: string; email: string }
): Promise<void> {
  const path = `faqs/${faqId}`;
  try {
    await deleteDoc(doc(db, 'faqs', faqId));
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'DELETE_FAQ',
      entityType: 'faq',
      entityId: faqId,
      summary: `Menghapus FAQ "${question.slice(0, 70)}".`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveMediaMetadata(
  asset: Omit<MediaAsset, 'id' | 'createdAt'>,
  actor?: { uid: string; email: string; isAdmin: boolean }
): Promise<string> {
  const id = randomDocId('med');
  const path = `media/${id}`;
  try {
    const payload: Record<string, unknown> = {
      fileId: asset.fileId.trim().slice(0, 200),
      fileName: asset.fileName.trim().slice(0, 200),
      mimeType: asset.mimeType.trim().slice(0, 100) || 'application/octet-stream',
      sizeBytes: Math.max(0, Math.round(asset.sizeBytes || 0)),
      visibility: asset.visibility,
      usage: asset.usage,
      ownerUid: asset.ownerUid,
      createdAt: serverTimestamp(),
    };
    if (asset.altText && asset.altText.trim()) {
      payload.altText = asset.altText.trim().slice(0, 240);
    }
    await setDoc(doc(db, 'media', id), payload);

    if (actor?.isAdmin) {
      await logAdminActivity({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'REGISTER_MEDIA',
        entityType: 'media',
        entityId: id,
        summary: `Mendaftarkan media Drive "${asset.fileName}" (${asset.visibility}).`,
      });
    }
    return id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function deleteMediaByAdmin(
  mediaId: string,
  fileName: string,
  actor: { uid: string; email: string }
): Promise<void> {
  const path = `media/${mediaId}`;
  try {
    await deleteDoc(doc(db, 'media', mediaId));
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'DELETE_MEDIA',
      entityType: 'media',
      entityId: mediaId,
      summary: `Menghapus metadata media "${fileName}".`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSiteSettingsByAdmin(
  settings: SiteSettings,
  actor: { uid: string; email: string }
): Promise<void> {
  const path = 'site_settings/general';
  try {
    const ref = doc(db, 'site_settings', 'general');
    const existing = await getDoc(ref);
    const payload: Record<string, unknown> = {
      studioName: settings.studioName.trim().slice(0, 100),
      slogan: settings.slogan.trim().slice(0, 160),
      heroHeadline: settings.heroHeadline.trim().slice(0, 200),
      heroSubheadline: settings.heroSubheadline.trim().slice(0, 500),
      aboutSummary: settings.aboutSummary.trim().slice(0, 1500),
      whatsappNumber: normalizeWhatsappNumber(settings.whatsappNumber).slice(0, 30),
      email: settings.email.trim().slice(0, 200),
      address: settings.address.trim().slice(0, 240),
      operatingHours: settings.operatingHours.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    };
    if (settings.aboutMission) payload.aboutMission = settings.aboutMission.trim().slice(0, 1200);
    if (settings.instagramUrl) payload.instagramUrl = sanitizeExternalUrl(settings.instagramUrl).slice(0, 300);
    if (settings.tiktokUrl) payload.tiktokUrl = sanitizeExternalUrl(settings.tiktokUrl).slice(0, 300);
    if (settings.youtubeUrl) payload.youtubeUrl = sanitizeExternalUrl(settings.youtubeUrl).slice(0, 300);
    if (settings.linkedinUrl) payload.linkedinUrl = sanitizeExternalUrl(settings.linkedinUrl).slice(0, 300);

    if (existing.exists()) {
      await updateDoc(ref, payload);
    } else {
      await setDoc(ref, payload);
    }

    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'UPDATE_SETTINGS',
      entityType: 'site_settings',
      entityId: 'general',
      summary: 'Memperbarui konten utama, kontak, dan tautan media sosial studio.',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function updateContactMessageStatus(
  messageId: string,
  status: ContactMessage['status'],
  actor: { uid: string; email: string }
): Promise<void> {
  const path = `contact_messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'contact_messages', messageId), { status });
    await logAdminActivity({
      actorUid: actor.uid,
      actorEmail: actor.email,
      action: 'UPDATE_CONTACT',
      entityType: 'contact',
      entityId: messageId,
      summary: `Mengubah status pesan kontak menjadi "${status}".`,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// -----------------------------------------------------------------------------
// Initial Seeding Helper (Admin-triggered so Firestore has live initial catalog)
// -----------------------------------------------------------------------------

export async function seedInitialStudioData(actor: { uid: string; email: string }): Promise<{
  servicesSeeded: number;
  portfolioSeeded: number;
  faqsSeeded: number;
}> {
  try {
    const batch = writeBatch(db);
    let servicesSeeded = 0;
    let portfolioSeeded = 0;
    let faqsSeeded = 0;

    const [srvSnap, pfSnap, faqSnap, settingsSnap] = await Promise.all([
      getDocs(collection(db, 'services')),
      getDocs(collection(db, 'portfolio')),
      getDocs(collection(db, 'faqs')),
      getDoc(doc(db, 'site_settings', 'general')),
    ]);

    if (srvSnap.empty) {
      for (const srv of INITIAL_SERVICES) {
        const { id, ...rest } = srv;
        batch.set(doc(db, 'services', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        servicesSeeded += 1;
      }
    }

    if (pfSnap.empty) {
      for (const item of INITIAL_PORTFOLIO) {
        const { id, ...rest } = item;
        batch.set(doc(db, 'portfolio', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        portfolioSeeded += 1;
      }
    }

    if (faqSnap.empty) {
      for (const faq of INITIAL_FAQS) {
        const { id, ...rest } = faq;
        batch.set(doc(db, 'faqs', id), {
          ...rest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        faqsSeeded += 1;
      }
    }

    if (!settingsSnap.exists()) {
      const { id: _id, ...rest } = INITIAL_SITE_SETTINGS;
      batch.set(doc(db, 'site_settings', 'general'), {
        ...rest,
        updatedAt: serverTimestamp(),
      });
    }

    await batch.commit();

    if (servicesSeeded > 0 || portfolioSeeded > 0 || faqsSeeded > 0 || !settingsSnap.exists()) {
      await logAdminActivity({
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'SEED_CATALOG',
        entityType: 'site_settings',
        entityId: 'general',
        summary: `Menginisialisasi katalog awal ke Firestore (${servicesSeeded} layanan, ${portfolioSeeded} portofolio, ${faqsSeeded} FAQ).`,
      });
    }

    return { servicesSeeded, portfolioSeeded, faqsSeeded };
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed_initial_data');
  }
}
