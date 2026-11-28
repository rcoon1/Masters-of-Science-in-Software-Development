package com.bytebazaar;

import java.sql.Statement;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.stereotype.Repository;

@Repository
public class MarketplaceRepository {

  private final JdbcTemplate jdbc;

  public MarketplaceRepository(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  private long insert(String sql, Object... values) {
    var keys = new GeneratedKeyHolder();
    jdbc.update(
      connection -> {
        var statement = connection.prepareStatement(
          sql,
          Statement.RETURN_GENERATED_KEYS
        );
        for (int i = 0; i < values.length; i++) {
          statement.setObject(i + 1, values[i]);
        }
        return statement;
      },
      keys
    );
    var key = keys.getKey();
    if (key == null) throw new IllegalStateException(
      "Insert did not return an ID"
    );
    return key.longValue();
  }

  private static <T> T first(List<T> rows) {
    return rows.isEmpty() ? null : rows.get(0);
  }

  // The MySQL DATETIME columns store UTC wall-clock values.
  private static LocalDateTime utc(java.time.Instant instant) {
    return instant == null
      ? null
      : LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
  }

  private static final RowMapper<Account> ACCOUNT = (rs, row) -> {
    var item = new Account();
    item.id = rs.getObject("id", Long.class);
    item.admin = rs.getBoolean("admin");
    item.name = rs.getString("name");
    item.username = rs.getString("username");
    item.avatarVersion = rs.getLong("avatar_version");
    item.email = rs.getString("email");
    item.password = rs.getString("password");
    item.firstName = rs.getString("firstName");
    item.lastName = rs.getString("lastName");
    item.phone = rs.getString("phone");
    item.shippingAddress = rs.getString("shippingAddress");

    return item;
  };

  public Account insert(Account item) {
    item.id = insert(
      "INSERT INTO accounts (admin, name, email, password, username) VALUES (?, ?, ?, ?, ?)",
      item.admin,
      item.name,
      item.email,
      item.password,
      item.username
    );
    jdbc.update(
      "UPDATE accounts SET firstName=?,lastName=?,phone=?,shippingAddress=? WHERE id=?",
      item.firstName,
      item.lastName,
      item.phone,
      item.shippingAddress,
      item.id
    );
    return item;
  }

  private static final RowMapper<Listing> LISTING = (rs, row) -> {
    var item = new Listing();
    item.id = rs.getObject("id", Long.class);
    item.hidden = rs.getBoolean("hidden");
    item.auctionStatus = rs.getString("auction_status");
    item.winningBidId = rs.getObject("winning_bid_id", Long.class);
    item.title = rs.getString("title");
    item.description = rs.getString("description");
    item.category = rs.getString("category");
    item.subcategory = rs.getString("subcategory");
    item.kind = rs.getString("kind");
    item.price = rs.getBigDecimal("price");
    item.sellerId = rs.getObject("seller_id", Long.class);
    item.stock = rs.getInt("stock");
    var endsAt = rs.getObject("ends_at", LocalDateTime.class);
    item.endsAt = endsAt == null ? null : endsAt.toInstant(ZoneOffset.UTC);
    return item;
  };

  public Listing insert(Listing item) {
    item.id = insert(
      "INSERT INTO listings (subcategory, hidden, auction_status, winning_bid_id, title, description, category, kind, price, seller_id, stock, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      item.subcategory,
      item.hidden,
      item.auctionStatus,
      item.winningBidId,
      item.title,
      item.description,
      item.category,
      item.kind,
      item.price,
      item.sellerId,
      item.stock,
      utc(item.endsAt)
    );
    return item;
  }

  private static final RowMapper<Purchase> PURCHASE = (rs, row) -> {
    var item = new Purchase();
    item.id = rs.getObject("id", Long.class);
    item.buyerId = rs.getObject("buyer_id", Long.class);
    item.listingId = rs.getObject("listing_id", Long.class);
    item.title = rs.getString("title");
    item.total = rs.getBigDecimal("total");
    item.recipientName = rs.getString("recipientName");
    item.email = rs.getString("email");
    item.phone = rs.getString("phone");
    item.shippingAddress = rs.getString("shippingAddress");
    item.billingAddress = rs.getString("billingAddress");
    item.shippingMethod = rs.getString("shippingMethod");
    item.checkoutId = rs.getString("checkoutId");
    item.shippingCost = rs.getBigDecimal("shippingCost");
    item.status = rs.getString("status");
    var createdAt = rs.getObject("created_at", LocalDateTime.class);
    item.createdAt = createdAt == null
      ? null
      : createdAt.toInstant(ZoneOffset.UTC);
    return item;
  };

  public Purchase insert(Purchase item) {
    item.id = insert(
      "INSERT INTO purchases (buyer_id, listing_id, title, total, status, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      item.buyerId,
      item.listingId,
      item.title,
      item.total,
      item.status,
      utc(item.createdAt)
    );
    jdbc.update(
      "UPDATE purchases SET recipientName=?,email=?,phone=?,shippingAddress=?,billingAddress=?,shippingMethod=?,checkoutId=?,shippingCost=? WHERE id=?",
      item.recipientName,
      item.email,
      item.phone,
      item.shippingAddress,
      item.billingAddress,
      item.shippingMethod,
      item.checkoutId,
      item.shippingCost,
      item.id
    );
    return item;
  }

  private static final RowMapper<Bid> BID = (rs, row) -> {
    var item = new Bid();
    item.id = rs.getObject("id", Long.class);
    item.listingId = rs.getObject("listing_id", Long.class);
    item.bidderId = rs.getObject("bidder_id", Long.class);
    item.amount = rs.getBigDecimal("amount");
    var createdAt = rs.getObject("created_at", LocalDateTime.class);
    item.createdAt = createdAt == null
      ? null
      : createdAt.toInstant(ZoneOffset.UTC);
    return item;
  };

  public Bid insert(Bid item) {
    item.id = insert(
      "INSERT INTO bids (listing_id, bidder_id, amount, created_at) VALUES (?, ?, ?, ?)",
      item.listingId,
      item.bidderId,
      item.amount,
      utc(item.createdAt)
    );
    return item;
  }

  private static final RowMapper<Booking> BOOKING = (rs, row) -> {
    var item = new Booking();
    item.id = rs.getObject("id", Long.class);
    item.listingId = rs.getObject("listing_id", Long.class);
    item.buyerId = rs.getObject("buyer_id", Long.class);
    item.notes = rs.getString("notes");
    item.scheduledDate = rs.getObject("scheduled_date", LocalDate.class);
    item.status = rs.getString("status");
    return item;
  };

  public Booking insert(Booking item) {
    item.id = insert(
      "INSERT INTO bookings (listing_id, buyer_id, notes, scheduled_date, status) VALUES (?, ?, ?, ?, ?)",
      item.listingId,
      item.buyerId,
      item.notes,
      item.scheduledDate,
      item.status
    );
    return item;
  }

  private static final RowMapper<Topic> TOPIC = (rs, row) -> {
    var item = new Topic();
    item.id = rs.getObject("id", Long.class);
    item.hidden = rs.getBoolean("hidden");
    item.authorId = rs.getObject("author_id", Long.class);
    item.author = rs.getString("display_author");
    item.authorAvatarVersion = rs.getLong("author_avatar_version");
    item.category = rs.getString("category");
    item.subcategory = rs.getString("subcategory");
    item.title = rs.getString("title");
    item.body = rs.getString("body");
    var createdAt = rs.getObject("created_at", LocalDateTime.class);
    item.createdAt = createdAt == null
      ? null
      : createdAt.toInstant(ZoneOffset.UTC);
    return item;
  };

  public Topic insert(Topic item) {
    item.id = insert(
      "INSERT INTO topics (category, subcategory, hidden, author_id, author, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      item.category,
      item.subcategory,
      item.hidden,
      item.authorId,
      item.author,
      item.title,
      item.body,
      utc(item.createdAt)
    );
    return item;
  }

  private static final RowMapper<Reply> REPLY = (rs, row) -> {
    var item = new Reply();
    item.id = rs.getObject("id", Long.class);
    item.hidden = rs.getBoolean("hidden");
    item.topicId = rs.getObject("topic_id", Long.class);
    item.authorId = rs.getObject("author_id", Long.class);
    item.author = rs.getString("display_author");
    item.authorAvatarVersion = rs.getLong("author_avatar_version");
    item.body = rs.getString("body");
    var createdAt = rs.getObject("created_at", LocalDateTime.class);
    item.createdAt = createdAt == null
      ? null
      : createdAt.toInstant(ZoneOffset.UTC);
    return item;
  };

  public Reply insert(Reply item) {
    item.id = insert(
      "INSERT INTO replies (hidden, topic_id, author_id, author, body, created_at) VALUES (?, ?, ?, ?, ?, ?)",
      item.hidden,
      item.topicId,
      item.authorId,
      item.author,
      item.body,
      utc(item.createdAt)
    );
    return item;
  }

  public Account account(long id) {
    return first(
      jdbc.query("SELECT * FROM accounts WHERE id = ?", ACCOUNT, id)
    );
  }

  public Account account(String email) {
    return first(
      jdbc.query("SELECT * FROM accounts WHERE email = ?", ACCOUNT, email)
    );
  }

  public Listing listing(long id) {
    return first(
      jdbc.query("SELECT * FROM listings WHERE id = ?", LISTING, id)
    );
  }

  public Listing lockListing(long id) {
    return first(
      jdbc.query("SELECT * FROM listings WHERE id = ? FOR UPDATE", LISTING, id)
    );
  }

  public List<Listing> listings(boolean includeHidden) {
    return includeHidden
      ? jdbc.query("SELECT * FROM listings ORDER BY id DESC", LISTING)
      : jdbc.query(
          """
          SELECT * FROM listings WHERE hidden = FALSE
            AND (auction_status IS NULL OR auction_status NOT IN ('DRAFT', 'CANCELLED'))
          ORDER BY id DESC
          """,
          LISTING
        );
  }

  public void updateStock(Listing item) {
    jdbc.update(
      "UPDATE listings SET stock = ? WHERE id = ?",
      item.stock,
      item.id
    );
  }

  public void updatePrice(Listing item) {
    jdbc.update(
      "UPDATE listings SET price = ? WHERE id = ?",
      item.price,
      item.id
    );
  }

  public void updateAuction(Listing item) {
    jdbc.update(
      "UPDATE listings SET auction_status = ?, winning_bid_id = ? WHERE id = ?",
      item.auctionStatus,
      item.winningBidId,
      item.id
    );
  }

  public List<Purchase> orders(long buyer) {
    return jdbc.query(
      "SELECT * FROM purchases WHERE buyer_id = ? ORDER BY id DESC",
      PURCHASE,
      buyer
    );
  }

  public List<Booking> bookings(long buyer) {
    return jdbc.query(
      "SELECT * FROM bookings WHERE buyer_id = ? ORDER BY id DESC",
      BOOKING,
      buyer
    );
  }

  public List<Bid> bids(long listing) {
    return jdbc.query(
      "SELECT * FROM bids WHERE listing_id = ? ORDER BY amount DESC, id ASC",
      BID,
      listing
    );
  }

  public Long winningBidId(long listing) {
    // A locking read sees bids committed while the transaction waited for the listing lock.
    return first(
      jdbc.query(
        """
        SELECT id FROM bids WHERE listing_id = ?
        ORDER BY amount DESC, id ASC LIMIT 1 FOR UPDATE
        """,
        (rs, row) -> rs.getLong("id"),
        listing
      )
    );
  }

  public Map<Long, String> winnerNames() {
    return jdbc.query("""
    SELECT l.id, a.name FROM listings l
    JOIN bids b ON b.id = l.winning_bid_id
    JOIN accounts a ON a.id = b.bidder_id
    """, rs -> {
      Map<Long, String> names = new HashMap<>();
      while (rs.next()) names.put(rs.getLong("id"), rs.getString("name"));
      return names;
    });
  }

  private static final String TOPIC_SELECT =
    "SELECT t.*, a.username AS display_author, a.avatar_version AS author_avatar_version FROM topics t JOIN accounts a ON a.id=t.author_id";
  private static final String REPLY_SELECT =
    "SELECT r.*, a.username AS display_author, a.avatar_version AS author_avatar_version FROM replies r JOIN accounts a ON a.id=r.author_id";

  public Topic topic(long id) {
    return first(jdbc.query(TOPIC_SELECT + " WHERE t.id = ?", TOPIC, id));
  }

  public List<Topic> topics(boolean includeHidden) {
    List<Topic> topics = jdbc.query(
      TOPIC_SELECT +
        (includeHidden ? "" : " WHERE t.hidden = FALSE") +
        " ORDER BY t.id DESC",
      TOPIC
    );
    var byId = new java.util.HashMap<Long, Topic>();
    for (Topic t : topics) {
      byId.put(t.id, t);
      t.latestActivity = t.createdAt;
      t.lastAuthor = t.author;
    }
    jdbc.query(
      "SELECT r.topic_id, a.username AS author, r.created_at FROM replies r JOIN accounts a ON a.id=r.author_id WHERE r.hidden = FALSE ORDER BY r.created_at, r.id",
      rs -> {
        Topic t = byId.get(rs.getLong("topic_id"));
        if (t != null) {
          t.replyCount++;
          t.latestActivity = rs
            .getObject("created_at", LocalDateTime.class)
            .toInstant(ZoneOffset.UTC);
          t.lastAuthor = rs.getString("author");
        }
      }
    );
    return topics;
  }

  public List<Reply> replies() {
    return jdbc.query(REPLY_SELECT + " ORDER BY r.id DESC", REPLY);
  }

  public List<Reply> replies(long topic) {
    return jdbc.query(
      REPLY_SELECT + " WHERE r.topic_id = ? AND r.hidden = FALSE ORDER BY r.id",
      REPLY,
      topic
    );
  }

  public int setHidden(String type, long id, boolean hidden) {
    String sql = switch (type) {
      case "listings" -> "UPDATE listings SET hidden = ? WHERE id = ?";
      case "topics" -> "UPDATE topics SET hidden = ? WHERE id = ?";
      case "replies" -> "UPDATE replies SET hidden = ? WHERE id = ?";
      default -> throw new IllegalArgumentException(
        "Unknown visibility target"
      );
    };
    return jdbc.update(sql, hidden, id);
  }
}
