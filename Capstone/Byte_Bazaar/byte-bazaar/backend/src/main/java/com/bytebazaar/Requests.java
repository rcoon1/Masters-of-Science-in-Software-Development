package com.bytebazaar;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

public final class Requests {

  private Requests() {}

  public record Credentials(
    @NotBlank @Email String email,
    @NotBlank @Size(min = 8, max = 72) String password,
    String name,
    String firstName,
    String lastName,
    String phone,
    String shippingAddress,
    String username
  ) {
    public Credentials(String email, String password, String name) {
      this(email, password, name, null, null, null, null, null);
    }
  }

  public record ProfileInput(@NotBlank String username) {}

  public record ListingInput(
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 255) String description,
    @NotBlank String category,
    @NotBlank String subcategory,
    @NotBlank String kind,
    @NotNull @DecimalMin("0.01") @Digits(
      integer = 10,
      fraction = 2
    ) BigDecimal price,
    @NotNull @Min(1) Integer stock,
    Instant endsAt
  ) {}

  public record Checkout(
    @NotEmpty List<@NotNull Long> listingIds,
    @NotBlank @Size(max = 100) String recipientName,
    @NotBlank @Email @Size(max = 255) String email,
    @NotBlank @Size(max = 40) String phone,
    @NotBlank @Size(max = 1000) String shippingAddress,
    @NotBlank @Size(max = 1000) String billingAddress,
    @NotBlank @Pattern(regexp = "STANDARD|EXPRESS") String shippingMethod
  ) {
    public Checkout(List<Long> listingIds) {
      this(
        listingIds,
        "Legacy",
        "legacy@example.com",
        "0000000000",
        "Legacy",
        "Legacy",
        "STANDARD"
      );
    }
  }

  public record Amount(
    @NotNull @DecimalMin("0.01") @Digits(
      integer = 10,
      fraction = 2
    ) BigDecimal amount
  ) {}

  public record BookingInput(
    @NotNull Long listingId,
    @NotNull @Future LocalDate scheduledDate,
    @NotBlank @Size(max = 255) String notes
  ) {}

  public record TopicInput(
    @NotBlank @Size(max = 255) String title,
    @NotBlank @Size(max = 5000) String body,
    @NotBlank String category,
    @NotBlank String subcategory
  ) {}

  public record ReplyInput(@NotBlank @Size(max = 255) String body) {}
}
