package com.jc.backend.admin;
import com.jc.backend.common.*; import org.springframework.web.bind.annotation.*;
@RestController @RequestMapping("/api/admin/reports") public class AdminReportController { private final AdminService service; public AdminReportController(AdminService s){service=s;}
@GetMapping ApiResponse<PageResponse<AdminDtos.ReportSummary>> list(@RequestParam(required=false) String status,@RequestParam(required=false) String targetType,@RequestParam(required=false) String search,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="20") int size){return ApiResponse.ok(service.reports(status,targetType,search,page,size));}
@GetMapping("/{id}") ApiResponse<AdminDtos.ReportDetail> detail(@PathVariable long id){return ApiResponse.ok(service.report(id));}
@PostMapping("/{id}/resolve") ApiResponse<AdminDtos.CommandResult> resolve(@PathVariable long id,@RequestBody AdminDtos.CommandRequest r){return ApiResponse.ok(service.resolve(id,r));}
@PostMapping("/{id}/dismiss") ApiResponse<AdminDtos.CommandResult> dismiss(@PathVariable long id,@RequestBody AdminDtos.CommandRequest r){return ApiResponse.ok(service.dismiss(id,r));}}
