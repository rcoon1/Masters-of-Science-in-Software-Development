package com.bytebazaar;

import jakarta.servlet.http.HttpSession;
import java.io.ByteArrayInputStream;
import java.util.List;
import javax.imageio.ImageIO;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/listings/{listingId}/photos")
public class PhotoController {

  private final JdbcTemplate jdbc;
  private final MarketplaceService marketplace;
  private final AuditService audit;

  public PhotoController(
    JdbcTemplate jdbc,
    MarketplaceService marketplace,
    AuditService audit
  ) {
    this.jdbc = jdbc;
    this.marketplace = marketplace;
    this.audit = audit;
  }

  private void visible(Long id, HttpSession session) {
    var rows = jdbc.queryForList(
      "SELECT seller_id, hidden, auction_status FROM listings WHERE id=?",
      id
    );
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    var row = rows.get(0);
    if (
      Boolean.TRUE.equals(row.get("hidden")) ||
      (row.get("hidden") instanceof Number n && n.intValue() != 0) ||
      "DRAFT".equals(row.get("auction_status"))
    ) {
      Account actor = marketplace.requireUser(session);
      if (
        !actor.admin &&
        !actor.id.equals(((Number) row.get("seller_id")).longValue())
      ) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    }
  }

  @GetMapping
  public List<Long> photos(@PathVariable Long listingId, HttpSession session) {
    visible(listingId, session);
    return jdbc.queryForList(
      "SELECT id FROM listing_photos WHERE listing_id=? ORDER BY id",
      Long.class,
      listingId
    );
  }

  @GetMapping("/{id}")
  public ResponseEntity<byte[]> image(
    @PathVariable Long listingId,
    @PathVariable Long id,
    HttpSession session
  ) {
    visible(listingId, session);
    var rows = jdbc.queryForList(
      "SELECT content_type,image_data FROM listing_photos WHERE id=? AND listing_id=?",
      id,
      listingId
    );
    if (rows.isEmpty()) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    return ResponseEntity.ok()
      .contentType(
        MediaType.parseMediaType((String) rows.get(0).get("content_type"))
      )
      .header("X-Content-Type-Options", "nosniff")
      .header("Cache-Control", "no-store")
      .body((byte[]) rows.get(0).get("image_data"));
  }

  @PostMapping
  @Transactional(rollbackFor = Exception.class)
  public void upload(
    @PathVariable Long listingId,
    @RequestParam("files") List<MultipartFile> files,
    HttpSession session
  ) throws java.io.IOException {
    Account actor = owner(listingId, session);
    int count = jdbc.queryForObject(
      "SELECT COUNT(*) FROM listing_photos WHERE listing_id=?",
      Integer.class,
      listingId
    );
    if (files.isEmpty() || count + files.size() > 6) throw bad(
      "Maximum six pictures per listing"
    );
    for (MultipartFile file : files) {
      if (file.isEmpty() || file.getSize() > 5 * 1024 * 1024) throw bad(
        "Each picture must be between 1 byte and 5 MB"
      );
      byte[] bytes = file.getBytes();
      String type;
      try (
        var stream = ImageIO.createImageInputStream(
          new ByteArrayInputStream(bytes)
        )
      ) {
        var readers = ImageIO.getImageReaders(stream);
        if (!readers.hasNext()) throw bad("Use JPEG or PNG pictures");
        var reader = readers.next();
        try {
          reader.setInput(stream);
          String format = reader.getFormatName();
          if (
            !format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG")
          ) throw bad("Use JPEG or PNG pictures");
          if (
            (long) reader.getWidth(0) * reader.getHeight(0) > 20000000
          ) throw bad("Picture exceeds 20 megapixels");
          if (reader.read(0) == null) throw bad("Invalid picture");
          type = format.equalsIgnoreCase("PNG") ? "image/png" : "image/jpeg";
        } finally {
          reader.dispose();
        }
      }
      jdbc.update(
        "INSERT INTO listing_photos(listing_id,content_type,image_data) VALUES (?,?,?)",
        listingId,
        type,
        bytes
      );
    }
    if (actor.admin) audit.record(
      actor,
      "PHOTO_ADD",
      "listings/" + listingId + " (" + files.size() + ")"
    );
  }

  @DeleteMapping("/{id}")
  @Transactional
  public void delete(
    @PathVariable Long listingId,
    @PathVariable Long id,
    HttpSession session
  ) {
    Account actor = owner(listingId, session);
    if (
      jdbc.update(
        "DELETE FROM listing_photos WHERE id=? AND listing_id=?",
        id,
        listingId
      ) ==
      0
    ) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
    if (actor.admin) audit.record(actor, "PHOTO_DELETE", "photos/" + id);
  }

  private Account owner(Long id, HttpSession session) {
    Account actor = marketplace.requireUser(session);
    Listing listing = marketplace.lockListing(id);
    if (
      !actor.admin && !actor.id.equals(listing.sellerId)
    ) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    return actor;
  }

  private ResponseStatusException bad(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
