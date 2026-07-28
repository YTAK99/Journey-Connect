package com.jc.backend.admin;
import com.jc.backend.common.ApiResponse;
import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/admin/dashboard")
public class AdminDashboardController { private final AdminService service; public AdminDashboardController(AdminService service){this.service=service;} @GetMapping ApiResponse<AdminDtos.Dashboard> dashboard(){return ApiResponse.ok(service.dashboard());}}
