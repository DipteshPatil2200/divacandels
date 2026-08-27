BEGIN TRY

BEGIN TRAN;

-- CreateSchema
IF NOT EXISTS (SELECT * FROM sys.schemas WHERE name = N'dbo') EXEC sp_executesql N'CREATE SCHEMA [dbo];';

-- CreateTable
CREATE TABLE [dbo].[AdminUser] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(120) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [passwordHash] NVARCHAR(255) NOT NULL,
    [role] VARCHAR(30) NOT NULL CONSTRAINT [AdminUser_role_df] DEFAULT 'ADMIN',
    [isActive] BIT NOT NULL CONSTRAINT [AdminUser_isActive_df] DEFAULT 1,
    [mustChangePassword] BIT NOT NULL CONSTRAINT [AdminUser_mustChangePassword_df] DEFAULT 1,
    [lastLoginAt] DATETIME2,
    [failedLoginAttempts] INT NOT NULL CONSTRAINT [AdminUser_failedLoginAttempts_df] DEFAULT 0,
    [lockedUntil] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AdminUser_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [AdminUser_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [AdminUser_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[RefreshToken] (
    [id] INT NOT NULL IDENTITY(1,1),
    [tokenHash] VARCHAR(128) NOT NULL,
    [expiresAt] DATETIME2 NOT NULL,
    [revokedAt] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [RefreshToken_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [adminId] INT NOT NULL,
    CONSTRAINT [RefreshToken_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [RefreshToken_tokenHash_key] UNIQUE NONCLUSTERED ([tokenHash])
);

-- CreateTable
CREATE TABLE [dbo].[SiteSettings] (
    [id] INT NOT NULL CONSTRAINT [SiteSettings_id_df] DEFAULT 1,
    [brandName] NVARCHAR(120) NOT NULL CONSTRAINT [SiteSettings_brandName_df] DEFAULT 'DIVA Candles',
    [logoUrl] NVARCHAR(1000),
    [faviconUrl] NVARCHAR(1000),
    [phone] VARCHAR(30) NOT NULL CONSTRAINT [SiteSettings_phone_df] DEFAULT '+91 84218 69308',
    [whatsappNumber] VARCHAR(30) NOT NULL CONSTRAINT [SiteSettings_whatsappNumber_df] DEFAULT '918421869308',
    [notificationEmail] NVARCHAR(255) NOT NULL CONSTRAINT [SiteSettings_notificationEmail_df] DEFAULT 'info.divacandles@gmail.com',
    [address] NVARCHAR(500),
    [businessHours] NVARCHAR(500),
    [googleMapsUrl] NVARCHAR(1000),
    [instagramUrl] NVARCHAR(1000),
    [facebookUrl] NVARCHAR(1000),
    [youtubeUrl] NVARCHAR(1000),
    [linkedinUrl] NVARCHAR(1000),
    [amazonStoreUrl] NVARCHAR(1000),
    [currency] VARCHAR(10) NOT NULL CONSTRAINT [SiteSettings_currency_df] DEFAULT 'INR',
    [taxPercentage] DECIMAL(5,2) NOT NULL CONSTRAINT [SiteSettings_taxPercentage_df] DEFAULT 0,
    [paymentEnabled] BIT NOT NULL CONSTRAINT [SiteSettings_paymentEnabled_df] DEFAULT 0,
    [razorpayEnabled] BIT NOT NULL CONSTRAINT [SiteSettings_razorpayEnabled_df] DEFAULT 0,
    [whatsappApiEnabled] BIT NOT NULL CONSTRAINT [SiteSettings_whatsappApiEnabled_df] DEFAULT 0,
    [maintenanceMode] BIT NOT NULL CONSTRAINT [SiteSettings_maintenanceMode_df] DEFAULT 0,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [SiteSettings_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Category] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(120) NOT NULL,
    [slug] VARCHAR(160) NOT NULL,
    [description] NVARCHAR(2000),
    [imageUrl] NVARCHAR(1000),
    [displayOrder] INT NOT NULL CONSTRAINT [Category_displayOrder_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Category_isActive_df] DEFAULT 1,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Category_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Category_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Category_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[Product] (
    [id] INT NOT NULL IDENTITY(1,1),
    [sku] VARCHAR(80) NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [slug] VARCHAR(220) NOT NULL,
    [shortDescription] NVARCHAR(500),
    [description] NVARCHAR(max) NOT NULL,
    [fragrance] NVARCHAR(120),
    [waxType] NVARCHAR(120),
    [colour] NVARCHAR(80),
    [size] NVARCHAR(80),
    [weight] NVARCHAR(80),
    [burnTime] NVARCHAR(80),
    [price] DECIMAL(12,2) NOT NULL,
    [compareAtPrice] DECIMAL(12,2),
    [discountPercentage] DECIMAL(5,2) NOT NULL CONSTRAINT [Product_discountPercentage_df] DEFAULT 0,
    [stockQuantity] INT NOT NULL CONSTRAINT [Product_stockQuantity_df] DEFAULT 0,
    [lowStockThreshold] INT NOT NULL CONSTRAINT [Product_lowStockThreshold_df] DEFAULT 5,
    [stockStatus] VARCHAR(30) NOT NULL CONSTRAINT [Product_stockStatus_df] DEFAULT 'IN_STOCK',
    [categoryId] INT NOT NULL,
    [amazonUrl] NVARCHAR(1000),
    [isFeatured] BIT NOT NULL CONSTRAINT [Product_isFeatured_df] DEFAULT 0,
    [isBestSeller] BIT NOT NULL CONSTRAINT [Product_isBestSeller_df] DEFAULT 0,
    [isNewArrival] BIT NOT NULL CONSTRAINT [Product_isNewArrival_df] DEFAULT 0,
    [isCustomisable] BIT NOT NULL CONSTRAINT [Product_isCustomisable_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Product_isActive_df] DEFAULT 0,
    [seoTitle] NVARCHAR(200),
    [seoDescription] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Product_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [deletedAt] DATETIME2,
    CONSTRAINT [Product_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Product_sku_key] UNIQUE NONCLUSTERED ([sku]),
    CONSTRAINT [Product_slug_key] UNIQUE NONCLUSTERED ([slug])
);

-- CreateTable
CREATE TABLE [dbo].[ProductImage] (
    [id] INT NOT NULL IDENTITY(1,1),
    [productId] INT NOT NULL,
    [imageUrl] NVARCHAR(1000) NOT NULL,
    [cloudinaryPublicId] NVARCHAR(255),
    [altText] NVARCHAR(255) NOT NULL,
    [displayOrder] INT NOT NULL CONSTRAINT [ProductImage_displayOrder_df] DEFAULT 0,
    [isPrimary] BIT NOT NULL CONSTRAINT [ProductImage_isPrimary_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ProductImage_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ProductImage_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Banner] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(200) NOT NULL,
    [subtitle] NVARCHAR(500),
    [imageUrl] NVARCHAR(1000) NOT NULL,
    [cloudinaryPublicId] NVARCHAR(255),
    [buttonText] NVARCHAR(80),
    [buttonUrl] NVARCHAR(1000),
    [displayOrder] INT NOT NULL CONSTRAINT [Banner_displayOrder_df] DEFAULT 0,
    [isActive] BIT NOT NULL CONSTRAINT [Banner_isActive_df] DEFAULT 1,
    [startDate] DATETIME2,
    [endDate] DATETIME2,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Banner_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Banner_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Inquiry] (
    [id] INT NOT NULL IDENTITY(1,1),
    [inquiryNumber] VARCHAR(40) NOT NULL,
    [inquiryType] VARCHAR(40) NOT NULL CONSTRAINT [Inquiry_inquiryType_df] DEFAULT 'GENERAL',
    [customerName] NVARCHAR(150) NOT NULL,
    [phone] VARCHAR(30) NOT NULL,
    [email] NVARCHAR(255),
    [city] NVARCHAR(120),
    [productId] INT,
    [quantity] INT,
    [occasion] NVARCHAR(160),
    [preferredContactMethod] VARCHAR(30),
    [message] NVARCHAR(max) NOT NULL,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [Inquiry_status_df] DEFAULT 'NEW',
    [source] VARCHAR(40) NOT NULL CONSTRAINT [Inquiry_source_df] DEFAULT 'WEBSITE',
    [emailNotificationSent] BIT NOT NULL CONSTRAINT [Inquiry_emailNotificationSent_df] DEFAULT 0,
    [whatsappActionUsed] BIT NOT NULL CONSTRAINT [Inquiry_whatsappActionUsed_df] DEFAULT 0,
    [adminNotes] NVARCHAR(max),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Inquiry_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Inquiry_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Inquiry_inquiryNumber_key] UNIQUE NONCLUSTERED ([inquiryNumber])
);

-- CreateTable
CREATE TABLE [dbo].[Testimonial] (
    [id] INT NOT NULL IDENTITY(1,1),
    [customerName] NVARCHAR(150) NOT NULL,
    [designation] NVARCHAR(150),
    [rating] INT NOT NULL CONSTRAINT [Testimonial_rating_df] DEFAULT 5,
    [message] NVARCHAR(2000) NOT NULL,
    [imageUrl] NVARCHAR(1000),
    [isApproved] BIT NOT NULL CONSTRAINT [Testimonial_isApproved_df] DEFAULT 0,
    [displayOrder] INT NOT NULL CONSTRAINT [Testimonial_displayOrder_df] DEFAULT 0,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Testimonial_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [Testimonial_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[NewsletterSubscriber] (
    [id] INT NOT NULL IDENTITY(1,1),
    [email] NVARCHAR(255) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [NewsletterSubscriber_isActive_df] DEFAULT 1,
    [subscribedAt] DATETIME2 NOT NULL CONSTRAINT [NewsletterSubscriber_subscribedAt_df] DEFAULT CURRENT_TIMESTAMP,
    [unsubscribedAt] DATETIME2,
    CONSTRAINT [NewsletterSubscriber_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [NewsletterSubscriber_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[AuditLog] (
    [id] INT NOT NULL IDENTITY(1,1),
    [adminUserId] INT,
    [action] VARCHAR(80) NOT NULL,
    [entityType] VARCHAR(80) NOT NULL,
    [entityId] VARCHAR(80),
    [previousData] NVARCHAR(max),
    [newData] NVARCHAR(max),
    [ipAddress] VARCHAR(64),
    [userAgent] NVARCHAR(500),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [AuditLog_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [AuditLog_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ClickEvent] (
    [id] INT NOT NULL IDENTITY(1,1),
    [eventType] VARCHAR(40) NOT NULL,
    [productId] INT,
    [targetUrl] NVARCHAR(1000),
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [ClickEvent_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ClickEvent_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Order] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderNumber] VARCHAR(40) NOT NULL,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [Order_status_df] DEFAULT 'PENDING',
    [customerName] NVARCHAR(150) NOT NULL,
    [email] NVARCHAR(255),
    [phone] VARCHAR(30) NOT NULL,
    [subtotal] DECIMAL(12,2) NOT NULL,
    [discountAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Order_discountAmount_df] DEFAULT 0,
    [taxAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Order_taxAmount_df] DEFAULT 0,
    [shippingAmount] DECIMAL(12,2) NOT NULL CONSTRAINT [Order_shippingAmount_df] DEFAULT 0,
    [totalAmount] DECIMAL(12,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Order_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    [couponId] INT,
    CONSTRAINT [Order_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Order_orderNumber_key] UNIQUE NONCLUSTERED ([orderNumber])
);

-- CreateTable
CREATE TABLE [dbo].[OrderItem] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderId] INT NOT NULL,
    [productId] INT NOT NULL,
    [name] NVARCHAR(200) NOT NULL,
    [sku] VARCHAR(80) NOT NULL,
    [unitPrice] DECIMAL(12,2) NOT NULL,
    [quantity] INT NOT NULL,
    [lineTotal] DECIMAL(12,2) NOT NULL,
    CONSTRAINT [OrderItem_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[Payment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderId] INT NOT NULL,
    [provider] VARCHAR(30) NOT NULL,
    [providerOrderId] NVARCHAR(150),
    [providerPaymentId] NVARCHAR(150),
    [signatureVerified] BIT NOT NULL CONSTRAINT [Payment_signatureVerified_df] DEFAULT 0,
    [status] VARCHAR(30) NOT NULL CONSTRAINT [Payment_status_df] DEFAULT 'PENDING',
    [refundStatus] VARCHAR(30),
    [amount] DECIMAL(12,2) NOT NULL,
    [createdAt] DATETIME2 NOT NULL CONSTRAINT [Payment_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
    [updatedAt] DATETIME2 NOT NULL,
    CONSTRAINT [Payment_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Payment_orderId_key] UNIQUE NONCLUSTERED ([orderId])
);

-- CreateTable
CREATE TABLE [dbo].[ShippingAddress] (
    [id] INT NOT NULL IDENTITY(1,1),
    [orderId] INT NOT NULL,
    [line1] NVARCHAR(250) NOT NULL,
    [line2] NVARCHAR(250),
    [city] NVARCHAR(120) NOT NULL,
    [state] NVARCHAR(120) NOT NULL,
    [postalCode] VARCHAR(20) NOT NULL,
    [country] NVARCHAR(120) NOT NULL CONSTRAINT [ShippingAddress_country_df] DEFAULT 'India',
    CONSTRAINT [ShippingAddress_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [ShippingAddress_orderId_key] UNIQUE NONCLUSTERED ([orderId])
);

-- CreateTable
CREATE TABLE [dbo].[Coupon] (
    [id] INT NOT NULL IDENTITY(1,1),
    [code] VARCHAR(50) NOT NULL,
    [discountType] VARCHAR(30) NOT NULL,
    [discountValue] DECIMAL(12,2) NOT NULL,
    [isActive] BIT NOT NULL CONSTRAINT [Coupon_isActive_df] DEFAULT 1,
    [startsAt] DATETIME2,
    [expiresAt] DATETIME2,
    [usageLimit] INT,
    [usedCount] INT NOT NULL CONSTRAINT [Coupon_usedCount_df] DEFAULT 0,
    CONSTRAINT [Coupon_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [Coupon_code_key] UNIQUE NONCLUSTERED ([code])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [RefreshToken_adminId_expiresAt_idx] ON [dbo].[RefreshToken]([adminId], [expiresAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Category_isActive_displayOrder_idx] ON [dbo].[Category]([isActive], [displayOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_categoryId_isActive_deletedAt_idx] ON [dbo].[Product]([categoryId], [isActive], [deletedAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Product_isFeatured_isBestSeller_isNewArrival_idx] ON [dbo].[Product]([isFeatured], [isBestSeller], [isNewArrival]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ProductImage_productId_displayOrder_idx] ON [dbo].[ProductImage]([productId], [displayOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Banner_isActive_displayOrder_idx] ON [dbo].[Banner]([isActive], [displayOrder]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Inquiry_status_createdAt_idx] ON [dbo].[Inquiry]([status], [createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [Inquiry_inquiryType_idx] ON [dbo].[Inquiry]([inquiryType]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_entityType_entityId_idx] ON [dbo].[AuditLog]([entityType], [entityId]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [AuditLog_createdAt_idx] ON [dbo].[AuditLog]([createdAt]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ClickEvent_eventType_createdAt_idx] ON [dbo].[ClickEvent]([eventType], [createdAt]);

-- AddForeignKey
ALTER TABLE [dbo].[RefreshToken] ADD CONSTRAINT [RefreshToken_adminId_fkey] FOREIGN KEY ([adminId]) REFERENCES [dbo].[AdminUser]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Product] ADD CONSTRAINT [Product_categoryId_fkey] FOREIGN KEY ([categoryId]) REFERENCES [dbo].[Category]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ProductImage] ADD CONSTRAINT [ProductImage_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Inquiry] ADD CONSTRAINT [Inquiry_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[AuditLog] ADD CONSTRAINT [AuditLog_adminUserId_fkey] FOREIGN KEY ([adminUserId]) REFERENCES [dbo].[AdminUser]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Order] ADD CONSTRAINT [Order_couponId_fkey] FOREIGN KEY ([couponId]) REFERENCES [dbo].[Coupon]([id]) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[OrderItem] ADD CONSTRAINT [OrderItem_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[Payment] ADD CONSTRAINT [Payment_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE [dbo].[ShippingAddress] ADD CONSTRAINT [ShippingAddress_orderId_fkey] FOREIGN KEY ([orderId]) REFERENCES [dbo].[Order]([id]) ON DELETE CASCADE ON UPDATE CASCADE;

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
