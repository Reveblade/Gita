# Gita design read

Reading this as: a trust-first school operations tool for teachers, with a warm paper and soft clay language, leaning toward a custom token system, Phosphor icons, and a dense sticky duty table.

Dials: `DESIGN_VARIANCE: 3` / `MOTION_INTENSITY: 2` / `VISUAL_DENSITY: 7`

This product is a data table, not a landing page. Do not apply taste-skill or Hallmark marketing layouts (centered heroes, bento grids, marquee type, gradient text, glass cards on the grid).

## Locked choices

- Light paper only. No dark theme.
- Warm stone background, ink text, one school-green accent.
- Soft clay shadow on panels. Glass only on the custom title bar, with a solid fallback for `prefers-reduced-transparency`.
- Source Serif 4 only for the school name. Source Sans 3 for the interface. Both self-hosted, including Latin Extended for Turkish.
- Table cells are flat, hairline, opaque. Day column sticks left. Place headers stick top. Toolbar, title bar, and sidebar do not scroll. The publisher line is not a footer; it opens from the sidebar İletişim item on hover: “Osman YILDIZ, Yıldız Bilişim Sistemleri tarafından geliştirilmiştir.” followed by the Akhisar address and phone.
- Motion is short and turns off under `prefers-reduced-motion`.
- Icons come from `@phosphor-icons/react`. Do not draw SVG paths by hand.
- Copy is Turkish, literal, and specific to nöbet çizelgesi. No marketing slogans.

## Product rules that affect the screen

- One base week. Later weeks are a rotation of duty places, not separate assignments.
- Dragging on the table rewrites that base, so every generated week changes.
- School profiles, teachers, and places live in one JSON file. Switching school happens on the settings page.
