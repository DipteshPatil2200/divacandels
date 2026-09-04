import { MongoClient, type Collection, type Db, type Filter, type UpdateFilter } from "mongodb";
import { env } from "./env.js";

type AnyDoc = Record<string, any>;
type Query = Record<string, any>;

const collectionNames = {
  adminUser: "admin_users", refreshToken: "refresh_tokens", siteSettings: "site_settings",
  category: "categories", product: "products", bulkPricingTier: "bulk_pricing_tiers",
  teamMember: "team_members", productImage: "product_images", banner: "banners",
  inquiry: "inquiries", fAQ: "faqs", pageContent: "page_content", testimonial: "testimonials",
  newsletterSubscriber: "newsletter_subscribers", auditLog: "audit_logs", clickEvent: "click_events",
  stockReservation: "stock_reservations", expense: "expenses", applicationLog: "application_logs", order: "orders",
  orderItem: "order_items", payment: "payments", shippingAddress: "shipping_addresses", coupon: "coupons"
};

let client: MongoClient | undefined;
let database: Db | undefined;

const stripId = (doc: AnyDoc | null) => {
  if (!doc) return doc;
  const { _id: _ignored, ...result } = doc;
  return result;
};

function scalarMatch(value: any, condition: any): boolean {
  if (condition && typeof condition === "object" && !Array.isArray(condition) && !(condition instanceof Date)) {
    if ("equals" in condition && !scalarMatch(value, condition.equals)) return false;
    if ("in" in condition && !condition.in.some((item: any) => scalarMatch(value, item))) return false;
    if ("not" in condition && scalarMatch(value, condition.not)) return false;
    if ("gt" in condition && !(value > condition.gt)) return false;
    if ("gte" in condition && !(value >= condition.gte)) return false;
    if ("lt" in condition && !(value < condition.lt)) return false;
    if ("lte" in condition && !(value <= condition.lte)) return false;
    if ("contains" in condition && !String(value ?? "").toLowerCase().includes(String(condition.contains).toLowerCase())) return false;
    return true;
  }
  if (condition === null) return value === null || value === undefined;
  return value instanceof Date && condition instanceof Date ? value.getTime() === condition.getTime() : value === condition;
}

function matches(doc: AnyDoc, where?: Query): boolean {
  if (!where) return true;
  if (where.OR && !where.OR.some((item: Query) => matches(doc, item))) return false;
  if (where.AND && !where.AND.every((item: Query) => matches(doc, item))) return false;
  return Object.entries(where).every(([key, condition]) => key === "OR" || key === "AND" || scalarMatch(doc[key], condition));
}

function sortDocs(docs: AnyDoc[], orderBy: any): AnyDoc[] {
  const entries = Array.isArray(orderBy) ? orderBy : orderBy ? [orderBy] : [];
  return docs.sort((a, b) => {
    for (const entry of entries) {
      const [key, direction] = Object.entries(entry)[0] as [string, any];
      const av = a[key] instanceof Date ? a[key].getTime() : a[key];
      const bv = b[key] instanceof Date ? b[key].getTime() : b[key];
      if (av === bv) continue;
      return (av < bv ? -1 : 1) * (direction === "desc" ? -1 : 1);
    }
    return 0;
  });
}

const relationIds: Record<string, { field: string; model: string; many?: boolean }> = {
  category: { field: "categoryId", model: "category" }, product: { field: "productId", model: "product" },
  adminUser: { field: "adminUserId", model: "adminUser" }, createdBy: { field: "createdByAdminId", model: "adminUser" },
  products: { field: "categoryId", model: "product", many: true },
  images: { field: "productId", model: "productImage", many: true },
  bulkPricingTiers: { field: "productId", model: "bulkPricingTier", many: true }
};

