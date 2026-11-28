package com.bytebazaar;

import static com.bytebazaar.Requests.*;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class ListingController {

  private final MarketplaceService service;

  public ListingController(MarketplaceService service) {
    this.service = service;
  }

  @GetMapping("/listings")
  public List<Listing> listings() {
    return service.listings();
  }

  @PostMapping("/listings")
  public Listing create(@Valid @RequestBody ListingInput d, HttpSession s) {
    return service.create(d, s);
  }

  @GetMapping("/listings/{id}/bids")
  public List<Bid> bids(@PathVariable Long id) {
    return service.bids(id);
  }

  @PostMapping("/listings/{id}/bids")
  public Bid bid(
    @PathVariable Long id,
    @Valid @RequestBody Amount d,
    HttpSession s
  ) {
    return service.bid(id, d, s);
  }
}
