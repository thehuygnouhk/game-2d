-- 0001: step B3 schema, copied from docs/architecture/database-schema.md §3-§4 (the reference).
-- Tables: accounts, auth_sessions, realms, characters, character_skills, character_quests, item_instances,
-- currency_ledger and every enum. The rest of the reference schema arrives with the features that use it.
-- packages/db/test checks that these tables match the documented DDL column for column.

CREATE TYPE account_status   AS ENUM ('ACTIVE', 'SUSPENDED', 'BANNED', 'DELETED');

CREATE TYPE origin_type      AS ENUM ('VILLAGER', 'NOBLE', 'ANCIENT');

CREATE TYPE class_type       AS ENUM ('NONE', 'FIRE', 'WATER', 'WIND', 'BOLT', 'EARTH', 'PLANT', 'DARK', 'ARCHER');

CREATE TYPE gender_type      AS ENUM ('M', 'F');

CREATE TYPE pk_state_type    AS ENUM ('PEACE', 'FLAGGED');

CREATE TYPE item_location    AS ENUM ('BAG', 'EQUIP', 'BANK', 'MAIL', 'MARKET', 'GUILD_BANK', 'TRADE');

CREATE TYPE quest_status     AS ENUM ('ACCEPTED', 'IN_PROGRESS', 'READY', 'COMPLETED', 'ABANDONED', 'FAILED');

CREATE TYPE currency_type    AS ENUM ('SOFT', 'PREMIUM', 'GUILD_POINT', 'BADGE', 'MERIT');

CREATE TYPE owner_kind       AS ENUM ('CHARACTER', 'ACCOUNT', 'GUILD');

CREATE TYPE friend_status    AS ENUM ('PENDING', 'ACCEPTED', 'BLOCKED');

CREATE TYPE guild_role       AS ENUM ('LEADER', 'VICE', 'ELITE', 'MEMBER');

CREATE TYPE listing_status   AS ENUM ('ACTIVE', 'SOLD', 'EXPIRED', 'CANCELLED');

CREATE TYPE payment_status   AS ENUM ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CHARGEBACK');

CREATE TYPE sanction_kind    AS ENUM ('MUTE', 'BAN');

CREATE TYPE gm_role          AS ENUM ('SUPPORT', 'GM', 'ADMIN', 'SUPERADMIN');

CREATE TYPE report_status    AS ENUM ('OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED');

CREATE TABLE accounts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username          text NOT NULL,
  email             text NOT NULL,
  password_hash     text NOT NULL,                      -- argon2id
  status            account_status NOT NULL DEFAULT 'ACTIVE',
  premium_currency  bigint NOT NULL DEFAULT 0 CHECK (premium_currency >= 0),
  vip_total_vnd     bigint NOT NULL DEFAULT 0 CHECK (vip_total_vnd >= 0),
  birth_date        date,                               -- phục vụ hạn mức theo tuổi
  phone_verified_at timestamptz,
  two_factor_secret text,
  locale            text NOT NULL DEFAULT 'vi',
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  last_login_at     timestamptz,
  deleted_at        timestamptz
);

CREATE UNIQUE INDEX accounts_username_uq ON accounts (lower(username));

CREATE UNIQUE INDEX accounts_email_uq    ON accounts (lower(email));

CREATE TABLE auth_sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  refresh_token_hash text NOT NULL,
  device             text,
  ip_hash            text,                              -- băm, không lưu IP thô lâu dài
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  revoked_at         timestamptz
);

CREATE INDEX auth_sessions_account_idx ON auth_sessions (account_id);

