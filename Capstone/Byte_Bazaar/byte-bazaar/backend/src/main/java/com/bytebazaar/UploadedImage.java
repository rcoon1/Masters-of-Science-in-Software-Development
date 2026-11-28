package com.bytebazaar;

import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.ImageIO;
import org.springframework.http.HttpStatus;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

/** Decode and re-encode uploads so only image pixels, not supplied metadata, are served. */
public record UploadedImage(byte[] bytes, String contentType) {
  public static UploadedImage read(MultipartFile file, boolean avatar)
    throws IOException {
    if (
      file.isEmpty() || file.getSize() > (avatar ? 2 : 5) * 1024 * 1024L
    ) throw bad(
      avatar
        ? "Avatar must be a JPEG or PNG up to 2 MB"
        : "Each photo must be a JPEG or PNG up to 5 MB"
    );
    try (
      var input = ImageIO.createImageInputStream(
        new ByteArrayInputStream(file.getBytes())
      )
    ) {
      var readers = ImageIO.getImageReaders(input);
      if (!readers.hasNext()) throw bad("Use a valid JPEG or PNG image");
      var reader = readers.next();
      try {
        reader.setInput(input);
        String format = reader.getFormatName();
        if (
          !format.equalsIgnoreCase("JPEG") && !format.equalsIgnoreCase("PNG")
        ) throw bad("Use JPEG or PNG images");
        int width = reader.getWidth(0),
          height = reader.getHeight(0);
        if (
          width <= 0 ||
          height <= 0 ||
          (long) width * height > (avatar ? 4000000 : 20000000)
        ) throw bad(
          avatar ? "Avatar exceeds 4 megapixels" : "Photo exceeds 20 megapixels"
        );
        BufferedImage image = reader.read(0);
        if (image == null) throw bad("Invalid image");
        if (avatar) {
          var resized = new BufferedImage(
            256,
            256,
            BufferedImage.TYPE_INT_ARGB
          );
          var graphics = resized.createGraphics();
          try {
            graphics.setRenderingHint(
              RenderingHints.KEY_INTERPOLATION,
              RenderingHints.VALUE_INTERPOLATION_BICUBIC
            );
            int side = Math.min(width, height);
            graphics.drawImage(
              image,
              0,
              0,
              256,
              256,
              (width - side) / 2,
              (height - side) / 2,
              (width + side) / 2,
              (height + side) / 2,
              null
            );
          } finally {
            graphics.dispose();
          }
          image = resized;
          format = "PNG";
        }
        var output = new ByteArrayOutputStream();
        if (!ImageIO.write(image, format, output)) throw bad(
          "Image could not be processed"
        );
        if (output.size() > 10 * 1024 * 1024) throw bad(
          "Processed image is too large"
        );
        return new UploadedImage(
          output.toByteArray(),
          format.equalsIgnoreCase("PNG") ? "image/png" : "image/jpeg"
        );
      } finally {
        reader.dispose();
      }
    } catch (IOException e) {
      throw bad("Invalid image");
    }
  }

  private static ResponseStatusException bad(String message) {
    return new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
  }
}
