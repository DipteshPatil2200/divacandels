BEGIN TRY
BEGIN TRAN;

ALTER TABLE [dbo].[SiteSettings] ADD [amazonStoreEnabled] BIT NOT NULL CONSTRAINT [SiteSettings_amazonStoreEnabled_df] DEFAULT 0;

ALTER TABLE [dbo].[Product] ADD
  [isBulkAvailable] BIT NOT NULL CONSTRAINT [Product_isBulkAvailable_df] DEFAULT 0,
  [bulkMOQ] INT,
  [bulkUnit] NVARCHAR(40),
  [bulkStartingPrice] DECIMAL(12,2),
  [bulkPriceVisible] BIT NOT NULL CONSTRAINT [Product_bulkPriceVisible_df] DEFAULT 0,
  [bulkDescription] NVARCHAR(2000),
  [customPackagingAvailable] BIT NOT NULL CONSTRAINT [Product_customPackagingAvailable_df] DEFAULT 0,
  [customColourAvailable] BIT NOT NULL CONSTRAINT [Product_customColourAvailable_df] DEFAULT 0,
  [customFragranceAvailable] BIT NOT NULL CONSTRAINT [Product_customFragranceAvailable_df] DEFAULT 0,
  [customBrandingAvailable] BIT NOT NULL CONSTRAINT [Product_customBrandingAvailable_df] DEFAULT 0,
  [giftMessageAvailable] BIT NOT NULL CONSTRAINT [Product_giftMessageAvailable_df] DEFAULT 0,
  [eventBrandingAvailable] BIT NOT NULL CONSTRAINT [Product_eventBrandingAvailable_df] DEFAULT 0,
  [ribbonTagsAvailable] BIT NOT NULL CONSTRAINT [Product_ribbonTagsAvailable_df] DEFAULT 0,
  [whatsappAvailable] BIT NOT NULL CONSTRAINT [Product_whatsappAvailable_df] DEFAULT 1;

ALTER TABLE [dbo].[Inquiry] ADD
  [unit] NVARCHAR(40),
  [requiredDeliveryDate] DATETIME2,
  [customisationRequired] BIT NOT NULL CONSTRAINT [Inquiry_customisationRequired_df] DEFAULT 0,
  [customisationDetails] NVARCHAR(3000),
  [budget] DECIMAL(12,2);

CREATE TABLE [dbo].[TeamMember] (
  [id] INT NOT NULL IDENTITY(1,1), [name] NVARCHAR(150) NOT NULL, [designation] NVARCHAR(200) NOT NULL,
  [description] NVARCHAR(max) NOT NULL, [profileImageUrl] NVARCHAR(1000), [cloudinaryPublicId] NVARCHAR(255),
  [displayOrder] INT NOT NULL CONSTRAINT [TeamMember_displayOrder_df] DEFAULT 0,
  [isFounder] BIT NOT NULL CONSTRAINT [TeamMember_isFounder_df] DEFAULT 0,
  [isActive] BIT NOT NULL CONSTRAINT [TeamMember_isActive_df] DEFAULT 1,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [TeamMember_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [TeamMember_pkey] PRIMARY KEY CLUSTERED ([id])
);
CREATE NONCLUSTERED INDEX [TeamMember_isActive_displayOrder_idx] ON [dbo].[TeamMember]([isActive], [displayOrder]);

CREATE TABLE [dbo].[BulkPricingTier] (
  [id] INT NOT NULL IDENTITY(1,1), [productId] INT NOT NULL, [minimumQuantity] INT NOT NULL,
  [maximumQuantity] INT, [pricePerUnit] DECIMAL(12,2) NOT NULL,
  [isActive] BIT NOT NULL CONSTRAINT [BulkPricingTier_isActive_df] DEFAULT 1,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [BulkPricingTier_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [BulkPricingTier_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [BulkPricingTier_productId_fkey] FOREIGN KEY ([productId]) REFERENCES [dbo].[Product]([id]) ON DELETE CASCADE ON UPDATE NO ACTION
);
CREATE NONCLUSTERED INDEX [BulkPricingTier_productId_minimumQuantity_idx] ON [dbo].[BulkPricingTier]([productId], [minimumQuantity]);

COMMIT TRAN;
END TRY
BEGIN CATCH
IF @@TRANCOUNT > 0 ROLLBACK TRAN;
THROW;
END CATCH
