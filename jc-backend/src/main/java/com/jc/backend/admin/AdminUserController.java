package com.jc.backend.admin;
import com.jc.backend.common.*; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/admin/users") public class AdminUserController { private final AdminService service; public AdminUserController(AdminService s){service=s;}
@GetMapping ApiResponse<PageResponse<AdminDtos.UserSummary>> list(@RequestParam(required=false) String role,@RequestParam(required=false) String accountStatus,@RequestParam(required=false) String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return ApiResponse.ok(service.users(role,accountStatus,search,page,size));}
@GetMapping("/{id}") ApiResponse<AdminDtos.UserDetail> detail(@PathVariable long id){return ApiResponse.ok(service.user(id));}
@PostMapping("/{id}/suspend") ApiResponse<AdminDtos.CommandResult> suspend(@PathVariable long id,@RequestBody AdminDtos.CommandRequest r){return ApiResponse.ok(service.suspend(id,r));}
@PostMapping("/{id}/unsuspend") ApiResponse<AdminDtos.CommandResult> unsuspend(@PathVariable long id,@RequestBody AdminDtos.CommandRequest r){return ApiResponse.ok(service.unsuspend(id,r));}}
