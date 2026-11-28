package com.bytebazaar;

import jakarta.servlet.http.HttpSession;
import java.lang.reflect.Proxy;
import java.nio.file.*;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Run with compiled backend and H2 on the classpath; no external services needed. */
public class FeatureChecks {

  public static Timestamp utc(int precision) {
    return Timestamp.from(java.time.Instant.now());
  }

  static void check(boolean test) {
    if (!test) throw new AssertionError();
  }

  static HttpSession session(long uid) {
    return (HttpSession) Proxy.newProxyInstance(
      FeatureChecks.class.getClassLoader(),
      new Class[] { HttpSession.class },
      (p, m, a) -> m.getName().equals("getAttribute") ? uid : null
    );
  }

  static void denied(Runnable r, int status) {
    try {
      r.run();
      throw new AssertionError("Expected denial");
    } catch (ResponseStatusException e) {
      check(e.getStatusCode().value() == status);
    }
  }

  public static void main(String[] args) throws Exception {
    var jdbc = new JdbcTemplate(
      new DriverManagerDataSource(
        "jdbc:h2:mem:features;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "sa",
        ""
      )
    );
    jdbc.execute(
      "CREATE ALIAS UTC_TIMESTAMP FOR 'com.bytebazaar.FeatureChecks.utc'"
    );
    jdbc.execute(
      "CREATE TABLE purchases(id BIGINT PRIMARY KEY,listing_id BIGINT,title VARCHAR(255),total DECIMAL(12,2),status VARCHAR(255),created_at TIMESTAMP)"
    );
    jdbc.execute(
      "CREATE TABLE listings(id BIGINT PRIMARY KEY,seller_id BIGINT,hidden BOOLEAN,auction_status VARCHAR(20),kind VARCHAR(20),title VARCHAR(255),ends_at TIMESTAMP,winning_bid_id BIGINT)"
    );
    jdbc.execute(
      "CREATE TABLE bids(id BIGINT PRIMARY KEY,amount DECIMAL(12,2))"
    );
    jdbc.execute(
      "CREATE TABLE listing_photos(id BIGINT AUTO_INCREMENT PRIMARY KEY,listing_id BIGINT,content_type VARCHAR(32),image_data BLOB)"
    );
    jdbc.execute(
      "CREATE TABLE administrator_audit(id BIGINT AUTO_INCREMENT PRIMARY KEY,actor_id BIGINT,actor_email VARCHAR(255),action VARCHAR(80),target VARCHAR(255),created_at TIMESTAMP)"
    );
    var repository = new MarketplaceRepository(jdbc) {
      @Override
      public Account account(long id) {
        var a = new Account();
        a.id = id;
        a.admin = id == 1;
        a.email = "admin@example.com";
        return a;
      }

      @Override
      public Listing lockListing(long id) {
        var l = new Listing();
        l.id = id;
        l.sellerId = 2L;
        return l;
      }
    };
    var encoder = new BCryptPasswordEncoder();
    var market = new MarketplaceService(encoder, repository);
    var audit = new AuditService(jdbc);
    var admin = new AdminService(market, encoder, repository, audit);
    var reports = new ReportController(jdbc, admin, audit);
    jdbc.update(
      "INSERT INTO purchases VALUES(1,1,'=SUM(1)',12.50,'DEMO_ORDER','2026-11-01 00:00:00'),(2,1,'Other',7.50,'DEMO_ORDER','2026-11-01 23:59:59'),(3,1,'Excluded',99,'DEMO_ORDER','2026-11-02 00:00:00')"
    );
    var from = LocalDate.of(2026, 11, 1);
    denied(() -> reports.report("sales", from, from, "json", session(2)), 403);
    denied(
      () ->
        reports.report("sales", from, from.minusDays(1), "json", session(1)),
      400
    );
    var result = (ReportController.Report) reports
      .report("revenue", from, from, "json", session(1))
      .getBody();
    check(result.rows().size() == 1);
    check(result.rows().get(0).get(1).equals("2"));
    check(result.rows().get(0).get(2).equals("20.00"));
    var sales = (ReportController.Report) reports
      .report("sales", from, from, "json", session(1))
      .getBody();
    String csv = new String(
      ReportExport.csv(sales),
      java.nio.charset.StandardCharsets.UTF_8
    );
    check(csv.contains("\"'=SUM(1)\""));
    check(!csv.contains("Excluded"));
    check(ReportExport.cell("quote,\"line\n").equals("\"quote,\"\"line\n\""));
    List<List<String>> rows = new ArrayList<>();
    for (int i = 0; i < 120; i++) rows.add(
      List.of("Row (" + i + ") \\ test", "42")
    );
    byte[] pdf = ReportExport.pdf(
      new ReportController.Report(
        "Export test",
        from.toString(),
        from.toString(),
        List.of("Title", "Value"),
        rows
      )
    );
    Files.write(Files.createTempFile("byte-bazaar-report-test-", ".pdf"), pdf);
    check(
      new String(pdf, java.nio.charset.StandardCharsets.US_ASCII).contains(
        "/Count 9"
      )
    );
    check(
      jdbc.queryForObject(
          "SELECT COUNT(*) FROM administrator_audit",
          Integer.class
        ) ==
        2
    );
    var photos = new PhotoController(jdbc, market, audit);
    jdbc.execute(
      "INSERT INTO listings(id,seller_id,hidden,auction_status) VALUES(1,2,FALSE,NULL),(2,2,FALSE,'DRAFT')"
    );
    denied(() -> photos.photos(2L, session(3)), 404);
    denied(() -> photos.delete(1L, 99L, session(3)), 403);
    byte[] image = Base64.getDecoder().decode(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="
    );
    MultipartFile file = (MultipartFile) Proxy.newProxyInstance(
      FeatureChecks.class.getClassLoader(),
      new Class[] { MultipartFile.class },
      (p, m, a) ->
        switch (m.getName()) {
          case "isEmpty" -> false;
          case "getSize" -> (long) image.length;
          case "getBytes" -> image;
          default -> null;
        }
    );
    photos.upload(1L, List.of(file), session(2));
    check(photos.photos(1L, session(3)).size() == 1);
    var id = photos.photos(1L, session(2)).get(0);
    check(Arrays.equals(image, photos.image(1L, id, session(3)).getBody()));
    photos.delete(1L, id, session(1));
    check(photos.photos(1L, session(3)).isEmpty());
    System.out.println(
      "PASS: date filtering, aggregation, report authorization, CSV escaping, PDF pagination, audit records, photo upload/read/delete and ownership"
    );
  }
}
