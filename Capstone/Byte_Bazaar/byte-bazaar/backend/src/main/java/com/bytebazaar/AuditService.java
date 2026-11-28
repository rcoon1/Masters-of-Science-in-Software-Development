package com.bytebazaar;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service
public class AuditService {

  private final JdbcTemplate jdbc;

  public AuditService(JdbcTemplate jdbc) {
    this.jdbc = jdbc;
  }

  public void record(Account actor, String action, String target) {
    jdbc.update(
      "INSERT INTO administrator_audit(actor_id,actor_email,action,target,created_at) VALUES (?,?,?,?,UTC_TIMESTAMP(6))",
      actor.id,
      actor.email,
      action,
      target
    );
  }
}
