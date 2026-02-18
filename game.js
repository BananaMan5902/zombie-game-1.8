const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const MAP_WIDTH = 6000;
const MAP_HEIGHT = 6000;

let keys = {};
let mouse = { x: 0, y: 0 };

document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

canvas.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

canvas.addEventListener("mousedown", () => shoot());

/* ================= PLAYER ================= */

let player = {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    radius: 15,
    speed: 3,
    weapon: 0
};

/* ================= WEAPONS ================= */

let weapons = [
    { name: "Pistol", damage: 1, ammo: Infinity, fireRate: 400 },
    { name: "Rifle", damage: 2, ammo: 30, fireRate: 600 },
    { name: "Full-Auto", damage: 1, ammo: 60, fireRate: 100 }
];

let lastShot = 0;

/* ================= GAME ARRAYS ================= */

let bullets = [];
let zombies = [];
let crates = [];
let ammoDrops = [];
let lakes = [];
let rivers = [];
let docks = [];
let houses = [];

let score = 0;
let wave = 1;

/* ================= WORLD GENERATION ================= */

for (let i = 0; i < 40; i++) {
    let h = {
        x: Math.random() * (MAP_WIDTH - 150),
        y: Math.random() * (MAP_HEIGHT - 120),
        w: 120,
        h: 90
    };
    h.doorX = h.x + h.w / 2 - 15;
    h.doorY = h.y + h.h - 12;
    houses.push(h);
}

for (let i = 0; i < 5; i++) {
    lakes.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        radius: 200 + Math.random() * 150
    });
}

for (let i = 0; i < 3; i++) {
    let river = {
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        width: 120,
        length: 1200
    };
    rivers.push(river);

    docks.push({
        x: river.x + river.length / 2 - 40,
        y: river.y - 20,
        w: 80,
        h: 40
    });
}

for (let i = 0; i < 30; i++) {
    crates.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        hp: 3
    });
}

/* ================= ZOMBIES ================= */

function spawnWave() {
    for (let i = 0; i < wave * 5; i++) {

        let type = Math.random();

        let z = {
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            radius: 14,
            hp: 1,
            speed: 1,
            faceType: Math.floor(Math.random() * 3),
            helmet: false
        };

        if (type < 0.6) {
            z.hp = 1;
            z.speed = 1;
        } else if (type < 0.85) {
            z.hp = 4;
            z.speed = 0.8;
            z.helmet = true;
        } else {
            z.hp = 1;
            z.speed = 2;
            z.radius = 10;
        }

        zombies.push(z);
    }
}

spawnWave();

/* ================= HELPERS ================= */

function inWater(x, y) {
    for (let l of lakes)
        if (Math.hypot(x - l.x, y - l.y) < l.radius) return true;

    for (let r of rivers)
        if (x > r.x && x < r.x + r.length &&
            y > r.y && y < r.y + r.width)
            return true;

    return false;
}

function onDock(x, y) {
    for (let d of docks)
        if (x > d.x && x < d.x + d.w &&
            y > d.y && y < d.y + d.h)
            return true;

    return false;
}

/* ================= SHOOTING ================= */

function shoot() {

    let now = Date.now();
    let weapon = weapons[player.weapon];

    if (now - lastShot < weapon.fireRate) return;
    if (weapon.ammo <= 0) return;

    lastShot = now;
    if (weapon.ammo !== Infinity) weapon.ammo--;

    let angle = Math.atan2(
        mouse.y - canvas.height / 2,
        mouse.x - canvas.width / 2
    );

    bullets.push({
        x: player.x,
        y: player.y,
        dx: Math.cos(angle) * 10,
        dy: Math.sin(angle) * 10
    });
}

/* ================= UPDATE ================= */

