package com.bytebazaar;

import java.util.Locale;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class Usernames {

  private Usernames() {}

  public static String validate(String value) {
    if (
      value == null || !value.matches("[A-Za-z][A-Za-z0-9_]{2,31}")
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Username must be 3–32 characters, start with a letter, and contain only letters, numbers or underscores"
    );
    if (
      Set.of(
        "admin",
        "administrator",
        "bytebazaar_admin",
        "bytebazaar",
        "system"
      ).contains(value.toLowerCase(Locale.ROOT))
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "That username is reserved"
    );
    return value;
  }
}
