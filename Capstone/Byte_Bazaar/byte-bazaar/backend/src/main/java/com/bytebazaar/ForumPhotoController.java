package com.bytebazaar;

import jakarta.servlet.http.HttpSession;
import java.io.IOException;
import java.util.List;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/topics/{topicId}")
public class ForumPhotoController {

  private final JdbcTemplate jdbc;
  private final MarketplaceService marketplace;

  public ForumPhotoController(
    JdbcTemplate jdbc,
    MarketplaceService marketplace
  ) {
    this.jdbc = jdbc;
    this.marketplace = marketplace;
  }

  private String predicate(Long replyId) {
    return replyId == null ? "reply_id IS NULL" : "reply_id=" + replyId;
  }

  private long visible(Long topicId, Long replyId, boolean lock) {
    var topics = jdbc.queryForList(
      "SELECT author_id FROM topics WHERE id=? AND hidden=FALSE" +
        (lock ? " FOR UPDATE" : ""),
      topicId
    );
    if (topics.isEmpty()) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND
    );
    if (replyId == null) return (
      (Number) topics.get(0).get("author_id")
    ).longValue();
    var replies = jdbc.queryForList(
      "SELECT author_id FROM replies WHERE id=? AND topic_id=? AND hidden=FALSE" +
        (lock ? " FOR UPDATE" : ""),
      replyId,
      topicId
    );
    if (replies.isEmpty()) throw new ResponseStatusException(
      HttpStatus.NOT_FOUND
    );
    return ((Number) replies.get(0).get("author_id")).longValue();
  }

  private void owner(Long topicId, Long replyId, HttpSession session) {
    Account actor = marketplace.requireUser(session);
    long author = visible(topicId, replyId, true);
    if (!actor.admin && actor.id != author) throw new ResponseStatusException(
      HttpStatus.FORBIDDEN
    );
  }

  @GetMapping({ "/photos", "/replies/{replyId}/photos" })
  public List<Long> list(
    @PathVariable Long topicId,
    @PathVariable(required = false) Long replyId
  ) {
    visible(topicId, replyId, false);
    return jdbc.queryForList(
      "SELECT id FROM forum_photos WHERE topic_id=? AND " +
        predicate(replyId) +
        " ORDER BY id",
      Long.class,
      topicId
    );
  }

  @GetMapping({ "/photos/{photoId}", "/replies/{replyId}/photos/{photoId}" })
  public ResponseEntity<byte[]> image(
    @PathVariable Long topicId,
    @PathVariable(required = false) Long replyId,
    @PathVariable Long photoId
  ) {
    visible(topicId, replyId, false);
    var rows = jdbc.queryForList(
      "SELECT content_type,image_data FROM forum_photos WHERE id=? AND topic_id=? AND " +
        predicate(replyId),
      photoId,
      topicId
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

  @PostMapping({ "/photos", "/replies/{replyId}/photos" })
  @Transactional(rollbackFor = Exception.class)
  public void upload(
    @PathVariable Long topicId,
    @PathVariable(required = false) Long replyId,
    @RequestParam("files") List<MultipartFile> files,
    HttpSession session
  ) throws IOException {
    owner(topicId, replyId, session);
    int count = jdbc.queryForObject(
      "SELECT COUNT(*) FROM forum_photos WHERE topic_id=? AND " +
        predicate(replyId),
      Integer.class,
      topicId
    );
    if (
      files.isEmpty() || count + files.size() > 6
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Maximum six photos per post"
    );
    for (var file : files) {
      var image = UploadedImage.read(file, false);
      jdbc.update(
        "INSERT INTO forum_photos(topic_id,reply_id,content_type,image_data) VALUES (?,?,?,?)",
        topicId,
        replyId,
        image.contentType(),
        image.bytes()
      );
    }
  }

  @DeleteMapping({ "/photos/{photoId}", "/replies/{replyId}/photos/{photoId}" })
  @Transactional
  public void remove(
    @PathVariable Long topicId,
    @PathVariable(required = false) Long replyId,
    @PathVariable Long photoId,
    HttpSession session
  ) {
    owner(topicId, replyId, session);
    if (
      jdbc.update(
        "DELETE FROM forum_photos WHERE id=? AND topic_id=? AND " +
          predicate(replyId),
        photoId,
        topicId
      ) ==
      0
    ) throw new ResponseStatusException(HttpStatus.NOT_FOUND);
  }
}
