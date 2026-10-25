const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

async function run() {
  const imagesDir = path.join(__dirname, 'public', 'images');
  const artifactDir = path.join('C:', 'Users', 'dell', '.gemini', 'antigravity-ide', 'brain', 'e0bda26c-239e-456a-b53b-b7f1fbc61ed0');

  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  require('dotenv').config();

  // URLs
  const wifiUrl = 'http://172.16.128.73:3000';
  const customArg = process.argv[2];
  // Default to campus WiFi IP if localhost is set, so real smartphones can open the app
  const primaryUrl = customArg || (process.env.APP_URL && !process.env.APP_URL.includes('localhost') ? process.env.APP_URL : wifiUrl);
  const localUrl = 'http://localhost:3000';
  const githubUrl = 'https://github.com/dekit927-dev/Creative-Hub';

  const brandNavy = '#1E3A8A'; // CreativeHub Navy
  const brandRoyal = '#2563EB'; // CreativeHub Royal Blue

  console.log(`Generating QR codes for primary URL: ${primaryUrl}`);

  // 1. High-Res PNG (1200x1200px) in Navy Blue
  const mainNavyPng = path.join(imagesDir, 'creativehub_qr_main.png');
  await QRCode.toFile(mainNavyPng, primaryUrl, {
    errorCorrectionLevel: 'H',
    type: 'png',
    quality: 1,
    margin: 3,
    width: 1200,
    color: { dark: brandNavy, light: '#FFFFFF' }
  });
  console.log('Created:', mainNavyPng);

  // 2. High-Res PNG in Royal Blue
  const royalPngPath = path.join(imagesDir, 'creativehub_qr_royal.png');
  await QRCode.toFile(royalPngPath, primaryUrl, {
    errorCorrectionLevel: 'H',
    type: 'png',
    quality: 1,
    margin: 3,
    width: 1200,
    color: { dark: brandRoyal, light: '#FFFFFF' }
  });
  console.log('Created:', royalPngPath);

  // 3. Crisp Vector SVG (ideal for Canva / Figma / Illustrator / high-res poster prints)
  const svgPath = path.join(imagesDir, 'creativehub_qr_main.svg');
  const svgString = await QRCode.toString(primaryUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 2,
    color: { dark: brandNavy, light: '#FFFFFF' }
  });
  fs.writeFileSync(svgPath, svgString, 'utf8');
  console.log('Created:', svgPath);

  // 4. Localhost PNG
  const localPngPath = path.join(imagesDir, 'creativehub_qr_localhost.png');
  await QRCode.toFile(localPngPath, localUrl, {
    errorCorrectionLevel: 'H',
    width: 1200,
    margin: 3,
    color: { dark: '#0F172A', light: '#FFFFFF' }
  });

  // 5. GitHub Repo PNG
  const githubPngPath = path.join(imagesDir, 'creativehub_qr_github.png');
  await QRCode.toFile(githubPngPath, githubUrl, {
    errorCorrectionLevel: 'H',
    width: 1200,
    margin: 3,
    color: { dark: brandNavy, light: '#FFFFFF' }
  });

  // 6. Complete Branded QR Standee / Poster Card SVG
  const qrInnerSvg = await QRCode.toString(primaryUrl, {
    type: 'svg',
    errorCorrectionLevel: 'H',
    margin: 0,
    color: { dark: '#1E3A8A', light: '#FFFFFF' }
  });

  const displayUrl = primaryUrl.replace(/^https?:\/\//, '');

  const brandedCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800" width="600" height="800" font-family="'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif">
  <defs>
    <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1E3A8A" />
      <stop offset="50%" stop-color="#2563EB" />
      <stop offset="100%" stop-color="#3B82F6" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="10" stdDeviation="20" flood-color="#1E3A8A" flood-opacity="0.12" />
    </filter>
  </defs>

  <!-- Background Base -->
  <rect width="600" height="800" rx="36" fill="#F8FAFC" />
  <rect x="2" y="2" width="596" height="796" rx="34" fill="none" stroke="#DBEAFE" stroke-width="3" />

  <!-- Gradient Header -->
  <rect x="0" y="0" width="600" height="175" rx="36" fill="url(#headerGrad)" />
  <rect x="0" y="145" width="600" height="30" fill="url(#headerGrad)" />

  <!-- Header Texts -->
  <text x="300" y="52" text-anchor="middle" fill="#93C5FD" font-size="13" font-weight="700" letter-spacing="3">SHERUBTSE CREATIVE COMMUNITY</text>
  <text x="300" y="104" text-anchor="middle" fill="#FFFFFF" font-size="36" font-weight="800" letter-spacing="-0.5">CreativeHub</text>
  <text x="300" y="138" text-anchor="middle" fill="#E0F2FE" font-size="15" font-weight="500">Together, We Build a Creative Community</text>

  <!-- QR Code White Card Container -->
  <g filter="url(#cardShadow)">
    <rect x="100" y="200" width="400" height="400" rx="28" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />
  </g>

  <!-- Rendered QR Code Inside -->
  <g transform="translate(138, 238) scale(0.835)">
    ${qrInnerSvg.replace(/<svg[^>]*>|<\/svg>/g, '')}
  </g>

  <!-- Center Branded CreativeHub 'C' Pin -->
  <circle cx="300" cy="400" r="28" fill="#FFFFFF" filter="url(#cardShadow)" />
  <circle cx="300" cy="400" r="23" fill="#2563EB" />
  <text x="300" y="410" text-anchor="middle" fill="#FFFFFF" font-size="22" font-weight="800">C</text>

  <!-- Action Pill Button -->
  <rect x="180" y="625" width="240" height="44" rx="22" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1.5" />
  <text x="300" y="653" text-anchor="middle" fill="#1D4ED8" font-size="14" font-weight="700" letter-spacing="1">SCAN WITH PHONE</text>

  <!-- Value Proposition & URL -->
  <text x="300" y="705" text-anchor="middle" fill="#0F172A" font-size="17" font-weight="700">Art • Photography • Writing • Music • Collaboration</text>
  <text x="300" y="734" text-anchor="middle" fill="#64748B" font-size="14">Open camera and point at QR code</text>
  <text x="300" y="762" text-anchor="middle" fill="#2563EB" font-size="13" font-weight="600">${displayUrl}</text>
</svg>`;

  const brandedCardPath = path.join(imagesDir, 'creativehub_qr_badge.svg');
  fs.writeFileSync(brandedCardPath, brandedCardSvg, 'utf8');
  console.log('Created:', brandedCardPath);

  // Copy all assets to artifact directory
  if (fs.existsSync(artifactDir)) {
    const filesToCopy = [
      'creativehub_qr_main.png',
      'creativehub_qr_royal.png',
      'creativehub_qr_main.svg',
      'creativehub_qr_localhost.png',
      'creativehub_qr_github.png',
      'creativehub_qr_badge.svg'
    ];
    for (const f of filesToCopy) {
      const src = path.join(imagesDir, f);
      const dest = path.join(artifactDir, f);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dest);
      }
    }
    console.log('All files mirrored to artifact directory.');
  }

  console.log('Finished successfully!');
}

run().catch(console.error);
