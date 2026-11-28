ALTER TABLE listings ADD COLUMN subcategory VARCHAR(255) NOT NULL DEFAULT 'Other Components';
ALTER TABLE topics ADD COLUMN category VARCHAR(255) NOT NULL DEFAULT 'Community Hub';
ALTER TABLE topics ADD COLUMN subcategory VARCHAR(255) NOT NULL DEFAULT 'General Discussion';
ALTER TABLE topics MODIFY body TEXT NOT NULL;
UPDATE listings SET subcategory = CASE
 WHEN kind = 'SERVICE' THEN 'Web Development'
 WHEN category = 'Digital assets' THEN 'Digital Assets'
 WHEN category = 'Software' THEN 'Development Tools'
 WHEN LOWER(title) LIKE '%keyboard%' THEN 'Keyboards'
 WHEN LOWER(title) LIKE '%hub%' THEN 'Hubs & Accessories'
 WHEN LOWER(title) LIKE '%workstation%' THEN 'Workstations'
 ELSE 'Other Components' END;
UPDATE listings SET category = CASE
 WHEN kind = 'SERVICE' THEN 'Development & Design'
 WHEN category IN ('Software','Digital assets') THEN 'Software & Digital'
 WHEN subcategory IN ('Keyboards','Hubs & Accessories') THEN 'Peripherals'
 WHEN subcategory = 'Workstations' THEN 'Computers & Laptops'
 ELSE 'PC Components' END;
CREATE INDEX listing_taxonomy ON listings(kind,category,subcategory);
CREATE INDEX topic_taxonomy ON topics(category,subcategory);
