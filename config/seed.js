const bcrypt = require('bcrypt');
const { db } = require('./db');

const DEMO_PASSWORD = 'password123';

async function seedDatabase(force = false) {
  const existingUsers = await db.one('SELECT COUNT(*) FROM users');
  if (parseInt(existingUsers.count, 10) > 0 && !force) {
    console.log('Database already contains data. Skipping seed.');
    return;
  }

  // Clear existing data if force is true
  if (force) {
    await db.none(`
      TRUNCATE TABLE moderation_logs, reports, share_events, categories,
                     notifications, messages, collaboration_requests, collaborations,
                     challenge_participants, challenges, follows, comments, likes,
                     creations, login_sessions, users RESTART IDENTITY CASCADE
    `);
    console.log('Cleared previous database records.');
  }

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

  // 1. Seed Categories Table
  const defaultCategories = [
    { name: 'Digital Art', description: 'Digital paintings, vector art, 3D renders, and conceptual designs.' },
    { name: 'Photography', description: 'Campus views, street photography, portraits, and Himalayan landscapes.' },
    { name: 'Graphic Design', description: 'Brand identities, posters, layouts, and typography.' },
    { name: 'Illustration', description: 'Traditional and digital drawings, comics, and visual storyboards.' },
    { name: 'Music', description: 'Original tracks, acoustic folk, Dramyin melodies, and lo-fi beats.' },
    { name: 'Writing', description: 'Poetry, short stories, essays, and college vignettes in English and Dzongkha.' },
    { name: 'Video', description: 'Short films, reels, motion graphics, and campus documentaries.' },
    { name: 'Other', description: 'Interdisciplinary crafts, ceramics, and mixed media.' }
  ];

  for (const cat of defaultCategories) {
    await db.none(
      'INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING',
      [cat.name, cat.description]
    );
  }

  // 2. Seed Administrator Account
  const adminUser = await db.one(
    `INSERT INTO users (full_name, username, email, password, bio, role, status, email_verified)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      'Sherubtse Administrator',
      'admin',
      'admin@sherubtse.edu.bt',
      hashedPassword,
      'Official System Administrator for Sherubtse CreativeHub community platform.',
      'admin',
      'active',
      true
    ]
  );

  // 3. Seed Bhutanese Student Accounts
  const people = [
    {
      name: 'Sonam Choden',
      username: 'sonam',
      email: 'sonam@sherubtse.edu.bt',
      bio: 'Graphic design & multimedia enthusiast at Sherubtse College. Inspired by traditional Bhutanese patterns and modern layouts.'
    },
    {
      name: 'Tashi Wangchuk',
      username: 'tashi',
      email: 'tashi@sherubtse.edu.bt',
      bio: 'Campus photographer in Kanglung, capturing morning mist, Eastern Bhutan ridges, and college life.'
    },
    {
      name: 'Karma Dorji',
      username: 'karmad',
      email: 'karma@sherubtse.edu.bt',
      bio: 'Sherubtse student exploring traditional Bhutanese arts, archery culture, and visual storytelling.'
    },
    {
      name: 'Pema Yangzom',
      username: 'pemay',
      email: 'pema@sherubtse.edu.bt',
      bio: 'English Literature student at Sherubtse. Writing poetry, essays, and capturing cultural moments across Trashigang.'
    },
    {
      name: 'Kinley Tshering',
      username: 'kinley',
      email: 'kinley@sherubtse.edu.bt',
      bio: 'Sound and media producer at Kanglung. Passionate about blending traditional dramyin melodies with contemporary rhythms.'
    }
  ];

  const createdUsers = [];
  for (const person of people) {
    const u = await db.one(
      'INSERT INTO users (full_name, username, email, password, bio, role, status, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
      [person.name, person.username, person.email, hashedPassword, person.bio, 'user', 'active', true]
    );
    createdUsers.push(u);
  }

  const [sonam, tashi, karma, pema, kinley] = createdUsers;

  // 4. Real Sherubtse College & Bhutan Photographs
  const posts = [
    {
      user: sonam,
      title: 'Sherubtse College Main Campus & Clock Tower',
      desc: 'Clear afternoon view of our iconic Sherubtse College academic block and clock tower in Kanglung, the peak of learning.',
      cat: 'Photography',
      img: 'sherubtse_college.jpg'
    },
    {
      user: tashi,
      title: 'Majesty of Trashigang Dzong',
      desc: 'Perched high above the Gamri Chhu river, the historic Fortress of the Auspicious Mountain guarding eastern Bhutan.',
      cat: 'Photography',
      img: 'trashigang_dzong.jpg'
    },
    {
      user: karma,
      title: 'Sacred Cham Dance at the Annual Festival',
      desc: 'The vibrant silk brocades and sacred mask dance of the festival, capturing centuries of living spiritual heritage.',
      cat: 'Digital Art',
      img: 'bhutan_tshechu.jpg'
    },
    {
      user: pema,
      title: 'Wind Horses over Eastern Ridges',
      desc: 'Colorful prayer flags carrying blessings across the mountain pass on a misty morning outside Kanglung.',
      cat: 'Writing',
      img: 'bhutan_prayer_flags.jpg'
    },
    {
      user: kinley,
      title: 'The Focus of Dha (Bhutanese Archery)',
      desc: 'Target practice at the college grounds during our annual Sherubtse sports and cultural festival.',
      cat: 'Photography',
      img: 'bhutan_archery.jpg'
    },
    {
      user: sonam,
      title: 'Intricate Handwoven Kishuthara Patterns',
      desc: 'Exploring traditional eastern Bhutanese textile geometry, silk brocades, and cultural color harmonies.',
      cat: 'Graphic Design',
      img: 'bhutanese_textile.jpg'
    },
    {
      user: tashi,
      title: 'Rangjung Stupas in Trashigang',
      desc: 'Serene stupas in Rangjung under the clear eastern skies, a peaceful weekend excursion from Kanglung.',
      cat: 'Photography',
      img: 'rangjung_chorten.jpg'
    },
    {
      user: karma,
      title: 'Afternoon Light in Trashigang Town',
      desc: 'Street scene capturing daily life and community warmth in the heart of Trashigang.',
      cat: 'Illustration',
      img: 'trashigang_town.jpg'
    }
  ];

  const createdPosts = [];
  for (let i = 0; i < posts.length; i++) {
    const p = posts[i];
    const createdDate = new Date(Date.now() - (posts.length - i) * 24 * 60 * 60 * 1000);
    const c = await db.one(
      'INSERT INTO creations (user_id, title, description, category, image, created_at) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [p.user.id, p.title, p.desc, p.cat, p.img, createdDate]
    );
    createdPosts.push(c);
  }

  // 5. Likes
  const likePairs = [
    [0, tashi], [0, karma], [0, kinley], [1, sonam], [1, pema], [2, sonam],
    [2, tashi], [3, pema], [4, sonam], [5, tashi], [5, sonam], [6, karma]
  ];
  for (const [postIdx, user] of likePairs) {
    await db.none('INSERT INTO likes (user_id, creation_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, createdPosts[postIdx].id]);
  }

  // 6. Comments
  const comments = [
    [0, tashi, 'Sherubtse clock tower looks beautiful against the Kanglung sky!'],
    [0, karma, 'Proud to study at the Peak of Learning.'],
    [1, sonam, 'Incredible framing of Trashigang Dzong, Tashi.'],
    [2, pema, 'The colors of the silk brocade are breathtaking.'],
    [3, sonam, 'May the wind flags carry peace to all.'],
    [5, kinley, 'The textile detail and geometric symmetry are amazing.']
  ];
  for (const [postIdx, user, text] of comments) {
    await db.none('INSERT INTO comments (user_id, creation_id, comment) VALUES ($1, $2, $3)', [user.id, createdPosts[postIdx].id, text]);
  }

  // 7. Tracked Share Events (Real initiated share actions)
  const shareEvents = [
    { user: tashi, post: createdPosts[0], method: 'link_copy', daysAgo: 5 },
    { user: karma, post: createdPosts[0], method: 'link_copy', daysAgo: 4 },
    { user: pema, post: createdPosts[0], method: 'native_share', daysAgo: 3 },
    { user: sonam, post: createdPosts[1], method: 'link_copy', daysAgo: 4 },
    { user: kinley, post: createdPosts[1], method: 'link_copy', daysAgo: 2 },
    { user: sonam, post: createdPosts[2], method: 'native_share', daysAgo: 3 },
    { user: tashi, post: createdPosts[3], method: 'link_copy', daysAgo: 1 },
    { user: karma, post: createdPosts[5], method: 'link_copy', daysAgo: 2 }
  ];
  for (const se of shareEvents) {
    const shareDate = new Date(Date.now() - se.daysAgo * 24 * 60 * 60 * 1000);
    await db.none(
      'INSERT INTO share_events (user_id, creation_id, share_method, created_at) VALUES ($1, $2, $3, $4)',
      [se.user.id, se.post.id, se.method, shareDate]
    );
  }

  // 8. Follows
  const followPairs = [
    [sonam, tashi], [sonam, karma], [tashi, sonam], [karma, sonam], [kinley, sonam], [pema, karma]
  ];
  for (const [follower, following] of followPairs) {
    await db.none('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [follower.id, following.id]);
  }

  // 9. Challenges
  const now = new Date();
  const d1 = new Date(now.getTime() + 21 * 24 * 60 * 60 * 1000);
  const d2 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const d3 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const ch1 = await db.one(
    'INSERT INTO challenges (user_id, title, category, description, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [sonam.id, 'Kanglung Golden Hour Photo Walk', 'Photography', 'Capture the beauty of Sherubtse campus and Kanglung valley during the hour before sunset.', d1]
  );
  const ch2 = await db.one(
    'INSERT INTO challenges (user_id, title, category, description, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [karma.id, 'Dzongkha Calligraphy & Typography', 'Graphic Design', 'Design a contemporary poster or title lettering incorporating traditional Uchen or Joyi script.', d2]
  );
  const ch3 = await db.one(
    'INSERT INTO challenges (user_id, title, category, description, deadline) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [pema.id, 'Sherubtse Campus Memories: Six-Word Stories', 'Writing', 'Tell a vivid story about life at Sherubtse in just six words. Make every syllable resonate.', d3]
  );

  // Participants
  for (const [user, ch] of [[tashi, ch1], [karma, ch1], [kinley, ch1], [sonam, ch2], [pema, ch2], [sonam, ch3]]) {
    await db.none('INSERT INTO challenge_participants (user_id, challenge_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [user.id, ch.id]);
  }

  // 10. Collaborations
  const col1 = await db.one(
    'INSERT INTO collaborations (user_id, title, description, skills, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [pema.id, 'Sherubtse Creative Arts Magazine', 'Putting together the autumn issue of our student-led literary magazine. Looking for editors, illustrators and layout designers.', 'Editing, Illustration, InDesign', 'Open']
  );
  const col2 = await db.one(
    'INSERT INTO collaborations (user_id, title, description, skills, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
    [kinley.id, 'Dramyin & Acoustic Folk Fusion', 'Working on a 4-track EP fusing traditional dramyin rhythms with acoustic guitars. Looking for vocalists and a cover artist.', 'Vocals, Cover Art, Dramyin', 'Open']
  );

  await db.none('INSERT INTO collaboration_requests (user_id, collaboration_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [sonam.id, col1.id]);
  await db.none('INSERT INTO collaboration_requests (user_id, collaboration_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [karma.id, col2.id]);

  // 11. Reports (Sample moderation records)
  await db.none(
    'INSERT INTO reports (reporter_id, content_type, content_id, reason, status) VALUES ($1, $2, $3, $4, $5)',
    [tashi.id, 'creation', createdPosts[7].id, 'Check category accuracy: tagged as Illustration but looks like street photo.', 'pending']
  );
  await db.none(
    'INSERT INTO reports (reporter_id, content_type, content_id, reason, status, resolved_at, resolved_by, resolution_note) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
    [sonam.id, 'comment', 1, 'Duplicate test comment submitted by accident.', 'resolved', new Date(), adminUser.id, 'Reviewed and retained.']
  );

  // 12. Messages & Notifications
  await db.none(
    'INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES ($1, $2, $3, $4)',
    [tashi.id, sonam.id, 'Kuzu zangpo Sonam! Love your new photograph of the Sherubtse clock tower.', new Date(Date.now() - 3600000)]
  );
  await db.none(
    'INSERT INTO messages (sender_id, receiver_id, message, created_at) VALUES ($1, $2, $3, $4)',
    [sonam.id, tashi.id, 'Kuzu zangpo Tashi! Thanks so much. Your Trashigang Dzong shot was incredible too.', new Date(Date.now() - 1800000)]
  );

  await db.none(
    'INSERT INTO notifications (user_id, message, type, link) VALUES ($1, $2, $3, $4)',
    [sonam.id, 'Tashi Wangchuk started following you', 'follow', 'profile.html?id=' + tashi.id]
  );
  await db.none(
    'INSERT INTO notifications (user_id, message, type, link) VALUES ($1, $2, $3, $4)',
    [sonam.id, 'Karma Dorji liked your creation "Sherubtse College Main Campus & Clock Tower"', 'like', 'creation-details.html?id=' + createdPosts[0].id]
  );

  console.log('Database seeded with complete Admin, Analytics, Categories, and Community data successfully.');
}

if (require.main === module) {
  const force = process.argv.includes('--force');
  seedDatabase(force)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
