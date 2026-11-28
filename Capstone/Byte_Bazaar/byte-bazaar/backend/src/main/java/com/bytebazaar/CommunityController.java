package com.bytebazaar;

import static com.bytebazaar.Requests.*;

import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
public class CommunityController {

  private final MarketplaceService service;

  public CommunityController(MarketplaceService service) {
    this.service = service;
  }

  @GetMapping("/topics")
  public List<Topic> topics() {
    return service.topics();
  }

  @PostMapping("/topics")
  public Topic topic(@Valid @RequestBody TopicInput d, HttpSession s) {
    return service.topic(d, s);
  }

  @GetMapping("/topics/{id}/replies")
  public List<Reply> replies(@PathVariable Long id) {
    return service.replies(id);
  }

  @PostMapping("/topics/{id}/replies")
  public Reply reply(
    @PathVariable Long id,
    @Valid @RequestBody ReplyInput d,
    HttpSession s
  ) {
    return service.reply(id, d, s);
  }
}
