ALTER TABLE accounts ADD COLUMN username VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NULL;
ALTER TABLE accounts ADD COLUMN avatar_version BIGINT NOT NULL DEFAULT 0;
UPDATE accounts SET username=CONCAT('member',id);
ALTER TABLE accounts MODIFY username VARCHAR(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL;
CREATE UNIQUE INDEX account_username ON accounts(username);
UPDATE topics t JOIN accounts a ON a.id=t.author_id SET t.author=a.username;
UPDATE replies r JOIN accounts a ON a.id=r.author_id SET r.author=a.username;
CREATE TABLE profile_avatars (
 account_id BIGINT PRIMARY KEY,
 content_type VARCHAR(32) NOT NULL,
 image_data MEDIUMBLOB NOT NULL,
 FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
) ENGINE=InnoDB;
CREATE TABLE forum_photos (
 id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
 topic_id BIGINT NOT NULL,
 reply_id BIGINT NULL,
 content_type VARCHAR(32) NOT NULL,
 image_data MEDIUMBLOB NOT NULL,
 FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
 FOREIGN KEY (reply_id) REFERENCES replies(id) ON DELETE CASCADE,
 INDEX forum_photo_parent(topic_id,reply_id)
) ENGINE=InnoDB;
