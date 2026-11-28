package com.bytebazaar;

import jakarta.servlet.http.HttpSession;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@Transactional
public class AdminService {

  private final MarketplaceRepository repository;
  private final AuditService audit;

  private final MarketplaceService marketplace;
  private final BCryptPasswordEncoder encoder;

  public AdminService(
    MarketplaceService marketplace,
    BCryptPasswordEncoder encoder,
    MarketplaceRepository repository,
    AuditService audit
  ) {
    this.marketplace = marketplace;
    this.encoder = encoder;
    this.repository = repository;
    this.audit = audit;
  }

  public Account requireAdmin(HttpSession session) {
    Account account = marketplace.requireUser(session);
    if (!account.admin) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN,
      "Administrator access required"
    );
    return account;
  }

  public void provision(String email, String password) {
    if (email.isBlank() && password.isEmpty()) return;
    if (
      !email.matches("[^\\s@]+@[^\\s@]+\\.[^\\s@]+") ||
      email.length() > 255 ||
      password.length() < 12 ||
      password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72
    ) {
      throw new IllegalStateException(
        "Set a valid admin email and a password of at least 12 characters and at most 72 UTF-8 bytes"
      );
    }
    String normalized = email.toLowerCase(Locale.ROOT);
    Account existing = repository.account(normalized);
    if (existing != null) {
      if (!existing.admin) throw new IllegalStateException(
        "Admin email belongs to a storefront account. Choose a different email."
      );
      return;
    }
    Account account = new Account();
    account.email = normalized;
    account.name = "Administrator";
    account.username = "bytebazaar_admin";
    account.password = encoder.encode(password);
    account.admin = true;
    repository.insert(account);
  }

  public record Overview(
    List<Listing> listings,
    List<Topic> topics,
    List<Reply> replies,
    Map<Long, String> winnerNames
  ) {}

  public Overview overview(HttpSession session) {
    requireAdmin(session);
    return new Overview(
      repository.listings(true),
      repository.topics(true),
      repository.replies(),
      repository.winnerNames()
    );
  }

  public Listing create(Requests.ListingInput input, HttpSession session) {
    Account actor = requireAdmin(session);
    Listing listing = marketplace.createListing(input, actor, true);
    audit.record(actor, "LISTING_CREATE", "listings/" + listing.id);
    return listing;
  }

  public void visibility(
    String type,
    Long id,
    boolean hidden,
    HttpSession session
  ) {
    Account actor = requireAdmin(session);
    if ("listings".equals(type)) {
      Listing listing = marketplace.lockListing(id);
      if (hidden && "OPEN".equals(listing.auctionStatus)) {
        throw marketplace.fail(
          "Close or cancel this auction before removing it"
        );
      }
      if (listing.hidden == hidden) return;
    } else if (!List.of("topics", "replies").contains(type)) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    if (repository.setHidden(type, id, hidden) == 0) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
    audit.record(actor, hidden ? "HIDE" : "RESTORE", type + "/" + id);
  }

  public Listing auction(Long id, String action, HttpSession session) {
    Account actor = requireAdmin(session);
    Listing listing = marketplace.lockListing(id);
    if (
      !"AUCTION".equals(listing.kind) || listing.hidden
    ) throw marketplace.fail("Auction unavailable");
    switch (action) {
      case "start" -> {
        if (
          !"DRAFT".equals(listing.auctionStatus) ||
          !listing.endsAt.isAfter(Instant.now())
        ) {
          throw marketplace.fail(
            "Only a draft with a future closing time can start"
          );
        }
        listing.auctionStatus = "OPEN";
      }
      case "close" -> {
        if (!"OPEN".equals(listing.auctionStatus)) throw marketplace.fail(
          "Only an open auction can close"
        );
        listing.winningBidId = repository.winningBidId(id);
        listing.auctionStatus = "CLOSED";
      }
      case "cancel" -> {
        if (
          !List.of("DRAFT", "OPEN").contains(listing.auctionStatus)
        ) throw marketplace.fail(
          "Only a draft or open auction can be cancelled"
        );
        listing.auctionStatus = "CANCELLED";
      }
      default -> throw marketplace.fail("Unknown auction action");
    }
    repository.updateAuction(listing);
    audit.record(
      actor,
      "AUCTION_" + action.toUpperCase(Locale.ROOT),
      "listings/" + id
    );
    return listing;
  }
}
