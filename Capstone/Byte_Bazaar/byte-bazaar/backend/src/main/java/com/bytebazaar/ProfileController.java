package com.bytebazaar;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.io.IOException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api")
public class ProfileController {

  private final JdbcTemplate jdbc;
  private final MarketplaceService marketplace;

  public ProfileController(JdbcTemplate jdbc, MarketplaceService marketplace) {
    this.jdbc = jdbc;
    this.marketplace = marketplace;
  }

  @PutMapping("/profile")
  @Transactional
  public Account update(
    @Valid @RequestBody Requests.ProfileInput input,
    HttpSession session
  ) {
    Account actor = marketplace.requireUser(session);
    String username = input.username().equals(actor.username)
      ? actor.username
      : Usernames.validate(input.username());
    try {
      jdbc.update(
        "UPDATE accounts SET username=? WHERE id=?",
        username,
        actor.id
      );
    } catch (DuplicateKeyException e) {
      throw new ResponseStatusException(
        HttpStatus.CONFLICT,
        "That username is already taken"
      );
    }
    return marketplace.me(session);
  }

  @PostMapping("/profile/avatar")
  @Transactional(rollbackFor = Exception.class)
  public Account upload(
    @RequestParam("file") MultipartFile file,
    HttpSession session
  ) throws IOException {
    Account actor = marketplace.requireUser(session);
    var image = UploadedImage.read(file, true);
    jdbc.queryForObject(
      "SELECT id FROM accounts WHERE id=? FOR UPDATE",
      Long.class,
      actor.id
    );
    jdbc.update("DELETE FROM profile_avatars WHERE account_id=?", actor.id);
    jdbc.update(
      "INSERT INTO profile_avatars(account_id,content_type,image_data) VALUES (?,?,?)",
      actor.id,
      image.contentType(),
      image.bytes()
    );
    jdbc.update(
      "UPDATE accounts SET avatar_version=? WHERE id=?",
      System.currentTimeMillis(),
      actor.id
    );
    return marketplace.me(session);
  }

  @DeleteMapping("/profile/avatar")
  @Transactional
  public Account remove(HttpSession session) {
    Account actor = marketplace.requireUser(session);
    jdbc.queryForObject(
      "SELECT id FROM accounts WHERE id=? FOR UPDATE",
      Long.class,
      actor.id
    );
    jdbc.update("DELETE FROM profile_avatars WHERE account_id=?", actor.id);
    jdbc.update("UPDATE accounts SET avatar_version=0 WHERE id=?", actor.id);
    return marketplace.me(session);
  }

  @GetMapping("/profiles/{userId}/avatar")
  public ResponseEntity<byte[]> avatar(@PathVariable Long userId) {
    var rows = jdbc.queryForList(
      "SELECT content_type,image_data FROM profile_avatars WHERE account_id=?",
      userId
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
}
