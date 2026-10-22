-- CreativeHub PostgreSQL Database Schema

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    bio TEXT DEFAULT '',
    profile_picture VARCHAR(255) DEFAULT NULL,
    role VARCHAR(20) DEFAULT 'user', -- 'user' or 'admin'
    status VARCHAR(20) DEFAULT 'active', -- 'active' or 'suspended'
    email_verified BOOLEAN DEFAULT FALSE,
    verification_token VARCHAR(128) DEFAULT NULL,
    verification_token_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    reset_password_token VARCHAR(128) DEFAULT NULL,
    reset_password_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    notifications_enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ensure columns exist if table was already created
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'user';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token VARCHAR(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(128) DEFAULT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Ensure existing accounts created before verification or demo accounts are verified
UPDATE users SET email_verified = TRUE WHERE email_verified IS NULL OR (email_verified = FALSE AND verification_token IS NULL);
UPDATE users SET email_verified = TRUE WHERE email IN (
    'admin@sherubtse.edu.bt', 'sonam@sherubtse.edu.bt', 'tashi@sherubtse.edu.bt',
    'dechen@sherubtse.edu.bt', 'karma@sherubtse.edu.bt', 'pema@sherubtse.edu.bt',
    'chimi@sherubtse.edu.bt', 'kinley@sherubtse.edu.bt', 'tshering@sherubtse.edu.bt',
    'sangay@sherubtse.edu.bt'
);

CREATE TABLE IF NOT EXISTS login_sessions (
    id SERIAL PRIMARY KEY,
    token VARCHAR(128) UNIQUE NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS creations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100) NOT NULL,
    image VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creation_id INTEGER NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_creation_like UNIQUE (user_id, creation_id)
);

