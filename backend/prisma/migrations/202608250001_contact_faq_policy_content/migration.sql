CREATE TABLE [FAQ] (
  [id] INT NOT NULL IDENTITY(1,1),
  [question] NVARCHAR(500) NOT NULL,
  [answer] NVARCHAR(MAX) NOT NULL,
  [displayOrder] INT NOT NULL CONSTRAINT [FAQ_displayOrder_df] DEFAULT 0,
  [isActive] BIT NOT NULL CONSTRAINT [FAQ_isActive_df] DEFAULT 1,
  [createdAt] DATETIME2 NOT NULL CONSTRAINT [FAQ_createdAt_df] DEFAULT CURRENT_TIMESTAMP,
  [updatedAt] DATETIME2 NOT NULL,
  CONSTRAINT [FAQ_pkey] PRIMARY KEY CLUSTERED ([id])
);

CREATE INDEX [FAQ_isActive_displayOrder_idx] ON [FAQ]([isActive], [displayOrder]);

CREATE TABLE [PageContent] (
  [id] INT NOT NULL IDENTITY(1,1),
  [pageKey] VARCHAR(50) NOT NULL,
  [title] NVARCHAR(200) NOT NULL,
  [content] NVARCHAR(MAX) NOT NULL,
  [isPublished] BIT NOT NULL CONSTRAINT [PageContent_isPublished_df] DEFAULT 0,
  [updatedAt] DATETIME2 NOT NULL,
  [updatedById] INT,
  CONSTRAINT [PageContent_pkey] PRIMARY KEY CLUSTERED ([id]),
  CONSTRAINT [PageContent_pageKey_key] UNIQUE NONCLUSTERED ([pageKey]),
  CONSTRAINT [PageContent_updatedById_fkey] FOREIGN KEY ([updatedById]) REFERENCES [AdminUser]([id]) ON DELETE SET NULL ON UPDATE NO ACTION
);

CREATE INDEX [PageContent_isPublished_pageKey_idx] ON [PageContent]([isPublished], [pageKey]);

INSERT INTO [FAQ] ([question], [answer], [displayOrder], [isActive], [updatedAt]) VALUES
(N'Are DIVA Candles handcrafted?', N'DIVA Candles creates handcrafted candle collections with close attention to design and finishing. Contact our team if you need details about a particular product.', 1, 1, CURRENT_TIMESTAMP),
(N'What type of wax is used in DIVA Candles?', N'Wax details can vary by product. Please check the relevant product page or contact DIVA Candles for the current specification.', 2, 1, CURRENT_TIMESTAMP),
(N'Do you accept bulk orders?', N'Yes. Use the Bulk Orders page to share the product, quantity, required date and customisation brief with our team.', 3, 1, CURRENT_TIMESTAMP),
(N'Can candles be customised?', N'Customisation may be available for selected products and order quantities. Submit your brief so the team can confirm suitable options.', 4, 1, CURRENT_TIMESTAMP),
(N'Do you offer corporate gifting?', N'Corporate gifting inquiries are welcome. Share your quantity, occasion, packaging and branding requirements for a tailored response.', 5, 1, CURRENT_TIMESTAMP),
(N'Do you accept wedding and event orders?', N'Wedding and event requests can be submitted through the Bulk Orders or Contact Us page. Availability depends on the brief and required date.', 6, 1, CURRENT_TIMESTAMP),
(N'How can I place an order?', N'Browse the Shop and use the available WhatsApp or Amazon option shown for the selected product.', 7, 1, CURRENT_TIMESTAMP),
(N'Can I order through WhatsApp?', N'Yes. Product and inquiry pages provide a WhatsApp option with a prepared message for DIVA Candles.', 8, 1, CURRENT_TIMESTAMP),
(N'Can I purchase DIVA Candles through Amazon?', N'Amazon links appear only when configured and available for a product or the DIVA Candles store.', 9, 1, CURRENT_TIMESTAMP),
(N'How long does delivery take?', N'Delivery depends on product availability, destination, quantity and customisation. Please confirm the current estimate with the team before ordering.', 10, 1, CURRENT_TIMESTAMP),
(N'Can I select a fragrance?', N'Fragrance selection may be available for selected products and custom orders. The team will confirm current choices for your request.', 11, 1, CURRENT_TIMESTAMP),
(N'Do you offer customised packaging?', N'Custom packaging may be available for eligible bulk and gifting orders. Submit your requirements for confirmation.', 12, 1, CURRENT_TIMESTAMP),
(N'How should I care for my candle?', N'Visit the Candle Care page for general guidance and always follow the safety instructions provided with your candle.', 13, 1, CURRENT_TIMESTAMP),
(N'How can I contact DIVA Candles?', N'Use the Contact Us form, WhatsApp, or email shown on the website. Your submitted inquiry receives a reference number for follow-up.', 14, 1, CURRENT_TIMESTAMP);