CREATE TABLE realms (
  id          smallint PRIMARY KEY,
  name        text NOT NULL UNIQUE,
  status      text NOT NULL DEFAULT 'OPEN',             -- OPEN, FULL, MAINTENANCE, CLOSED
  ws_url      text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE characters (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id         uuid NOT NULL REFERENCES accounts(id),
  realm_id           smallint NOT NULL REFERENCES realms(id),
  name               text NOT NULL,
  gender             gender_type NOT NULL,
  appearance         jsonb NOT NULL DEFAULT '{}'::jsonb,   -- hair, color, face
  origin             origin_type NOT NULL,
  class              class_type NOT NULL DEFAULT 'NONE',
  level              smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 200),
  exp                bigint NOT NULL DEFAULT 0 CHECK (exp >= 0),
  soft_currency      bigint NOT NULL DEFAULT 0 CHECK (soft_currency >= 0),
  merit              integer NOT NULL DEFAULT 0 CHECK (merit >= 0),

  -- điểm
  stat_points        integer NOT NULL DEFAULT 10 CHECK (stat_points >= 0),
  skill_points       integer NOT NULL DEFAULT 0 CHECK (skill_points >= 0),
  talent_points      integer NOT NULL DEFAULT 0 CHECK (talent_points >= 0),
  pts_hp             integer NOT NULL DEFAULT 0 CHECK (pts_hp >= 0),
  pts_mp             integer NOT NULL DEFAULT 0 CHECK (pts_mp >= 0),
  pts_atk            integer NOT NULL DEFAULT 0 CHECK (pts_atk >= 0),
  pts_def            integer NOT NULL DEFAULT 0 CHECK (pts_def >= 0),
  pts_crit           integer NOT NULL DEFAULT 0 CHECK (pts_crit >= 0),

  -- trạng thái tức thời
  hp                 integer NOT NULL DEFAULT 1,
  mp                 integer NOT NULL DEFAULT 1,
  map_id             text NOT NULL DEFAULT 'M001',
  pos_x              real NOT NULL DEFAULT 0,
  pos_y              real NOT NULL DEFAULT 0,
  home_map_id        text NOT NULL DEFAULT 'M001',

  -- xã hội & PK
  pk_state           pk_state_type NOT NULL DEFAULT 'PEACE',
  sin_points         integer NOT NULL DEFAULT 0 CHECK (sin_points >= 0),
  guild_id           uuid,                               -- FK thêm sau (vòng phụ thuộc)
  chapter            smallint NOT NULL DEFAULT 1,
  tome_edition       smallint NOT NULL DEFAULT 1 CHECK (tome_edition BETWEEN 1 AND 3),
  class_changed_at   timestamptz,
  auto_seconds_today integer NOT NULL DEFAULT 0,
  play_seconds       bigint NOT NULL DEFAULT 0,
  flags              jsonb NOT NULL DEFAULT '{}'::jsonb,   -- tutorial, cutscene đã xem

  version            integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  last_online_at     timestamptz,
  deleted_at         timestamptz
);

CREATE UNIQUE INDEX characters_name_uq ON characters (realm_id, lower(name)) WHERE deleted_at IS NULL;

CREATE INDEX characters_account_idx ON characters (account_id) WHERE deleted_at IS NULL;

CREATE INDEX characters_guild_idx   ON characters (guild_id);

CREATE INDEX characters_level_idx   ON characters (realm_id, level DESC, exp DESC);

CREATE TABLE character_skills (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  skill_id     text NOT NULL,
  level        smallint NOT NULL DEFAULT 1 CHECK (level BETWEEN 1 AND 7),
  hotbar_slot  smallint,
  PRIMARY KEY (character_id, skill_id)
);

CREATE TABLE character_quests (
  character_id uuid NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
  quest_id     text NOT NULL,
  status       quest_status NOT NULL,
  progress     jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{objectiveIdx, count}]
  reset_key    text NOT NULL DEFAULT '',                 -- vd '2026-11-18' cho nhiệm vụ ngày
  accepted_at  timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  PRIMARY KEY (character_id, quest_id, reset_key)
);

CREATE INDEX character_quests_status_idx ON character_quests (character_id, status);

CREATE TABLE item_instances (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id      text NOT NULL,                       -- ITM01101
  qty              integer NOT NULL DEFAULT 1 CHECK (qty > 0),
  location         item_location NOT NULL,
  holder_id        uuid NOT NULL,                       -- character / account / guild / mail / listing / trade
  slot             integer,
  rarity           smallint NOT NULL DEFAULT 0 CHECK (rarity BETWEEN 0 AND 5),   -- 0 Thường … 5 Thần Thoại (items §2)
  item_level       smallint NOT NULL DEFAULT 1 CHECK (item_level BETWEEN 1 AND 200), -- trang bị rơi lấy cấp quái (combat §6)
  enhance_level    smallint NOT NULL DEFAULT 0 CHECK (enhance_level BETWEEN 0 AND 16),
  affixes          jsonb NOT NULL DEFAULT '[]'::jsonb,
  gems             jsonb NOT NULL DEFAULT '[]'::jsonb,
  bound            boolean NOT NULL DEFAULT false,
  expires_at       timestamptz,
  pity_counter     smallint NOT NULL DEFAULT 0,
  version          integer NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX item_instances_holder_idx ON item_instances (holder_id, location);

CREATE UNIQUE INDEX item_instances_slot_uq
  ON item_instances (holder_id, location, slot)
  WHERE slot IS NOT NULL AND location IN ('BAG', 'EQUIP', 'BANK', 'GUILD_BANK');

-- Sổ cái bất biến: mọi thay đổi tiền tệ đều có một dòng
CREATE TABLE currency_ledger (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  owner_kind    owner_kind NOT NULL,
  owner_id      uuid NOT NULL,
  currency      currency_type NOT NULL,
  delta         bigint NOT NULL,
  balance_after bigint NOT NULL,
  reason        text NOT NULL,                          -- SHOP_BUY, MOB_DROP, TRADE, ENHANCE, TOPUP...
  ref_type      text,
  ref_id        text,
  idem_key      uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ledger_owner_idx ON currency_ledger (owner_id, created_at DESC);

CREATE UNIQUE INDEX ledger_idem_uq ON currency_ledger (owner_id, idem_key) WHERE idem_key IS NOT NULL;
