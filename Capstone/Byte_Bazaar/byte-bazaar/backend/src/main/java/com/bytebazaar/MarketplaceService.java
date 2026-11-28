package com.bytebazaar;

import static com.bytebazaar.Requests.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@org.springframework.stereotype.Service
@Transactional
public class MarketplaceService {

  private final MarketplaceRepository repository;

  private final BCryptPasswordEncoder encoder;

  public MarketplaceService(
    BCryptPasswordEncoder encoder,
    MarketplaceRepository repository
  ) {
    this.repository = repository;
    this.encoder = encoder;
  }

  ResponseStatusException fail(String m) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, m);
  }

  Account requireUser(HttpSession s) {
    Account account = s.getAttribute("uid") instanceof Long id
      ? repository.account(id)
      : null;
    if (account == null) throw new ResponseStatusException(
      HttpStatus.UNAUTHORIZED,
      "Please sign in"
    );
    return account;
  }

  Listing lockListing(Long id) {
    Listing listing = repository.lockListing(id);
    if (listing == null) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Listing not found"
    );
    return listing;
  }

  public Map<String, String> csrf(CsrfToken token) {
    return Map.of("token", token.getToken());
  }

  public Account register(Credentials c, HttpServletRequest request) {
    if (
      c.firstName() == null ||
      c.firstName().isBlank() ||
      c.firstName().length() > 50 ||
      c.lastName() == null ||
      c.lastName().isBlank() ||
      c.lastName().length() > 50 ||
      c.phone() == null ||
      !c.phone().matches("[+0-9() .-]{7,40}") ||
      c.shippingAddress() == null ||
      c.shippingAddress().isBlank() ||
      c.shippingAddress().length() > 1000
    ) throw fail(
      "Enter your first name, last name, phone number and full shipping address"
    );
    Account a = new Account();
    a.username = Usernames.validate(c.username());
    a.name = c.firstName().trim() + " " + c.lastName().trim();
    a.firstName = c.firstName().trim();
    a.lastName = c.lastName().trim();
    a.phone = c.phone().trim();
    a.shippingAddress = c.shippingAddress().trim();
    a.email = c.email().toLowerCase(Locale.ROOT);
    a.password = encoder.encode(c.password());
    try {
      repository.insert(a);
    } catch (DuplicateKeyException e) {
      throw fail("Email or username already registered");
    }
    request.getSession();
    request.changeSessionId();
    request.getSession().setAttribute("uid", a.id);
    return a;
  }

  public Account login(Credentials c, HttpServletRequest request) {
    return authenticate(c, request, false);
  }

  public Account adminLogin(Credentials c, HttpServletRequest request) {
    return authenticate(c, request, true);
  }

  private Account authenticate(
    Credentials c,
    HttpServletRequest request,
    boolean adminOnly
  ) {
    Account account = repository.account(c.email().toLowerCase(Locale.ROOT));
    if (
      account == null ||
      (adminOnly && !account.admin) ||
      !encoder.matches(c.password(), account.password)
    ) {
      throw new ResponseStatusException(
        HttpStatus.UNAUTHORIZED,
        "Incorrect email or password"
      );
    }
    request.getSession();
    request.changeSessionId();
    request.getSession().setAttribute("uid", account.id);
    return account;
  }

  public void logout(HttpSession s) {
    s.invalidate();
  }

  public Account me(HttpSession s) {
    return requireUser(s);
  }

  public List<Listing> listings() {
    return repository.listings(false);
  }

  public Listing create(ListingInput d, HttpSession s) {
    return createListing(d, requireUser(s), false);
  }

  Listing createListing(ListingInput d, Account a, boolean draft) {
    if (
      !Set.of("SALE", "AUCTION", "SERVICE", "DIGITAL").contains(d.kind())
    ) throw fail("Invalid listing type");
    if (
      d.kind().equals("AUCTION") &&
      (d.endsAt() == null || !d.endsAt().isAfter(Instant.now()))
    ) throw fail("Choose a future auction closing time");
    Taxonomy.validate(
      d.kind().equals("SERVICE") ? "services" : "products",
      d.category(),
      d.subcategory()
    );
    Listing l = new Listing();
    l.title = d.title();
    l.description = d.description();
    l.category = d.category();
    l.subcategory = d.subcategory();
    l.kind = d.kind();
    l.price = d.price();
    l.stock = d.stock();
    l.endsAt = d.kind().equals("AUCTION") ? d.endsAt() : null;
    l.auctionStatus = d.kind().equals("AUCTION")
      ? (draft ? "DRAFT" : "OPEN")
      : null;
    l.sellerId = a.id;
    return repository.insert(l);
  }

  public List<Purchase> orders(HttpSession s) {
    return repository.orders(requireUser(s).id);
  }

  public List<Purchase> checkout(Checkout d, HttpSession s) {
    Account a = requireUser(s);
    if (
      d.listingIds().size() > 50 ||
      new HashSet<>(d.listingIds()).size() != d.listingIds().size()
    ) throw fail("Use at most 50 distinct listings");
    String checkoutId = java.util.UUID.randomUUID().toString();
    boolean shippingCharged = false;
    List<Purchase> result = new ArrayList<>();
    for (Long id : d.listingIds().stream().sorted().toList()) {
      Listing l = lockListing(id);
      if (
        l.hidden ||
        !Set.of("SALE", "DIGITAL").contains(l.kind) ||
        l.stock < 1 ||
        l.sellerId.equals(a.id)
      ) throw fail("Item unavailable or belongs to you");
      l.stock--;
      repository.updateStock(l);
      Purchase p = new Purchase();
      p.buyerId = a.id;
      p.listingId = id;
      p.title = l.title;
      p.checkoutId = checkoutId;
      p.recipientName = d.recipientName();
      p.email = d.email();
      p.phone = d.phone();
      p.shippingAddress = d.shippingAddress();
      p.billingAddress = d.billingAddress();
      p.shippingMethod = d.shippingMethod();
      p.shippingCost = !shippingCharged && l.kind.equals("SALE")
        ? new BigDecimal(
            d.shippingMethod().equals("EXPRESS") ? "19.99" : "7.99"
          )
        : BigDecimal.ZERO;
      if (l.kind.equals("SALE")) shippingCharged = true;
      p.total = l.price.add(p.shippingCost);
      p.status = "DEMO_ORDER";
      p.createdAt = Instant.now();
      result.add(repository.insert(p));
    }
    return result;
  }

  public List<Bid> bids(Long id) {
    Listing listing = repository.listing(id);
    if (
      listing == null ||
      listing.hidden ||
      !Set.of("OPEN", "CLOSED").contains(
        Objects.toString(listing.auctionStatus, "")
      )
    ) {
      throw new ResponseStatusException(
        HttpStatus.NOT_FOUND,
        "Auction not found"
      );
    }
    return repository.bids(id);
  }

  public Bid bid(Long id, Amount d, HttpSession s) {
    Account a = requireUser(s);
    Listing l = lockListing(id);
    if (
      l.hidden ||
      !"OPEN".equals(l.auctionStatus) ||
      !l.kind.equals("AUCTION") ||
      l.endsAt == null ||
      !l.endsAt.isAfter(Instant.now()) ||
      a.id.equals(l.sellerId)
    ) throw fail("Bidding unavailable");
    if (d.amount().compareTo(l.price) <= 0) throw fail(
      "Bid must exceed the current price"
    );
    l.price = d.amount();
    repository.updatePrice(l);
    Bid b = new Bid();
    b.listingId = id;
    b.bidderId = a.id;
    b.amount = d.amount();
    b.createdAt = Instant.now();
    return repository.insert(b);
  }

  public Booking book(BookingInput d, HttpSession s) {
    Account a = requireUser(s);
    Listing l = lockListing(d.listingId());
    if (
      l.hidden || !l.kind.equals("SERVICE") || l.sellerId.equals(a.id)
    ) throw fail("Service unavailable");
    Booking b = new Booking();
    b.listingId = l.id;
    b.buyerId = a.id;
    b.scheduledDate = d.scheduledDate();
    b.notes = d.notes();
    b.status = "REQUESTED";
    return repository.insert(b);
  }

  public List<Booking> bookings(HttpSession s) {
    return repository.bookings(requireUser(s).id);
  }

  public List<Topic> topics() {
    return repository.topics(false);
  }

  public Topic topic(TopicInput d, HttpSession s) {
    Account a = requireUser(s);
    Taxonomy.validate("forums", d.category(), d.subcategory());
    Topic t = new Topic();
    t.category = d.category();
    t.subcategory = d.subcategory();
    t.authorId = a.id;
    t.author = a.username;
    t.authorAvatarVersion = a.avatarVersion;
    t.title = d.title();
    t.body = d.body();
    t.createdAt = Instant.now();
    return repository.insert(t);
  }

  public List<Reply> replies(Long id) {
    requireVisibleTopic(id);
    return repository.replies(id);
  }

  private void requireVisibleTopic(Long id) {
    Topic topic = repository.topic(id);
    if (topic == null || topic.hidden) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND,
      "Topic not found"
    );
  }

  public Reply reply(Long id, ReplyInput d, HttpSession s) {
    Account a = requireUser(s);
    requireVisibleTopic(id);
    Reply r = new Reply();
    r.topicId = id;
    r.authorId = a.id;
    r.author = a.username;
    r.authorAvatarVersion = a.avatarVersion;
    r.body = d.body();
    r.createdAt = Instant.now();
    return repository.insert(r);
  }
}
