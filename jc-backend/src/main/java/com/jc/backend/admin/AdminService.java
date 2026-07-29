package com.jc.backend.admin;

import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class AdminService {
    private static final Set<String> ROLES = Set.of("user", "moderator", "admin");
    private static final Set<String> ACCOUNT_STATUSES = Set.of("active", "suspended", "withdrawn");
    private static final Set<String> MODERATION_STATUSES = Set.of("visible", "hidden");
    private static final Set<String> VISIBILITIES = Set.of("public", "followers", "private");
    private static final Set<String> REPORT_STATUSES = Set.of("pending", "in_review", "resolved", "rejected");
    private static final Set<String> TARGET_TYPES = Set.of("user", "post", "comment");

    private final JdbcTemplate jdbc;
    private final AdminGuard guard;

    public AdminService(JdbcTemplate jdbc, AdminGuard guard) {
        this.jdbc = jdbc;
        this.guard = guard;
    }

    public AdminDtos.Dashboard dashboard() {
        guard.requireAdmin();
        long totalUsers = count("select count(*) from user_account");
        long activePosts = count("select count(*) from journey_post where published = true and moderation_status = 'visible'");
        long pendingReports = count("select count(*) from admin_report where status in ('pending', 'in_review')");
        long suspendedUsers = count("select count(*) from user_account where account_status = 'suspended'");
        List<AdminDtos.RecentReport> reports = jdbc.query("""
                select id, target_type, target_id, reason_category, status, created_at
                from admin_report order by created_at desc, id desc limit 5
                """, (rs, rowNum) -> new AdminDtos.RecentReport(
                rs.getLong("id"), rs.getString("target_type"), rs.getLong("target_id"),
                rs.getString("reason_category"), rs.getString("status"), instant(rs, "created_at")));
        List<AdminDtos.RecentAdminAction> actions = jdbc.query("""
                select id, actor_username, action_type, target_type, target_id, created_at
                from admin_audit_log order by created_at desc, id desc limit 5
                """, (rs, rowNum) -> new AdminDtos.RecentAdminAction(
                rs.getLong("id"), rs.getString("actor_username"), rs.getString("action_type"),
                rs.getString("target_type"), rs.getLong("target_id"), instant(rs, "created_at")));
        return new AdminDtos.Dashboard(totalUsers, activePosts, pendingReports, suspendedUsers, reports, actions);
    }

    public PageResponse<AdminDtos.UserSummary> users(String role, String status, String search, int page, int size) {
        guard.requireAdmin();
        var bounds = AdminQueryPolicy.page(page, size);
        role = AdminQueryPolicy.optionalValue(role, ROLES, "role");
        status = AdminQueryPolicy.optionalValue(status, ACCOUNT_STATUSES, "accountStatus");
        search = AdminQueryPolicy.search(search);
        QueryParts parts = userWhere(role, status, search);
        long total = queryCount("select count(*) from user_account u" + parts.where, parts.args);
        List<Object> args = new ArrayList<>(parts.args); args.add(bounds.size()); args.add(bounds.offset());
        List<AdminDtos.UserSummary> items = jdbc.query("""
                select u.id, u.email, u.nickname, u.role, u.account_status, u.created_at, u.suspended_at
                from user_account u
                """ + parts.where + " order by u.created_at desc, u.id desc limit ? offset ?", userSummaryMapper(), args.toArray());
        return page(items, bounds, total);
    }

    public AdminDtos.UserDetail user(long userId) {
        guard.requireAdmin();
        AdminQueryPolicy.targetId(userId);
        try {
            return jdbc.queryForObject("""
                    select id, email, nickname, role, account_status, created_at, updated_at, suspended_at
                    from user_account where id = ?
                    """, (rs, n) -> new AdminDtos.UserDetail(
                    rs.getLong("id"), rs.getString("email"), rs.getString("email"), rs.getString("nickname"),
                    rs.getString("role"), rs.getString("account_status"), instant(rs, "created_at"),
                    instant(rs, "updated_at"), instantNullable(rs, "suspended_at")), userId);
        } catch (EmptyResultDataAccessException exception) { throw AdminQueryPolicy.notFound(); }
    }

    @Transactional
    public AdminDtos.CommandResult suspend(long userId, AdminDtos.CommandRequest request) {
        AdminGuard.Actor actor = guard.requireAdmin();
        AdminQueryPolicy.targetId(userId);
        String reason = AdminQueryPolicy.reason(request == null ? null : request.reason());
        if (actor.userId() == userId) throw AdminQueryPolicy.conflict("현재 관리자 계정은 스스로 정지할 수 없습니다.");
        String current = accountStatusForUpdate(userId);
        if ("suspended".equals(current)) return new AdminDtos.CommandResult(userId, current, false, Instant.now());
        if (!"active".equals(current)) throw AdminQueryPolicy.conflict("활성 계정만 정지할 수 있습니다.");
        jdbc.update("update user_account set account_status='suspended', suspended_at=current_timestamp, updated_at=current_timestamp where id=?", userId);
        jdbc.update("update refresh_token set revoked_at=current_timestamp, updated_at=current_timestamp where user_id=? and revoked_at is null", userId);
        audit(actor, "user_suspend", "user", userId, reason);
        return new AdminDtos.CommandResult(userId, "suspended", true, Instant.now());
    }

    @Transactional
    public AdminDtos.CommandResult unsuspend(long userId, AdminDtos.CommandRequest request) {
        AdminGuard.Actor actor = guard.requireAdmin();
        AdminQueryPolicy.targetId(userId);
        String reason = AdminQueryPolicy.reason(request == null ? null : request.reason());
        String current = accountStatusForUpdate(userId);
        if ("active".equals(current)) return new AdminDtos.CommandResult(userId, current, false, Instant.now());
        if (!"suspended".equals(current)) throw AdminQueryPolicy.conflict("정지 계정만 해제할 수 있습니다.");
        jdbc.update("update user_account set account_status='active', suspended_at=null, updated_at=current_timestamp where id=?", userId);
        audit(actor, "user_unsuspend", "user", userId, reason);
        return new AdminDtos.CommandResult(userId, "active", true, Instant.now());
    }

    public PageResponse<AdminDtos.PostSummary> posts(String moderation, String visibility, String search, int page, int size) {
        guard.requireAdmin();
        var bounds = AdminQueryPolicy.page(page, size);
        moderation = AdminQueryPolicy.optionalValue(moderation, MODERATION_STATUSES, "moderationStatus");
        visibility = AdminQueryPolicy.optionalValue(visibility, VISIBILITIES, "visibility");
        search = AdminQueryPolicy.search(search);
        QueryParts parts = postWhere(moderation, visibility, search);
        long total = queryCount("select count(*) from journey_post p join user_account u on u.id=p.author_id" + parts.where, parts.args);
        List<Object> args = new ArrayList<>(parts.args); args.add(bounds.size()); args.add(bounds.offset());
        List<AdminDtos.PostSummary> items = jdbc.query("""
                select p.*, u.nickname author_display_name
                from journey_post p join user_account u on u.id=p.author_id
                """ + parts.where + " order by p.created_at desc, p.id desc limit ? offset ?", postSummaryMapper(), args.toArray());
        return page(items, bounds, total);
    }

    public AdminDtos.PostDetail post(long postId) {
        guard.requireAdmin();
        AdminQueryPolicy.targetId(postId);
        try {
            return jdbc.queryForObject("""
                    select p.*, u.email author_username, u.nickname author_display_name
                    from journey_post p join user_account u on u.id=p.author_id where p.id=?
                    """, (rs, n) -> {
                String preview = plain(rs.getString("content"));
                return new AdminDtos.PostDetail(
                        rs.getLong("id"), rs.getLong("author_id"), rs.getString("author_username"),
                        rs.getString("author_display_name"), rs.getString("title"), truncate(preview, 2000), preview.length() > 2000,
                        visibility(rs.getBoolean("published")), rs.getBoolean("published") ? "published" : "draft",
                        rs.getString("moderation_status"), instant(rs,"created_at"), instant(rs,"updated_at"),
                        instantNullable(rs,"hidden_at"), null, null);
            }, postId);
        } catch (EmptyResultDataAccessException exception) { throw AdminQueryPolicy.notFound(); }
    }

    @Transactional
    public AdminDtos.CommandResult hide(long postId, AdminDtos.CommandRequest request) {
        AdminGuard.Actor actor = guard.requireAdmin();
        AdminQueryPolicy.targetId(postId);
        String reason = AdminQueryPolicy.reason(request == null ? null : request.reason());
        String current = postStatusForUpdate(postId);
        if ("hidden".equals(current)) return new AdminDtos.CommandResult(postId, current, false, Instant.now());
        jdbc.update("update journey_post set moderation_status='hidden', hidden_at=current_timestamp, updated_at=current_timestamp where id=?", postId);
        audit(actor, "post_hide", "post", postId, reason);
        return new AdminDtos.CommandResult(postId, "hidden", true, Instant.now());
    }

    @Transactional
    public AdminDtos.CommandResult restore(long postId, AdminDtos.CommandRequest request) {
        AdminGuard.Actor actor = guard.requireAdmin();
        AdminQueryPolicy.targetId(postId);
        String reason = AdminQueryPolicy.reason(request == null ? null : request.reason());
        String current = postStatusForUpdate(postId);
        if ("visible".equals(current)) return new AdminDtos.CommandResult(postId, current, false, Instant.now());
        jdbc.update("update journey_post set moderation_status='visible', hidden_at=null, updated_at=current_timestamp where id=?", postId);
        audit(actor, "post_restore", "post", postId, reason);
        return new AdminDtos.CommandResult(postId, "visible", true, Instant.now());
    }

    public PageResponse<AdminDtos.ReportSummary> reports(String status, String targetType, String search, int page, int size) {
        guard.requireAdmin();
        var bounds = AdminQueryPolicy.page(page, size);
        status = AdminQueryPolicy.optionalValue(status, REPORT_STATUSES, "status");
        targetType = AdminQueryPolicy.optionalValue(targetType, TARGET_TYPES, "targetType");
        search = AdminQueryPolicy.search(search);
        QueryParts parts = reportWhere(status, targetType, search);
        long total = queryCount("select count(*) from admin_report r left join user_account u on u.id=r.reporter_id" + parts.where, parts.args);
        List<Object> args = new ArrayList<>(parts.args); args.add(bounds.size()); args.add(bounds.offset());
        List<AdminDtos.ReportSummary> items = jdbc.query("""
                select r.*, u.email reporter_username
                from admin_report r left join user_account u on u.id=r.reporter_id
                """ + parts.where + " order by r.created_at desc, r.id desc limit ? offset ?", reportSummaryMapper(), args.toArray());
        return page(items, bounds, total);
    }

    public AdminDtos.ReportDetail report(long reportId) {
        guard.requireAdmin();
        AdminQueryPolicy.targetId(reportId);
        try {
            return jdbc.queryForObject("""
                    select r.*, u.email reporter_username, u.nickname reporter_display_name
                    from admin_report r left join user_account u on u.id=r.reporter_id where r.id=?
                    """, (rs, n) -> {
                String status = rs.getString("status");
                String targetType = rs.getString("target_type");
                long targetId = rs.getLong("target_id");
                return new AdminDtos.ReportDetail(
                        rs.getLong("id"), nullableLong(rs,"reporter_id"), rs.getString("reporter_username"),
                        rs.getString("reporter_display_name"), targetType, targetId, rs.getString("reason_category"),
                        rs.getString("reason_detail"), status, instant(rs,"created_at"), instantNullable(rs,"handled_at"),
                        rs.getString("resolution_note"), currentTargetState(targetType,targetId),
                        "pending".equals(status)||"in_review".equals(status), "pending".equals(status)||"in_review".equals(status));
            }, reportId);
        } catch (EmptyResultDataAccessException exception) { throw AdminQueryPolicy.notFound(); }
    }

    @Transactional
    public AdminDtos.CommandResult resolve(long reportId, AdminDtos.CommandRequest request) {
        return handleReport(reportId, request, "resolved", "report_resolve");
    }

    @Transactional
    public AdminDtos.CommandResult dismiss(long reportId, AdminDtos.CommandRequest request) {
        return handleReport(reportId, request, "rejected", "report_dismiss");
    }

    private AdminDtos.CommandResult handleReport(long reportId, AdminDtos.CommandRequest request, String targetState, String action) {
        AdminGuard.Actor actor = guard.requireAdmin();
        AdminQueryPolicy.targetId(reportId);
        String reason = AdminQueryPolicy.reason(request == null ? null : request.reason());
        String current;
        try { current = jdbc.queryForObject("select status from admin_report where id=? for update", String.class, reportId); }
        catch (EmptyResultDataAccessException exception) { throw AdminQueryPolicy.notFound(); }
        if (targetState.equals(current)) return new AdminDtos.CommandResult(reportId, current, false, Instant.now());
        if (!("pending".equals(current)||"in_review".equals(current))) throw AdminQueryPolicy.conflict("이미 종료된 신고입니다.");
        jdbc.update("update admin_report set status=?, handled_by=?, handled_at=current_timestamp, resolution_note=? where id=?", targetState, actor.userId(), reason, reportId);
        audit(actor, action, "report", reportId, reason);
        return new AdminDtos.CommandResult(reportId, targetState, true, Instant.now());
    }

    private QueryParts userWhere(String role, String status, String search) {
        List<String> clauses=new ArrayList<>(); List<Object> args=new ArrayList<>();
        if(role!=null){clauses.add("u.role=?");args.add(role);} if(status!=null){clauses.add("u.account_status=?");args.add(status);}
        if(search!=null){clauses.add("(cast(u.id as text)=? or u.email ilike ? or u.nickname ilike ?)");args.add(search);args.add("%"+search+"%");args.add("%"+search+"%");}
        return parts(clauses,args);
    }
    private QueryParts postWhere(String moderation, String visibility, String search) {
        List<String> clauses=new ArrayList<>(); List<Object> args=new ArrayList<>();
        if(moderation!=null){clauses.add("p.moderation_status=?");args.add(moderation);}
        if(visibility!=null){ if("followers".equals(visibility)){clauses.add("1=0");} else {clauses.add("p.published=?");args.add("public".equals(visibility));} }
        if(search!=null){clauses.add("(cast(p.id as text)=? or p.title ilike ? or u.nickname ilike ? or u.email ilike ?)");args.add(search);args.add("%"+search+"%");args.add("%"+search+"%");args.add("%"+search+"%");}
        return parts(clauses,args);
    }
    private QueryParts reportWhere(String status, String targetType, String search) {
        List<String> clauses=new ArrayList<>(); List<Object> args=new ArrayList<>();
        if(status!=null){clauses.add("r.status=?");args.add(status);} if(targetType!=null){clauses.add("r.target_type=?");args.add(targetType);}
        if(search!=null){clauses.add("(cast(r.id as text)=? or cast(r.target_id as text)=? or r.reason_category ilike ? or r.reason_detail ilike ? or u.email ilike ?)");args.add(search);args.add(search);args.add("%"+search+"%");args.add("%"+search+"%");args.add("%"+search+"%");}
        return parts(clauses,args);
    }
    private QueryParts parts(List<String> clauses,List<Object> args){return new QueryParts(clauses.isEmpty()?"":" where "+String.join(" and ",clauses),args);}

    private String accountStatusForUpdate(long id){try{return jdbc.queryForObject("select account_status from user_account where id=? for update",String.class,id);}catch(EmptyResultDataAccessException e){throw AdminQueryPolicy.notFound();}}
    private String postStatusForUpdate(long id){try{return jdbc.queryForObject("select moderation_status from journey_post where id=? for update",String.class,id);}catch(EmptyResultDataAccessException e){throw AdminQueryPolicy.notFound();}}
    private String currentTargetState(String type,long id){try{return switch(type){case "user"->jdbc.queryForObject("select account_status from user_account where id=?",String.class,id);case "post"->jdbc.queryForObject("select moderation_status from journey_post where id=?",String.class,id);case "comment"->jdbc.queryForObject("select case when count(*)>0 then 'visible' else 'missing' end from post_comment where id=?",String.class,id);default->"unknown";};}catch(Exception e){return "missing";}}
    private void audit(AdminGuard.Actor actor,String action,String type,long id,String reason){jdbc.update("insert into admin_audit_log(actor_id,actor_username,action_type,target_type,target_id,reason) values(?,?,?,?,?,?)",actor.userId(),actor.username(),action,type,id,reason);}
    private long count(String sql){Long n=jdbc.queryForObject(sql,Long.class);return n==null?0:n;}
    private long queryCount(String sql,List<Object> args){Long n=jdbc.queryForObject(sql,Long.class,args.toArray());return n==null?0:n;}
    private <T> PageResponse<T> page(List<T> items,AdminQueryPolicy.PageBounds b,long total){int pages=(int)Math.ceil(total/(double)b.size());return new PageResponse<>(items,b.page(),b.size(),total,pages,b.page()+1>=pages);}
    private RowMapper<AdminDtos.UserSummary> userSummaryMapper(){return(rs,n)->new AdminDtos.UserSummary(rs.getLong("id"),rs.getString("email"),rs.getString("email"),rs.getString("nickname"),rs.getString("role"),rs.getString("account_status"),instant(rs,"created_at"),instantNullable(rs,"suspended_at"));}
    private RowMapper<AdminDtos.PostSummary> postSummaryMapper(){return(rs,n)->{String p=plain(rs.getString("content"));return new AdminDtos.PostSummary(rs.getLong("id"),rs.getLong("author_id"),rs.getString("author_display_name"),rs.getString("title"),truncate(p,300),p.length()>300,visibility(rs.getBoolean("published")),rs.getBoolean("published")?"published":"draft",rs.getString("moderation_status"),instant(rs,"created_at"),instant(rs,"updated_at"),instantNullable(rs,"hidden_at"),null,null);};}
    private RowMapper<AdminDtos.ReportSummary> reportSummaryMapper(){return(rs,n)->new AdminDtos.ReportSummary(rs.getLong("id"),nullableLong(rs,"reporter_id"),rs.getString("reporter_username"),rs.getString("target_type"),rs.getLong("target_id"),rs.getString("reason_category"),rs.getString("reason_detail"),rs.getString("status"),instant(rs,"created_at"),instantNullable(rs,"handled_at"));}
    private static String visibility(boolean published){return published?"public":"private";}
    private static String plain(String value){return value==null?"":value.replaceAll("<[^>]*>"," ").replaceAll("\\s+"," ").trim();}
    private static String truncate(String value,int max){return value.length()<=max?value:value.substring(0,max);}
    private static Instant instant(ResultSet rs,String name)throws SQLException{Timestamp t=rs.getTimestamp(name);return t==null?null:t.toInstant();}
    private static Instant instantNullable(ResultSet rs,String name)throws SQLException{return instant(rs,name);}
    private static Long nullableLong(ResultSet rs,String name)throws SQLException{Object o=rs.getObject(name);return o==null?null:((Number)o).longValue();}
    private record QueryParts(String where,List<Object> args){}
}
