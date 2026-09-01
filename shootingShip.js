// scripts/generate-svg.js
// Mengambil data kontribusi GitHub asli (via GraphQL API) lalu men-generate
// SVG animasi: pesawat terbang menyusuri grid kontribusi dan "menembak"
// tiap kotak secara berurutan (efek visual, tidak mengubah data kontribusi).

const fs = require("fs");

const USERNAME = process.env.GH_USERNAME || process.env.GITHUB_REPOSITORY_OWNER;
const TOKEN = process.env.GITHUB_TOKEN;

if (!USERNAME || !TOKEN) {
  console.error("GH_USERNAME / GITHUB_TOKEN tidak ditemukan di environment.");
  process.exit(1);
}

const QUERY = `
  query ($login: String!) {
    user(login: $login) {
      contributionsCollection {
        contributionCalendar {
          weeks {
            contributionDays {
              date
              contributionCount
              color
            }
          }
        }
      }
    }
  }
`;

async function fetchContributions() {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: QUERY, variables: { login: USERNAME } }),
  });

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${await res.text()}`);
  }

  const json = await res.json();
  if (json.errors) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data.user.contributionsCollection.contributionCalendar.weeks;
}

function buildSvg(weeks) {
  const CELL = 11;
  const GAP = 3;
  const STEP = CELL + GAP;
  const PADDING_TOP = 30;
  const PADDING_LEFT = 10;

  const numWeeks = weeks.length;
  const width = PADDING_LEFT * 2 + numWeeks * STEP;
  const height = PADDING_TOP + 7 * STEP + 10;

  // Kumpulkan semua hari dengan koordinat grid-nya
  const days = [];
  weeks.forEach((week, wi) => {
    week.contributionDays.forEach((day, di) => {
      days.push({
        ...day,
        x: PADDING_LEFT + wi * STEP,
        y: PADDING_TOP + di * STEP,
      });
    });
  });

  const totalDays = days.length;
  const TOTAL_DURATION = Math.max(totalDays * 0.06, 4); // detik, minimal 4s
  const perStep = TOTAL_DURATION / totalDays;

  // Path pesawat: melintasi tiap kotak berurutan (kiri->kanan, atas->bawah per minggu)
  const pathPoints = days.map((d) => `${d.x + CELL / 2},${d.y + CELL / 2 - 8}`);
  const motionPath = `M${pathPoints.join(" L")}`;

  // Rects kotak kontribusi
  const rects = days
    .map((d) => {
      return `<rect x="${d.x}" y="${d.y}" width="${CELL}" height="${CELL}" rx="2" ry="2" fill="${d.color}" stroke="rgba(255,255,255,0.04)" />`;
    })
    .join("\n");

  // Efek "ledakan" tiap kotak, muncul terurut sesuai waktu pesawat lewat
  const explosions = days
    .map((d, i) => {
      const begin = (i * perStep).toFixed(3);
      return `
        <circle cx="${d.x + CELL / 2}" cy="${d.y + CELL / 2}" r="1" fill="#ffb703" opacity="0">
          <animate attributeName="r" values="1;9;1" dur="0.28s" begin="${begin}s" fill="freeze" />
          <animate attributeName="opacity" values="0;0.9;0" dur="0.28s" begin="${begin}s" fill="freeze" />
        </circle>`;
    })
    .join("\n");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" font-family="Segoe UI, sans-serif">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#0d1117" rx="6" />
  <text x="${PADDING_LEFT}" y="16" fill="#c9d1d9" font-size="12">${USERNAME}'s contributions — under attack ✈️</text>

  <g>
${rects}
  </g>

  <g>
${explosions}
  </g>

  <text font-size="14" transform="rotate(90)">
    <animateMotion dur="${TOTAL_DURATION}s" repeatCount="indefinite" path="${motionPath}" rotate="auto" />
    ✈
  </text>
</svg>`;

  return svg;
}

(async () => {
  try {
    const weeks = await fetchContributions();
    const svg = buildSvg(weeks);
    fs.mkdirSync("dist", { recursive: true });
    fs.writeFileSync("dist/contribution-shooter.svg", svg, "utf-8");
    console.log("SVG berhasil dibuat: dist/contribution-shooter.svg");
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
