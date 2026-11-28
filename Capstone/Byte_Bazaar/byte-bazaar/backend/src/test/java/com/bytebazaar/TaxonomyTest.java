package com.bytebazaar;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.web.server.ResponseStatusException;

class TaxonomyTest {

  @Test
  void rejectsMismatchedParentAndChild() {
    assertDoesNotThrow(() ->
      Taxonomy.validate("products", "PC Components", "Graphics Cards")
    );
    assertDoesNotThrow(() ->
      Taxonomy.validate("services", "Tech Support", "PC Repair")
    );
    assertDoesNotThrow(() ->
      Taxonomy.validate("forums", "Community Hub", "General Discussion")
    );
    var exception = assertThrows(ResponseStatusException.class, () ->
      Taxonomy.validate("products", "Storage", "Graphics Cards")
    );
    assertEquals(400, exception.getStatusCode().value());
    assertThrows(ResponseStatusException.class, () ->
      Taxonomy.validate("products", "Tech Support", "PC Repair")
    );
    assertThrows(ResponseStatusException.class, () ->
      Taxonomy.validate("forums", null, null)
    );
  }

  @Test
  void topicBoardPersistsAndHiddenRepliesDoNotAffectActivity() {
    var jdbc = new JdbcTemplate(
      new DriverManagerDataSource(
        "jdbc:h2:mem:taxonomy;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "sa",
        ""
      )
    );
    jdbc.execute(
      "CREATE TABLE accounts(id BIGINT PRIMARY KEY,username VARCHAR(32),avatar_version BIGINT DEFAULT 0)"
    );
    jdbc.execute(
      "INSERT INTO accounts(id,username) VALUES (1,'Builder'),(2,'VisibleUser')"
    );
    jdbc.execute(
      "CREATE TABLE topics(id BIGINT AUTO_INCREMENT PRIMARY KEY,category VARCHAR(255),subcategory VARCHAR(255),hidden BOOLEAN,author_id BIGINT,author VARCHAR(255),title VARCHAR(255),body VARCHAR(5000),created_at TIMESTAMP)"
    );
    jdbc.execute(
      "CREATE TABLE replies(id BIGINT AUTO_INCREMENT PRIMARY KEY,topic_id BIGINT,author_id BIGINT,author VARCHAR(255),hidden BOOLEAN,created_at TIMESTAMP)"
    );
    var repository = new MarketplaceRepository(jdbc);
    var topic = new Topic();
    topic.category = "Builds & Troubleshooting";
    topic.subcategory = "Build Planning";
    topic.authorId = 1L;
    topic.author = "Builder";
    topic.title = "First build";
    topic.body = "Help with a parts list";
    topic.createdAt = java.time.Instant.parse("2026-11-01T12:00:00Z");
    repository.insert(topic);
    assertEquals("Build Planning", repository.topic(topic.id).subcategory);
    jdbc.update(
      "INSERT INTO replies(topic_id,author_id,author,hidden,created_at) VALUES (?, 2, 'Visible reply',FALSE,'2026-11-02 12:00:00'), (?, 2, 'Hidden reply',TRUE,'2026-11-03 12:00:00')",
      topic.id,
      topic.id
    );
    var listed = repository.topics(false).get(0);
    assertEquals(1, listed.replyCount);
    assertEquals("VisibleUser", listed.lastAuthor);
    assertEquals(
      java.time.Instant.parse("2026-11-02T12:00:00Z"),
      listed.latestActivity
    );
    jdbc.update("UPDATE topics SET hidden=TRUE WHERE id=?", topic.id);
    assertTrue(repository.topics(false).isEmpty());
    assertEquals(1, repository.topics(true).size());
  }
}