INSERT INTO [PageContent] ([pageKey], [title], [content], [isPublished], [updatedAt]) VALUES
('TERMS', N'Terms & Conditions', N'## 1. Introduction
This page contains business-review content for DIVA Candles and should be approved before production use.

## 2. Products and Availability
Products and availability may change. Confirm current availability before completing an order.

## 3. Product Information
Product colours and appearance may vary slightly because of handcrafted production and screen display.

## 4. Pricing
Confirm the final price, applicable charges and taxes before purchase.

## 5. Orders
An order is subject to availability and confirmation by DIVA Candles or the relevant third-party platform.

## 6. Payment
Available payment methods and payment terms are communicated during checkout or order confirmation.

## 7. Bulk Orders
Bulk quotations depend on quantity, product, packaging, delivery location and required date.

## 8. Customised Products
Custom specifications require written confirmation before production.

## 9. Shipping
Shipping details are governed by the current Shipping Policy and the confirmed order terms.

## 10. Cancellations
Cancellation eligibility depends on order status and whether production or customisation has begun.

## 11. Returns and Refunds
Refer to the current Return & Refund Policy and obtain business confirmation for your order.

## 12. Intellectual Property
DIVA Candles branding, photography and original website content may not be reused without permission.

## 13. Website Usage
Use the website lawfully and do not attempt to disrupt or misuse its services.

## 14. Third-Party Platforms
Third-party platforms operate under their own terms, privacy practices and availability.

## 15. Amazon Purchases
Purchases completed on Amazon are also subject to the applicable Amazon listing and platform terms.

## 16. Limitation of Liability
This section requires legal review and does not create promises beyond applicable law and confirmed order terms.

## 17. Changes to Terms
The business may update this content after review. The current published version appears on this page.

## 18. Contact Information
For questions, contact info.divacandles@gmail.com or use the Contact Us page.', 1, CURRENT_TIMESTAMP),
('PRIVACY_POLICY', N'Privacy Policy', N'## Information We Collect
We may collect information you submit through forms, including name, contact details and inquiry content.

## How Information Is Used
Submitted information is used to respond to inquiries, manage requested services and operate the website.

## Customer Inquiry Information
Inquiry records include a reference number so DIVA Candles can manage follow-up.

## Cookies
The website may use essential browser technologies required for its operation. Any additional usage should be reviewed by the business.

## Third-Party Services
Links and integrations may be provided by third parties with their own privacy practices.

## Payment Providers
Where payment services are enabled, the provider handles payment information under its own terms.

## Amazon Links
Amazon links take visitors to a third-party platform governed by Amazon policies.

## Data Security
DIVA Candles uses reasonable technical and organisational safeguards; no unverified certification is claimed.

## Data Retention
Retention periods require business review and should reflect operational and legal needs.

## Customer Rights
Contact DIVA Candles to ask about personal information submitted through the website, subject to applicable requirements.

## Policy Updates
The current published version appears on this page after business review.

## Contact Details
Email info.divacandles@gmail.com for privacy questions.', 1, CURRENT_TIMESTAMP),
('SHIPPING_POLICY', N'Shipping Policy', N'## Order Processing
Processing depends on product availability, order size and any confirmed customisation.

## Shipping Locations
Available destinations must be confirmed by DIVA Candles before order completion.

## Shipping Charges
Charges depend on destination, parcel details and the confirmed order terms.

## Delivery Estimates
Delivery estimates are communicated for the specific order and are not guaranteed by this placeholder content.

## Bulk Order Delivery
Bulk delivery planning is confirmed with the quotation and production brief.

## Custom Order Delivery
Custom orders require agreed specifications and a confirmed production schedule.

## Delivery Delays
If a delay occurs, contact the team with your order or inquiry reference for assistance.

## Incorrect Address
Customers should provide complete and accurate delivery information before dispatch.

## Damaged Packages
Retain the package and contact DIVA Candles promptly with clear photographs and order information.

## Contact Information
Email info.divacandles@gmail.com or use the Contact Us page for shipping assistance.', 1, CURRENT_TIMESTAMP),
('RETURN_REFUND_POLICY', N'Return & Refund Policy', N'## Eligibility
Eligibility depends on the product, its condition, order channel and confirmed sale terms.

## Non-Returnable Products
Items that cannot be returned must be identified and confirmed by the business before publication.

## Customised Products
Customised or made-to-order products may have different eligibility because they are produced to an approved brief.

## Damaged Products
Retain the product and packaging and contact DIVA Candles with photographs and order information.

## Wrong Product
If the received product differs from the confirmed order, contact the team for review.

## Cancellation
Cancellation depends on order status and whether production or dispatch has started.

## Refund Processing
Any approved refund method and timing will be communicated for the specific case; this placeholder makes no fixed timeline promise.

## Contact Procedure
Use the Contact Us page or email info.divacandles@gmail.com with your order or inquiry reference.', 1, CURRENT_TIMESTAMP);