function update() {

    let speed = player.speed;
    if (inWater(player.x, player.y) && !onDock(player.x, player.y))
        speed = 1.5;

    if (keys["w"]) player.y -= speed;
    if (keys["s"]) player.y += speed;
    if (keys["a"]) player.x -= speed;
    if (keys["d"]) player.x += speed;

    bullets.forEach(b => {
        b.x += b.dx;
        b.y += b.dy;
    });

    zombies.forEach(z => {
        let angle = Math.atan2(player.y - z.y, player.x - z.x);
        z.x += Math.cos(angle) * z.speed;
        z.y += Math.sin(angle) * z.speed;
    });

    bullets.forEach(b => {
        zombies.forEach(z => {
            if (Math.hypot(b.x - z.x, b.y - z.y) < z.radius) {
                z.hp -= weapons[player.weapon].damage;
                b.dead = true;
                if (z.hp <= 0) {
                    z.dead = true;
                    score++;
                }
            }
        });

        crates.forEach(c => {
            if (Math.hypot(b.x - c.x, b.y - c.y) < 20) {
                c.hp--;
                b.dead = true;
                if (c.hp <= 0) {
                    ammoDrops.push({ x: c.x, y: c.y });
                    c.dead = true;
                }
            }
        });
    });

    zombies = zombies.filter(z => !z.dead);
    bullets = bullets.filter(b => !b.dead);
    crates = crates.filter(c => !c.dead);

    ammoDrops.forEach(a => {
        if (Math.hypot(player.x - a.x, player.y - a.y) < 20) {
            weapons[1].ammo += 10;
            weapons[2].ammo += 20;
            a.dead = true;
        }
    });

    ammoDrops = ammoDrops.filter(a => !a.dead);

    if (zombies.length === 0) {
        wave++;
        spawnWave();
    }

    draw();
    requestAnimationFrame(update);
}

/* ================= DRAW ================= */

function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#3f8f3f";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let offsetX = player.x - canvas.width / 2;
    let offsetY = player.y - canvas.height / 2;

    lakes.forEach(l => {
        let lx = l.x - offsetX;
        let ly = l.y - offsetY;
        let grad = ctx.createRadialGradient(lx, ly, 20, lx, ly, l.radius);
        grad.addColorStop(0, "#4fc3f7");
        grad.addColorStop(1, "#0d47a1");
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lx, ly, l.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    houses.forEach(h => {
        let hx = h.x - offsetX;
        let hy = h.y - offsetY;

        let grad = ctx.createLinearGradient(hx, hy, hx, hy + h.h);
        grad.addColorStop(0, "#a05a2c");
        grad.addColorStop(1, "#6d3f1f");

        ctx.fillStyle = grad;
        ctx.fillRect(hx, hy, h.w, h.h);

        ctx.fillStyle = "#3e2723";
        ctx.fillRect(h.doorX - offsetX, h.doorY - offsetY, 30, 15);
    });

    crates.forEach(c => {
        let cx = c.x - offsetX;
        let cy = c.y - offsetY;
        ctx.fillStyle = "#8b5a2b";
        ctx.fillRect(cx - 15, cy - 15, 30, 30);
    });

    zombies.forEach(z => {

        let zx = z.x - offsetX;
        let zy = z.y - offsetY;

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath();
        ctx.ellipse(zx + 3, zy + 6, z.radius, z.radius * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();

        let grad = ctx.createRadialGradient(zx - 4, zy - 4, 2, zx, zy, z.radius);
        grad.addColorStop(0, "#66bb6a");
        grad.addColorStop(1, "#1b5e20");

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(zx, zy, z.radius, 0, Math.PI * 2);
        ctx.fill();

        if (z.helmet) {
            ctx.fillStyle = "#555";
            ctx.beginPath();
            ctx.arc(zx, zy - z.radius / 2, z.radius * 0.9, Math.PI, 0);
            ctx.fill();
        }

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(zx - 4, zy - 3, 2, 0, Math.PI * 2);
        ctx.arc(zx + 4, zy - 3, 2, 0, Math.PI * 2);
        ctx.fill();
    });

    bullets.forEach(b => {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(b.x - offsetX, b.y - offsetY, 3, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = "18px Arial";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Wave: " + wave, 20, 55);
}

update();
