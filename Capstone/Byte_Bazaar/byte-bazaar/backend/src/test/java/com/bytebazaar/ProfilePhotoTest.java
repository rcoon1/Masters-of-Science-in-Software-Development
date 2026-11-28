package com.bytebazaar;

import static org.junit.jupiter.api.Assertions.*;

import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.server.ResponseStatusException;

class ProfilePhotoTest {

  private MockMultipartFile image() {
    return new MockMultipartFile(
      "files",
      "image.png",
      "image/png",
      Base64.getDecoder().decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
      )
    );
  }

  @Test
  void validatesUsernamesAndImages() throws Exception {
    assertEquals("Tech_Builder42", Usernames.validate("Tech_Builder42"));
    for (String value : List.of(
      "ab",
      "1builder",
      "a space",
      "admin",
      "ADMIN",
      "bad/name"
    ))
      assertThrows(ResponseStatusException.class, () ->
        Usernames.validate(value)
      );
    var avatar = UploadedImage.read(image(), true);
    var decoded = javax.imageio.ImageIO.read(
      new java.io.ByteArrayInputStream(avatar.bytes())
    );
    assertEquals(256, decoded.getWidth());
    assertEquals(256, decoded.getHeight());
    assertThrows(ResponseStatusException.class, () ->
      UploadedImage.read(
        new MockMultipartFile(
          "file",
          "bad.png",
          "image/png",
          "not an image".getBytes()
        ),
        false
      )
    );
  }

  @Test
  void enforcesOwnershipAndUpdatesPublicProfile() throws Exception {
    var jdbc = new JdbcTemplate(
      new DriverManagerDataSource(
        "jdbc:h2:mem:" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1",
        "sa",
        ""
      )
    );
    jdbc.execute(
      "CREATE TABLE accounts(id BIGINT PRIMARY KEY,admin BOOLEAN DEFAULT FALSE,name VARCHAR(100),email VARCHAR(255),password VARCHAR(255),firstName VARCHAR(100),lastName VARCHAR(100),phone VARCHAR(100),shippingAddress VARCHAR(1000),username VARCHAR_IGNORECASE(32) UNIQUE,avatar_version BIGINT DEFAULT 0)"
    );
    jdbc.execute(
      "INSERT INTO accounts(id,username) VALUES (1,'Builder'),(2,'OtherUser')"
    );
    jdbc.execute(
      "CREATE TABLE profile_avatars(account_id BIGINT PRIMARY KEY,content_type VARCHAR(32),image_data BLOB)"
    );
    jdbc.execute(
      "CREATE TABLE topics(id BIGINT PRIMARY KEY,author_id BIGINT,hidden BOOLEAN)"
    );
    jdbc.execute("INSERT INTO topics VALUES (1,1,FALSE),(2,2,FALSE)");
    jdbc.execute(
      "CREATE TABLE replies(id BIGINT PRIMARY KEY,topic_id BIGINT,author_id BIGINT,hidden BOOLEAN)"
    );
    jdbc.execute("INSERT INTO replies VALUES (1,1,2,FALSE)");
    jdbc.execute(
      "CREATE TABLE forum_photos(id BIGINT AUTO_INCREMENT PRIMARY KEY,topic_id BIGINT,reply_id BIGINT,content_type VARCHAR(32),image_data BLOB)"
    );
    var market = new MarketplaceService(
      new BCryptPasswordEncoder(),
      new MarketplaceRepository(jdbc)
    );
    var profile = new ProfileController(jdbc, market);
    var photos = new ForumPhotoController(jdbc, market);
    var one = FeatureChecks.session(1);
    var two = FeatureChecks.session(2);
    profile.upload(image(), one);
    assertTrue(market.me(one).avatarVersion > 0);
    assertTrue(profile.avatar(1L).getBody().length > 0);
    assertEquals(
      "NewBuilder",
      profile.update(new Requests.ProfileInput("NewBuilder"), one).username
    );
    var duplicate = assertThrows(ResponseStatusException.class, () ->
      profile.update(new Requests.ProfileInput("newbuilder"), two)
    );
    assertEquals(409, duplicate.getStatusCode().value());
    assertEquals("OtherUser", market.me(two).username);
    assertEquals(
      403,
      assertThrows(ResponseStatusException.class, () ->
        photos.upload(1L, null, List.of(image()), two)
      )
        .getStatusCode()
        .value()
    );
    photos.upload(1L, null, List.of(image()), one);
    var id = photos.list(1L, null).get(0);
    assertTrue(photos.image(1L, null, id).getBody().length > 0);
    assertEquals(
      404,
      assertThrows(ResponseStatusException.class, () ->
        photos.image(2L, null, id)
      )
        .getStatusCode()
        .value()
    );
    assertEquals(
      403,
      assertThrows(ResponseStatusException.class, () ->
        photos.remove(1L, null, id, two)
      )
        .getStatusCode()
        .value()
    );
    assertEquals(
      400,
      assertThrows(ResponseStatusException.class, () ->
        photos.upload(1L, null, Collections.nCopies(6, image()), one)
      )
        .getStatusCode()
        .value()
    );
    photos.upload(1L, 1L, List.of(image()), two);
    assertEquals(1, photos.list(1L, 1L).size());
    jdbc.update("UPDATE replies SET hidden=TRUE WHERE id=1");
    assertEquals(
      404,
      assertThrows(ResponseStatusException.class, () -> photos.list(1L, 1L))
        .getStatusCode()
        .value()
    );
    photos.remove(1L, null, id, one);
    assertTrue(photos.list(1L, null).isEmpty());
    profile.remove(one);
    assertEquals(0, market.me(one).avatarVersion);
    assertThrows(ResponseStatusException.class, () -> profile.avatar(1L));
  }
}
