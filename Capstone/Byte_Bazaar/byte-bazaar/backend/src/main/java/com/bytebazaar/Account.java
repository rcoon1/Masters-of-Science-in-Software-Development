package com.bytebazaar;

public class Account {

  public Long id;

  public boolean admin;

  public String name;
  public String username;
  public long avatarVersion;
  public String email;
  public String firstName;
  public String lastName;
  public String phone;
  public String shippingAddress;

  @com.fasterxml.jackson.annotation.JsonIgnore
  public String password;
}