class Delegate {
  constructor(private readonly model: string) {}
  private async getCollection(): Promise<Collection<AnyDoc>> {
    await db.$connect();
    if (!database) throw new Error("MongoDB is not connected");
    return database.collection((collectionNames as Record<string, string>)[this.model] ?? this.model);
  }
  private uniqueFilter(where: Query): Filter<AnyDoc> {
    const [key, value] = Object.entries(where)[0] ?? [];
    return key ? { [key === "id" ? "_id" : key]: value } : {};
  }
  private async hydrate(doc: AnyDoc | null, options: Query = {}): Promise<any> {
    if (!doc) return null;
    let result = stripId(doc)!;
    if (options.select) result = Object.fromEntries(Object.keys(options.select).filter((key) => options.select[key]).map((key) => [key, result[key]]));
    if (options.include) {
      for (const [name, config] of Object.entries(options.include)) {
        const relation = relationIds[name];
        if (!relation) continue;
        const related = delegates[relation.model as keyof Delegates];
        const relationWhere = relation.many ? { [relation.field]: result.id, ...(config as any)?.where } : { id: result[relation.field], ...(config as any)?.where };
        const value = relation.many
          ? await related.findMany({ where: relationWhere, include: (config as any)?.include, orderBy: (config as any)?.orderBy })
          : await related.findFirst({ where: relationWhere, select: (config as any)?.select, include: (config as any)?.include });
        result[name] = value;
      }
    }
    return result;
  }
  async findUnique(options: Query) { const collection = await this.getCollection(); return this.hydrate(await collection.findOne(this.uniqueFilter(options.where)), options); }
  async findUniqueOrThrow(options: Query) { const value = await this.findUnique(options); if (!value) throw new Error(`${this.model} not found`); return value; }
  async findFirst(options: Query = {}) {
    const collection = await this.getCollection(); const docs = await collection.find({}).toArray();
    const found = sortDocs(docs.filter((doc) => matches(doc, options.where)), options.orderBy)[0];
    return this.hydrate(found ?? null, options);
  }
  async findFirstOrThrow(options: Query = {}) { const value = await this.findFirst(options); if (!value) throw new Error(`${this.model} not found`); return value; }
  async findMany(options: Query = {}) {
    const collection = await this.getCollection(); let docs = (await collection.find({}).toArray()).filter((doc) => matches(doc, options.where));
    sortDocs(docs, options.orderBy);
    if (options.skip) docs = docs.slice(options.skip);
    if (options.take != null) docs = docs.slice(0, options.take);
    return Promise.all(docs.map((doc) => this.hydrate(doc, options)));
  }
  async count(options: Query = {}) { const collection = await this.getCollection(); return (await collection.find({}).toArray()).filter((doc) => matches(doc, options.where)).length; }
  async create(options: Query) {
    const data = { ...options.data };
    const id = data.id ?? await nextId(this.model);
    const now = new Date();
    const doc = { ...data, id, _id: id, createdAt: data.createdAt ?? now, updatedAt: data.updatedAt ?? now };
    const collection = await this.getCollection(); await collection.insertOne(doc);
    return this.hydrate(doc, options);
  }
  async update(options: Query) {
    const collection = await this.getCollection(); const existing = await collection.findOne(this.uniqueFilter(options.where));
    if (!existing) throw new Error(`${this.model} not found`);
    const data = applyUpdate(existing, options.data);
    data.updatedAt = new Date();
    await collection.replaceOne({ _id: existing._id }, data);
    return this.hydrate(data, options);
  }
  async updateMany(options: Query) {
    const collection = await this.getCollection(); const docs = (await collection.find({}).toArray()).filter((doc) => matches(doc, options.where));
    for (const doc of docs) await collection.replaceOne({ _id: doc._id }, { ...applyUpdate(doc, options.data), updatedAt: new Date() });
    return { count: docs.length };
  }
  async delete(options: Query) {
    const collection = await this.getCollection(); const existing = await collection.findOne(this.uniqueFilter(options.where));
    if (!existing) throw new Error(`${this.model} not found`);
    await collection.deleteOne({ _id: existing._id });
    return stripId(existing);
  }
  async deleteMany(options: Query = {}) {
    const collection = await this.getCollection(); const docs = (await collection.find({}).toArray()).filter((doc) => matches(doc, options.where));
    if (docs.length) await collection.deleteMany({ _id: { $in: docs.map((doc) => doc._id) } });
    return { count: docs.length };
  }
  async upsert(options: Query) {
    const collection = await this.getCollection(); const existing = await collection.findOne(this.uniqueFilter(options.where));
    return existing ? this.update({ where: options.where, data: options.update, include: options.include, select: options.select }) : this.create({ data: { ...options.create, ...options.where }, include: options.include, select: options.select });
  }
  async aggregate(options: Query) {
    const collection = await this.getCollection(); const docs = (await collection.find({}).toArray()).filter((doc) => matches(doc, options.where));
    const amounts = docs.map((doc) => Number(doc.amount ?? 0));
    return { _sum: { amount: amounts.reduce((sum, amount) => sum + amount, 0) || null }, _count: docs.length };
  }
  async groupBy(options: Query) {
    const collection = await this.getCollection(); const docs = (await collection.find({}).toArray()).filter((doc) => matches(doc, options.where));
    const field = options.by[0];
    const groups = new Map<any, AnyDoc>();
    for (const doc of docs) {
      const key = doc[field];
      const group = groups.get(key) ?? { [field]: key, _sum: { amount: 0 }, _count: 0 };
      group._sum.amount += Number(doc.amount ?? 0); group._count += 1; groups.set(key, group);
    }
    return [...groups.values()].sort((a, b) => (b._sum.amount ?? 0) - (a._sum.amount ?? 0));
  }
}