CREATE TABLE IF NOT EXISTS comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creation_id INTEGER NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS share_events (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    creation_id INTEGER NOT NULL REFERENCES creations(id) ON DELETE CASCADE,
    share_method VARCHAR(50) DEFAULT 'link_copy',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_type VARCHAR(50) NOT NULL, -- 'creation' or 'comment'
    content_id INTEGER NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'resolved', 'dismissed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    resolution_note TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS moderation_logs (
    id SERIAL PRIMARY KEY,
    admin_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'delete_creation', 'delete_comment', 'suspend_user', 'activate_user'
    target_type VARCHAR(50) NOT NULL,
    target_id INTEGER NOT NULL,
    reason TEXT DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS follows (
    id SERIAL PRIMARY KEY,
    follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_follower_following UNIQUE (follower_id, following_id)
);

CREATE TABLE IF NOT EXISTS challenges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    short_summary TEXT DEFAULT '',
    description TEXT DEFAULT '',
    organizer VARCHAR(200) DEFAULT '',
    category VARCHAR(100) NOT NULL,
    skills VARCHAR(255) DEFAULT '',
    eligibility TEXT DEFAULT '',
    participation_type VARCHAR(50) DEFAULT 'Individual', -- 'Individual' or 'Team'
    team_size VARCHAR(50) DEFAULT '',
    location VARCHAR(200) DEFAULT '',
    mode VARCHAR(50) DEFAULT 'Online', -- 'Online', 'In-Person', 'Hybrid'
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    event_date TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    deadline TIMESTAMP WITH TIME ZONE NOT NULL,
    submission_instructions TEXT DEFAULT '',
    deliverables TEXT DEFAULT '',
    evaluation_criteria TEXT DEFAULT '',
    prizes TEXT DEFAULT '',
    resources TEXT DEFAULT '',
    contact_info VARCHAR(255) DEFAULT '',
    status VARCHAR(30) DEFAULT 'Open', -- 'Upcoming', 'Open', 'Closed', 'Completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration safety for challenges
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS short_summary TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS organizer VARCHAR(200) DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS skills VARCHAR(255) DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS eligibility TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS participation_type VARCHAR(50) DEFAULT 'Individual';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS team_size VARCHAR(50) DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS location VARCHAR(200) DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'Online';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS event_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS submission_instructions TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS deliverables TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS evaluation_criteria TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS prizes TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS resources TEXT DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS contact_info VARCHAR(255) DEFAULT '';
ALTER TABLE challenges ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Open';

CREATE TABLE IF NOT EXISTS challenge_participants (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_id INTEGER NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Pending', -- 'Pending', 'Under Review', 'Accepted', 'Rejected', 'Withdrawn'
    message TEXT DEFAULT '',
    decision_message TEXT DEFAULT '',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_challenge UNIQUE (user_id, challenge_id)
);

-- Migration safety for challenge_participants
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS decision_message TEXT DEFAULT '';
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE challenge_participants ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE TABLE IF NOT EXISTS collaborations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    short_summary TEXT DEFAULT '',
    description TEXT DEFAULT '',
    category VARCHAR(100) DEFAULT 'Other',
    skills VARCHAR(255) DEFAULT '',
    roles VARCHAR(255) DEFAULT '',
    positions INTEGER DEFAULT 1,
    experience TEXT DEFAULT '',
    participation_type VARCHAR(50) DEFAULT 'Individual',
    location VARCHAR(200) DEFAULT '',
    mode VARCHAR(50) DEFAULT 'Remote', -- 'Remote', 'In-Person', 'Hybrid'
    start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    duration VARCHAR(100) DEFAULT '',
    deliverables TEXT DEFAULT '',
    tools VARCHAR(255) DEFAULT '',
    compensation VARCHAR(100) DEFAULT 'Volunteer',
    application_instructions TEXT DEFAULT '',
    status VARCHAR(30) DEFAULT 'Open', -- 'Open', 'In Progress', 'Closed', 'Completed'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migration safety for collaborations
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS short_summary TEXT DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Other';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS positions VARCHAR(50) DEFAULT '1-2';
ALTER TABLE collaborations ALTER COLUMN positions TYPE VARCHAR(50) USING positions::VARCHAR;
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS experience TEXT DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS participation_type VARCHAR(50) DEFAULT 'Individual';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS location VARCHAR(200) DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS mode VARCHAR(50) DEFAULT 'Remote';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deadline TIMESTAMP WITH TIME ZONE DEFAULT NULL;
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS duration VARCHAR(100) DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS deliverables TEXT DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS tools VARCHAR(255) DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS compensation VARCHAR(100) DEFAULT 'Volunteer';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS application_instructions TEXT DEFAULT '';
ALTER TABLE collaborations ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Open';

CREATE TABLE IF NOT EXISTS collaboration_requests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    collaboration_id INTEGER NOT NULL REFERENCES collaborations(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'Pending', -- 'Pending', 'Under Review', 'Accepted', 'Rejected', 'Withdrawn'
    message TEXT DEFAULT '',
    decision_message TEXT DEFAULT '',
    reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_user_collaboration UNIQUE (user_id, collaboration_id)
);

-- Migration safety for collaboration_requests
ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Pending';
ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS message TEXT DEFAULT '';
ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS decision_message TEXT DEFAULT '';
ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE collaboration_requests ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info',
    link VARCHAR(255),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_creations_user_id ON creations(user_id);
CREATE INDEX IF NOT EXISTS idx_creations_category ON creations(category);
CREATE INDEX IF NOT EXISTS idx_creations_created_at ON creations(created_at);
CREATE INDEX IF NOT EXISTS idx_likes_creation_id ON likes(creation_id);
CREATE INDEX IF NOT EXISTS idx_likes_created_at ON likes(created_at);
CREATE INDEX IF NOT EXISTS idx_comments_creation_id ON comments(creation_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);
CREATE INDEX IF NOT EXISTS idx_share_events_creation_id ON share_events(creation_id);
CREATE INDEX IF NOT EXISTS idx_share_events_user_id ON share_events(user_id);
CREATE INDEX IF NOT EXISTS idx_share_events_created_at ON share_events(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_receiver ON messages(sender_id, receiver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, is_read);
