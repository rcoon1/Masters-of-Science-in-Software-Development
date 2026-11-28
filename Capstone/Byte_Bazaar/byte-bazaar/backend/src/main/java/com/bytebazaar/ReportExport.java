package com.bytebazaar;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Dependency-free CSV and paginated PDF exports. PDF uses the built-in Helvetica font. */
public final class ReportExport {

  private ReportExport() {}

  static String cell(String value) {
    // Quoting alone does not stop spreadsheet formula execution.
    String trimmed = value.stripLeading();
    if (
      (!trimmed.isEmpty() && "=+@-".indexOf(trimmed.charAt(0)) >= 0) ||
      value.startsWith("\t") ||
      value.startsWith("\r")
    ) value = "'" + value;
    return "\"" + value.replace("\"", "\"\"") + "\"";
  }

  public static byte[] csv(ReportController.Report r) {
    StringBuilder out = new StringBuilder("\uFEFF");
    out
      .append(
        String.join(",", r.columns().stream().map(ReportExport::cell).toList())
      )
      .append("\r\n");
    for (var row : r.rows())
      out
        .append(String.join(",", row.stream().map(ReportExport::cell).toList()))
        .append("\r\n");
    return out.toString().getBytes(StandardCharsets.UTF_8);
  }

  static String literal(String text) {
    return text
      .replaceAll("[^\\x20-\\x7E]", "?")
      .replace("\\", "\\\\")
      .replace("(", "\\(")
      .replace(")", "\\)");
  }

  public static byte[] pdf(ReportController.Report r) {
    List<String> lines = new ArrayList<>();
    for (var row : r.rows()) {
      for (int i = 0; i < row.size(); i++) {
        String value =
          r.columns().get(i) + ": " + row.get(i).replaceAll("[\\r\\n]", " ");
        for (int offset = 0; offset < value.length(); offset += 105) lines.add(
          value.substring(offset, Math.min(offset + 105, value.length()))
        );
      }
      lines.add(" ");
    }
    if (lines.isEmpty()) lines.add("No records in this range.");
    int pages = (lines.size() + 43) / 44;
    List<String> objects = new ArrayList<>();
    objects.add("<< /Type /Catalog /Pages 2 0 R >>");
    StringBuilder kids = new StringBuilder();
    for (int p = 0; p < pages; p++) kids.append(4 + p * 2).append(" 0 R ");
    objects.add("<< /Type /Pages /Count " + pages + " /Kids [" + kids + "] >>");
    objects.add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    for (int p = 0; p < pages; p++) {
      int content = 5 + p * 2;
      objects.add(
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents " +
          content +
          " 0 R >>"
      );
      StringBuilder stream = new StringBuilder(
        "BT /F1 9 Tf 13 TL 35 755 Td (" +
          literal(r.title()) +
          ") Tj T* (" +
          literal(
            r.from() +
              " through " +
              r.to() +
              " UTC | Page " +
              (p + 1) +
              " of " +
              pages
          ) +
          ") Tj T* T* "
      );
      for (int n = p * 44; n < Math.min((p + 1) * 44, lines.size()); n++) stream
        .append("(")
        .append(literal(lines.get(n)))
        .append(") Tj T* ");
      stream.append("ET");
      objects.add(
        "<< /Length " +
          stream.length() +
          " >>\nstream\n" +
          stream +
          "\nendstream"
      );
    }
    ByteArrayOutputStream out = new ByteArrayOutputStream();
    write(out, "%PDF-1.4\n");
    List<Integer> offsets = new ArrayList<>();
    for (int i = 0; i < objects.size(); i++) {
      offsets.add(out.size());
      write(out, (i + 1) + " 0 obj\n" + objects.get(i) + "\nendobj\n");
    }
    int xref = out.size();
    write(out, "xref\n0 " + (objects.size() + 1) + "\n0000000000 65535 f \n");
    for (int offset : offsets)
      write(out, String.format(Locale.ROOT, "%010d 00000 n \n", offset));
    write(
      out,
      "trailer\n<< /Size " +
        (objects.size() + 1) +
        " /Root 1 0 R >>\nstartxref\n" +
        xref +
        "\n%%EOF\n"
    );
    return out.toByteArray();
  }

  private static void write(ByteArrayOutputStream out, String text) {
    out.writeBytes(text.getBytes(StandardCharsets.US_ASCII));
  }
}