function applyUpdate(existing: AnyDoc, updates: Query): AnyDoc {
  const result = { ...existing };
  for (const [key, value] of Object.entries(updates)) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      if ("increment" in value) result[key] = Number(result[key] ?? 0) + Number(value.increment);
      else if ("decrement" in value) result[key] = Number(result[key] ?? 0) - Number(value.decrement);
      else result[key] = value;
    } else result[key] = value;
  }
  return result;
}

type Delegates = { [K in keyof typeof collectionNames]: Delegate };
const delegates = Object.fromEntries(Object.keys(collectionNames).map((name) => [name, new Delegate(name)])) as Delegates;
async function transaction(operation: Promise<any>[]): Promise<any[]>;
async function transaction<T>(operation: (transaction: typeof db) => Promise<T>): Promise<T>;
async function transaction<T>(operation: Promise<T>[] | ((transaction: typeof db) => Promise<T>)) {
  return Array.isArray(operation) ? Promise.all(operation) : operation(db);
}
export const db = Object.assign(delegates, {
  async $connect() { if (!client) { client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: env.MONGO_SERVER_SELECTION_TIMEOUT_MS }); await client.connect(); database = client.db(env.MONGODB_DB_NAME); await database.command({ ping: 1 }); } },
  async $disconnect() { if (client) await client.close(); client = undefined; database = undefined; },
  $transaction: transaction,
  async $queryRaw<T = AnyDoc[]>(strings: TemplateStringsArray, ...values: any[]): Promise<T> {
    const query = strings.join("?").toLowerCase();
    if (query.includes("recordcount")) {
      const from = values[0] as Date; const to = values[1] as Date;
      const rows = await delegates.expense.findMany({ where: { expenseDate: { gte: from, lt: to } } }) as AnyDoc[];
      const groups = new Map<string, AnyDoc>();
      for (const row of rows) {
        const month = new Date(row.expenseDate).getMonth() + 1;
        const key = `${row.category}:${month}`;
        const item = groups.get(key) ?? { category: row.category, month, amount: 0, recordCount: 0 };
        item.amount += Number(row.amount ?? 0); item.recordCount += 1; groups.set(key, item);
      }
      return [...groups.values()] as T;
    }
    if (query.includes("datepart(month") || query.includes("coalesce(sum")) {
      const from = values[0] as Date; const to = values[1] as Date;
      const rows = (await delegates.expense.findMany({ where: { expenseDate: { gte: from, lt: to } } })) as AnyDoc[];
      if (query.includes("datepart(month")) {
        const grouped = new Map<number, AnyDoc>();
        for (const row of rows) { const month = new Date(row.expenseDate).getMonth(); const item = grouped.get(month) ?? { month, total: 0, gst: 0, paid: 0, unpaid: 0, partial: 0 }; item.total += Number(row.amount ?? 0); item.gst += Number(row.gstAmount ?? 0); item[row.paymentStatus.toLowerCase()] += Number(row.amount ?? 0); grouped.set(month, item); }
        return [...grouped.values()] as T;
      }
      const summary = rows.reduce((a, row) => { const amount = Number(row.amount ?? 0); a.total += amount; a.totalGst += Number(row.gstAmount ?? 0); a[row.paymentStatus.toLowerCase()] += amount; a.count += 1; a.highest = Math.max(a.highest, amount); return a; }, { total: 0, paid: 0, unpaid: 0, partial: 0, totalGst: 0, count: 0, highest: 0 } as AnyDoc);
      summary.average = summary.count ? summary.total / summary.count : 0;
      return [summary] as T;
    }
    if (query.includes("group by [category]")) {
      const from = values[0] as Date; const to = values[1] as Date;
      const rows = await delegates.expense.findMany({ where: { expenseDate: { gte: from, lt: to } } }) as AnyDoc[];
      const groups = new Map<string, number>(); for (const row of rows) groups.set(row.category, (groups.get(row.category) ?? 0) + Number(row.amount ?? 0));
      return [...groups].map(([category, total]) => ({ category, total })) as T;
    }
    return [] as T;
  }
});

