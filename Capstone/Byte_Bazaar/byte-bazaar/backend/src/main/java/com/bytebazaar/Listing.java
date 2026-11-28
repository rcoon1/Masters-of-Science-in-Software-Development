package com.bytebazaar;

public class Listing {

  public Long id;

  public boolean hidden;
  public String auctionStatus;
  public Long winningBidId;

  public String title;
  public String description;
  public String category;
  public String subcategory;
  public String kind;

  public java.math.BigDecimal price;

  public Long sellerId;
  public Integer stock;
  public java.time.Instant endsAt;
}
