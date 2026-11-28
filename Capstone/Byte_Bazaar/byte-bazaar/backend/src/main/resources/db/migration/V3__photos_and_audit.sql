CREATE TABLE listing_photos (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 listing_id BIGINT NOT NULL,
 content_type VARCHAR(32) NOT NULL,
 image_data MEDIUMBLOB NOT NULL,
 FOREIGN KEY (listing_id) REFERENCES listings(id),
 INDEX photo_listing(listing_id)
) ENGINE=InnoDB;
CREATE TABLE administrator_audit (
 id BIGINT AUTO_INCREMENT PRIMARY KEY,
 actor_id BIGINT NOT NULL,
 actor_email VARCHAR(255) NOT NULL,
 action VARCHAR(80) NOT NULL,
 target VARCHAR(255) NOT NULL,
 created_at DATETIME(6) NOT NULL,
 INDEX audit_created(created_at)
) ENGINE=InnoDB;
