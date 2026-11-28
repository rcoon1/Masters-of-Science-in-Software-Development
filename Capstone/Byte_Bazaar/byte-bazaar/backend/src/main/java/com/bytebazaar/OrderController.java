package com.bytebazaar;

import static com.bytebazaar.Requests.*;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class OrderController {

  private final MarketplaceService service;

  public OrderController(MarketplaceService service) {
    this.service = service;
  }

  @GetMapping("/orders")
  public List<Purchase> orders(HttpSession s) {
    return service.orders(s);
  }

  @PostMapping("/orders")
  public List<Purchase> checkout(
    @Valid @RequestBody Checkout d,
    HttpSession s
  ) {
    return service.checkout(d, s);
  }

  @PostMapping("/bookings")
  public Booking book(@Valid @RequestBody BookingInput d, HttpSession s) {
    return service.book(d, s);
  }

  @GetMapping("/bookings")
  public List<Booking> bookings(HttpSession s) {
    return service.bookings(s);
  }
}
