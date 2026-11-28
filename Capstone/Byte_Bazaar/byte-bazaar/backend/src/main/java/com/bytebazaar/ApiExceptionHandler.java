package com.bytebazaar;

import static com.bytebazaar.Requests.*;

import java.util.Map;
import java.util.Objects;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class ApiExceptionHandler {

  @ExceptionHandler(ResponseStatusException.class)
  public ResponseEntity<?> error(ResponseStatusException e) {
    return ResponseEntity.status(e.getStatusCode()).body(
      Map.of("message", Objects.toString(e.getReason(), "Request failed"))
    );
  }

  @ExceptionHandler(
    org.springframework.web.multipart.MaxUploadSizeExceededException.class
  )
  public ResponseEntity<?> uploadTooLarge() {
    return ResponseEntity.status(413).body(
      Map.of(
        "message",
        "Upload too large. Use JPEG/PNG photos up to 5 MB each and avatars up to 2 MB."
      )
    );
  }

  @ExceptionHandler(
    org.springframework.web.bind.MethodArgumentNotValidException.class
  )
  public ResponseEntity<?> invalid(
    org.springframework.web.bind.MethodArgumentNotValidException e
  ) {
    return ResponseEntity.badRequest().body(
      Map.of(
        "message",
        e
          .getBindingResult()
          .getFieldErrors()
          .stream()
          .map(x -> x.getField() + " " + x.getDefaultMessage())
          .findFirst()
          .orElse("Invalid input")
      )
    );
  }
}
