package com.bytebazaar;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final AdminService admin;
  private final MarketplaceService marketplace;

  public AdminController(AdminService admin, MarketplaceService marketplace) {
    this.admin = admin;
    this.marketplace = marketplace;
  }

  @PostMapping("/login")
  public Account login(
    @Valid @RequestBody Requests.Credentials credentials,
    HttpServletRequest request
  ) {
    return marketplace.adminLogin(credentials, request);
  }

  @GetMapping("/overview")
  public AdminService.Overview overview(HttpSession session) {
    return admin.overview(session);
  }

  @PostMapping("/listings")
  public Listing create(
    @Valid @RequestBody Requests.ListingInput input,
    HttpSession session
  ) {
    return admin.create(input, session);
  }

  public record Visibility(@NotNull Boolean hidden) {}

  @PostMapping("/{type:listings|topics|replies}/{id}/visibility")
  public void visibility(
    @PathVariable String type,
    @PathVariable Long id,
    @Valid @RequestBody Visibility input,
    HttpSession session
  ) {
    admin.visibility(type, id, input.hidden(), session);
  }

  @PostMapping("/auctions/{id}/{action}")
  public Listing auction(
    @PathVariable Long id,
    @PathVariable String action,
    HttpSession session
  ) {
    return admin.auction(id, action, session);
  }
}
