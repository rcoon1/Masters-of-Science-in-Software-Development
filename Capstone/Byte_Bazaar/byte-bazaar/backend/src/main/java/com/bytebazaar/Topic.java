package com.bytebazaar;

public class Topic {

  public Long id;

  public boolean hidden;

  public Long authorId;
  public String author;
  public long authorAvatarVersion;
  public String category;
  public String subcategory;
  public int replyCount;
  public java.time.Instant latestActivity;
  public String lastAuthor;
  public String title;
  public String body;
  public java.time.Instant createdAt;
}
