-- Local uploads must not retain a development hostname or port.
-- Cloudinary URLs remain unchanged because they use /image/upload/, not /uploads/.
UPDATE [ProductImage]
SET [imageUrl] = SUBSTRING([imageUrl], CHARINDEX('/uploads/', [imageUrl]), LEN([imageUrl]))
WHERE [cloudinaryPublicId] IS NULL
  AND [imageUrl] LIKE '%/uploads/%';

UPDATE [TeamMember]
SET [profileImageUrl] = SUBSTRING([profileImageUrl], CHARINDEX('/uploads/', [profileImageUrl]), LEN([profileImageUrl]))
WHERE [cloudinaryPublicId] IS NULL
  AND [profileImageUrl] LIKE '%/uploads/%';
