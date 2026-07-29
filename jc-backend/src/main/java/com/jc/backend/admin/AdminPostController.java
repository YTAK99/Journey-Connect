package com.jc.backend.admin;
import com.jc.backend.common.*; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/admin/posts") public class AdminPostController { private final AdminService service; public AdminPostController(AdminService s){service=s;}
@GetMapping ApiResponse<PageResponse<AdminDtos.PostSummary>> list(@RequestParam(required=false) String moderationStatus,@RequestParam(required=false) String visibility,@RequestParam(required=false) String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return ApiResponse.ok(service.posts(moderationStatus,visibility,search,page,size));}
@GetMapping("/{id}") ApiResponse<AdminDtos.PostDetail> detail(@PathVariable long id){return ApiResponse.ok(service.post(id));}
@PostMapping("/{id}/hide") ApiResponse<AdminDtos.CommandResult> hide(@PathVariable long id,@RequestBody AdminDtos.CommandRequest r){return ApiResponse.ok(service.hide(id,r));}
@PostMapping("/{id}/restore") ApiResponse<AdminDtos.CommandResult> restore(@PathVariable long id,@RequestBody AdminDtos.CommandRequest r){return ApiResponse.ok(service.restore(id,r));}}
