package com.bytebazaar;

import jakarta.servlet.http.HttpSession;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/admin/reports")
public class ReportController {

  private final JdbcTemplate jdbc;
  private final AdminService admin;
  private final AuditService audit;

  public ReportController(
    JdbcTemplate jdbc,
    AdminService admin,
    AuditService audit
  ) {
    this.jdbc = jdbc;
    this.admin = admin;
    this.audit = audit;
  }

  public record Report(
    String title,
    String from,
    String to,
    List<String> columns,
    List<List<String>> rows
  ) {}

  @GetMapping
  @Transactional
  public ResponseEntity<?> report(
    @RequestParam(defaultValue = "sales") String type,
    @RequestParam LocalDate from,
    @RequestParam LocalDate to,
    @RequestParam(defaultValue = "json") String format,
    HttpSession session
  ) {
    Account actor = admin.requireAdmin(session);
    if (
      to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 3660
    ) throw bad("Choose a date range of up to ten years");
    if (!List.of("json", "csv", "pdf").contains(format)) throw bad(
      "Unknown export format"
    );
    var start = java.sql.Timestamp.valueOf(from.atStartOfDay());
    var end = java.sql.Timestamp.valueOf(to.plusDays(1).atStartOfDay());
    String sql;
    List<String> columns;
    String title;
    switch (type) {
      case "sales" -> {
        title = "Demo orders (USD; no payments collected)";
        columns = List.of(
          "Order ID",
          "Listing ID",
          "Title",
          "Total USD",
          "Status",
          "Created UTC"
        );
        sql =
          "SELECT id,listing_id,title,total,status,created_at FROM purchases WHERE created_at>=? AND created_at<? ORDER BY created_at,id";
      }
      case "revenue" -> {
        title = "Demo order analytics (USD; not collected revenue)";
        columns = List.of(
          "Day UTC",
          "Orders",
          "Demo total USD",
          "Average order USD"
        );
        sql =
          "SELECT DATE(created_at),COUNT(*),SUM(total),ROUND(AVG(total),2) FROM purchases WHERE created_at>=? AND created_at<? GROUP BY DATE(created_at) ORDER BY DATE(created_at)";
      }
      case "auctions" -> {
        title =
          "Auction results (USD; unpaid winning bids; closing dates in range)";
        columns = List.of(
          "Listing ID",
          "Title",
          "Status",
          "Closing UTC",
          "Winning bid USD"
        );
        sql =
          "SELECT l.id,l.title,l.auction_status,l.ends_at,b.amount FROM listings l LEFT JOIN bids b ON b.id=l.winning_bid_id WHERE l.kind='AUCTION' AND l.ends_at>=? AND l.ends_at<? ORDER BY l.ends_at,l.id";
      }
      case "audit" -> {
        title = "Administrator audit trail";
        columns = List.of(
          "Event ID",
          "Admin ID",
          "Admin email",
          "Action",
          "Target",
          "Created UTC"
        );
        sql =
          "SELECT id,actor_id,actor_email,action,target,created_at FROM administrator_audit WHERE created_at>=? AND created_at<? ORDER BY created_at,id";
      }
      default -> throw bad("Unknown report type");
    }
    List<List<String>> rows = jdbc.query(
      sql,
      (rs, n) -> {
        List<String> row = new ArrayList<>();
        for (int i = 1; i <= columns.size(); i++) row.add(
          Objects.toString(rs.getObject(i), "")
        );
        return row;
      },
      start,
      end
    );
    Report report = new Report(
      title,
      from.toString(),
      to.toString(),
      columns,
      rows
    );
    audit.record(
      actor,
      "REPORT_" + format.toUpperCase(Locale.ROOT),
      type + " " + from + ".." + to
    );
    if (format.equals("json")) return ResponseEntity.ok(report);
    byte[] bytes = format.equals("pdf")
      ? ReportExport.pdf(report)
      : ReportExport.csv(report);
    return ResponseEntity.ok()
      .header(
        "Content-Disposition",
        "attachment; filename=byte-bazaar-" + type + "." + format
      )
      .header("Cache-Control", "no-store")
      .contentType(
        MediaType.parseMediaType(
          format.equals("pdf") ? "application/pdf" : "text/csv;charset=UTF-8"
        )
      )
      .body(bytes);
  }

  private ResponseStatusException bad(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
