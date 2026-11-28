package com.bytebazaar;

import static com.bytebazaar.Requests.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.Map;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class AuthController {

  private final MarketplaceService service;

  public AuthController(MarketplaceService service) {
    this.service = service;
  }

  @GetMapping("/csrf")
  public Map<String, String> csrf(CsrfToken token) {
    return service.csrf(token);
  }

  @PostMapping("/auth/register")
  public Account register(
    @Valid @RequestBody Credentials c,
    HttpServletRequest request
  ) {
    return service.register(c, request);
  }

  @PostMapping("/auth/login")
  public Account login(
    @Valid @RequestBody Credentials c,
    HttpServletRequest request
  ) {
    return service.login(c, request);
  }

  @PostMapping("/auth/logout")
  public void logout(HttpSession s) {
    service.logout(s);
  }

  @GetMapping("/auth/me")
  public Account me(HttpSession s) {
    return service.me(s);
  }
}