async function nextId(model: string): Promise<number> {
  if (!database) throw new Error("MongoDB is not connected");
  const result = await database.collection<AnyDoc>("counters").findOneAndUpdate({ _id: model } as any, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" });
  return Number(result?.value ?? 1);
}

export async function connectDatabase(): Promise<void> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= env.MONGO_CONNECT_RETRIES; attempt += 1) {
    try { await db.$connect(); return; } catch (error) { lastError = error; if (attempt < env.MONGO_CONNECT_RETRIES) await new Promise((resolve) => setTimeout(resolve, Math.min(1000 * 2 ** (attempt - 1), 10000))); }
  }
  throw lastError;
}

export async function databaseHealth() {
  const startedAt = Date.now();
  await db.$connect();
  if (!database) throw new Error("MongoDB is not connected");
  const stats = await database.stats();
  return { status: "up", latencyMs: Date.now() - startedAt, database: env.MONGODB_DB_NAME, storage: { dataSize: stats.dataSize, storageSize: stats.storageSize } };
}

export async function databaseStorage() {
  await db.$connect();
  if (!database) throw new Error("MongoDB is not connected");
  const stats = await database.stats();
  return { dataSize: Number(stats.dataSize ?? 0), storageSize: Number(stats.storageSize ?? 0), collections: Number(stats.collections ?? 0), maxBytes: env.MONGODB_STORAGE_LIMIT_MB ? env.MONGODB_STORAGE_LIMIT_MB * 1024 * 1024 : null };
}

export async function ensureIndexes() {
  if (!database) return;
  await Promise.all([
    database.collection("admin_users").createIndex({ email: 1 }, { unique: true }),
    database.collection("products").createIndex({ sku: 1 }, { unique: true }),
    database.collection("products").createIndex({ slug: 1 }, { unique: true }),
    database.collection("inquiries").createIndex({ inquiryNumber: 1 }, { unique: true }),
    database.collection("newsletter_subscribers").createIndex({ email: 1 }, { unique: true }),
    database.collection("stock_reservations").createIndex({ clientToken: 1 }, { unique: true })
    ,database.collection("application_logs").createIndex({ createdAt: 1 })
  ]);
}

export async function recordApplicationLog(message: string, level = "info", metadata?: Record<string, unknown>) {
  await db.applicationLog.create({ data: { level, message: message.slice(0, 2000), metadata: metadata ?? null, createdAt: new Date() } });
}
