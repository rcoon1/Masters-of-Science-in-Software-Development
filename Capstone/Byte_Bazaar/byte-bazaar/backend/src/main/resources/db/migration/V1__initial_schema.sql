CREATE TABLE accounts (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255) NOT NULL,
email VARCHAR(255) NOT NULL UNIQUE,
password VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE listings (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
title VARCHAR(255) NOT NULL,
description VARCHAR(255) NOT NULL,
category VARCHAR(255) NOT NULL,
kind VARCHAR(255) NOT NULL,
price DECIMAL(12,2) NOT NULL,
seller_id BIGINT NOT NULL,
stock INT NOT NULL,
ends_at DATETIME(6) NULL
) ENGINE=InnoDB;
CREATE TABLE purchases (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
buyer_id BIGINT NOT NULL,
listing_id BIGINT NOT NULL,
title VARCHAR(255) NOT NULL,
total DECIMAL(12,2) NOT NULL,
status VARCHAR(255) NOT NULL,
created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE bids (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
listing_id BIGINT NOT NULL,
bidder_id BIGINT NOT NULL,
amount DECIMAL(12,2) NOT NULL,
created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE bookings (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
listing_id BIGINT NOT NULL,
buyer_id BIGINT NOT NULL,
notes VARCHAR(255) NOT NULL,
scheduled_date DATE NOT NULL,
status VARCHAR(255) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE topics (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
author_id BIGINT NOT NULL,
author VARCHAR(255) NOT NULL,
title VARCHAR(255) NOT NULL,
body VARCHAR(255) NOT NULL,
created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;
CREATE TABLE replies (
id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
topic_id BIGINT NOT NULL,
author_id BIGINT NOT NULL,
author VARCHAR(255) NOT NULL,
body VARCHAR(255) NOT NULL,
created_at DATETIME(6) NOT NULL
) ENGINE=InnoDB;
ALTER TABLE listings ADD FOREIGN KEY (seller_id) REFERENCES accounts(id);
ALTER TABLE purchases ADD FOREIGN KEY (buyer_id) REFERENCES accounts(id), ADD FOREIGN KEY (listing_id) REFERENCES listings(id);
ALTER TABLE bids ADD FOREIGN KEY (bidder_id) REFERENCES accounts(id), ADD FOREIGN KEY (listing_id) REFERENCES listings(id);
ALTER TABLE bookings ADD FOREIGN KEY (buyer_id) REFERENCES accounts(id), ADD FOREIGN KEY (listing_id) REFERENCES listings(id);
ALTER TABLE topics ADD FOREIGN KEY (author_id) REFERENCES accounts(id);
ALTER TABLE replies ADD FOREIGN KEY (author_id) REFERENCES accounts(id), ADD FOREIGN KEY (topic_id) REFERENCES topics(id);
CREATE INDEX listing_kind_category ON listings(kind,category);
CREATE INDEX bid_listing ON bids(listing_id,amount);
INSERT INTO accounts(name,email,password) VALUES ('Byte Bazaar Studio','studio@example.invalid','!disabled');
INSERT INTO listings(title,description,category,kind,price,seller_id,stock,ends_at) VALUES
('Mechanical keyboard kit','A tactile upgrade for your everyday setup. Hot-swappable switches and an aluminum case.','Hardware','SALE',129,1,8,NULL),
('Interface icon collection','240 original icons for your next product. Demo listing; asset delivery is not configured.','Digital assets','DIGITAL',29,1,50,NULL),
('Vintage workstation','A carefully restored piece of computing history. Auction bids are demonstration records.','Hardware','AUCTION',250,1,1,'2027-12-31 23:59:00'),
('React development consultation','Plan your next application with a focused, one-hour consultation. Request a date and share your goals.','Development','SERVICE',85,1,20,NULL),
('USB-C desk hub','More connections, less clutter. Seven ports in one compact aluminum hub.','Hardware','SALE',59,1,12,NULL),
('Portfolio starter kit','A clean foundation for your personal site. Demo listing; asset delivery is not configured.','Software','DIGITAL',39,1,50,NULL);
INSERT INTO topics(author_id,author,title,body,created_at) VALUES (1,'Byte Bazaar Studio','Welcome to the community','Share your builds, ask a question, or help another maker choose their next upgrade.',UTC_TIMESTAMP(6));
