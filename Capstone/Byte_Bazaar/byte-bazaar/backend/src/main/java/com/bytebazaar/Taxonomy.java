package com.bytebazaar;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

/** Shared category definitions, also imported by the React storefront. */
public final class Taxonomy {

  private static final Map<String, Map<String, List<String>>> TREE;

  static {
    try (var input = new ClassPathResource("taxonomy.json").getInputStream()) {
      TREE = new ObjectMapper().readValue(input, new TypeReference<>() {});
    } catch (IOException e) {
      throw new ExceptionInInitializerError(e);
    }
  }

  private Taxonomy() {}

  public static void validate(
    String section,
    String category,
    String subcategory
  ) {
    var children = category == null ? null : TREE.get(section).get(category);
    if (
      children == null || subcategory == null || !children.contains(subcategory)
    ) throw new ResponseStatusException(
      HttpStatus.BAD_REQUEST,
      "Choose a valid category and subcategory"
    );
  }
}
