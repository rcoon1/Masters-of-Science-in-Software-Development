package com.bytebazaar;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AdminSetup {

  @Bean
  ApplicationRunner provisionAdmin(
    AdminService admin,
    @Value("${bytebazaar.admin.email:admin@bytebazaar.com}") String email,
    @Value("${bytebazaar.admin.password:adminadmin123}") String password
  ) {
    return args -> admin.provision(email.trim(), password);
  }
}
