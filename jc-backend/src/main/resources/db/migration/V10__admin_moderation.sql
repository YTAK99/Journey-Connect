-- Team handoff Admin extension. V1-V6 are preserved; this is a forward-only migration.
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS account_status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE user_account ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_account_role_check') THEN
    ALTER TABLE user_account ADD CONSTRAINT user_account_role_check CHECK (role IN ('user','moderator','admin'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='user_account_status_check') THEN
    ALTER TABLE user_account ADD CONSTRAINT user_account_status_check CHECK (account_status IN ('active','suspended','withdrawn'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_user_account_admin_status ON user_account(role, account_status);

ALTER TABLE journey_post ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(20) NOT NULL DEFAULT 'visible';
ALTER TABLE journey_post ADD COLUMN IF NOT EXISTS hidden_at TIMESTAMP;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='journey_post_moderation_check') THEN
    ALTER TABLE journey_post ADD CONSTRAINT journey_post_moderation_check CHECK (moderation_status IN ('visible','hidden'));
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS idx_post_moderation_feed ON journey_post(moderation_status, published, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS admin_report (
  id BIGSERIAL PRIMARY KEY,
  reporter_id BIGINT REFERENCES user_account(id) ON DELETE SET NULL,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('user','post','comment')),
  target_id BIGINT NOT NULL,
  reason_category VARCHAR(80) NOT NULL,
  reason_detail VARCHAR(1000),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_review','resolved','rejected')),
  handled_by BIGINT REFERENCES user_account(id) ON DELETE SET NULL,
  handled_at TIMESTAMP WITH TIME ZONE,
  resolution_note VARCHAR(1000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_report_status_created ON admin_report(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_report_target ON admin_report(target_type, target_id);

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES user_account(id) ON DELETE SET NULL,
  actor_username VARCHAR(190) NOT NULL,
  action_type VARCHAR(60) NOT NULL,
  target_type VARCHAR(20) NOT NULL,
  target_id BIGINT NOT NULL,
  reason VARCHAR(1000) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);

-- Local/demo-only administrator. Change the password before any shared or deployed environment.
INSERT INTO user_account(email, password_hash, nickname, role, account_status)
VALUES (
  'admin@journey-connect.local',
  '$2y$10$o2pOnwrtc9a6IdIxA3EuwuqqCki.EXZGJmE91tW8cAUbL1T1y4haO',
  'journey-admin',
  'admin',
  'active'
)
ON CONFLICT (email) DO UPDATE SET
  password_hash=EXCLUDED.password_hash,
  role='admin',
  account_status='active',
  suspended_at=NULL,
  updated_at=CURRENT_TIMESTAMP;

INSERT INTO admin_report(reporter_id,target_type,target_id,reason_category,reason_detail)
SELECT u.id,'post',p.id,'demo_content_review','관리자 화면 확인을 위한 로컬 데모 신고입니다.'
FROM user_account u CROSS JOIN LATERAL (SELECT id FROM journey_post ORDER BY id LIMIT 1) p
WHERE u.email='seed-traveler@journey-connect.local'
  AND NOT EXISTS (SELECT 1 FROM admin_report WHERE reason_category='demo_content_review');
