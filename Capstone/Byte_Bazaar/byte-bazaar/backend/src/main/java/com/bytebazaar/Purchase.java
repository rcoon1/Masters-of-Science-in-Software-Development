package com.bytebazaar;

public class Purchase {

  public Long id;
  public String recipientName;
  public String email;
  public String phone;
  public String shippingAddress;
  public String billingAddress;
  public String shippingMethod;
  public String checkoutId;
  public java.math.BigDecimal shippingCost;


  public Long buyerId;
  public Long listingId;
  public String title;

  public java.math.BigDecimal total;

  public String status;
  public java.time.Instant createdAt;
}
