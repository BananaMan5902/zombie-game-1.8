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

let player = {
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    radius: 15,
    speed: 3,
    weapon: 0
};

let weapons = [
    { name: "Pistol", damage: 1, ammo: Infinity, fireRate: 400 },
    { name: "Rifle", damage: 2, ammo: 30, fireRate: 600 },
    { name: "Full-Auto", damage: 1, ammo: 60, fireRate: 100 }
];

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
let lastShot = 0;

/* ========================
   WORLD GENERATION
======================== */

for (let i = 0; i < 40; i++) {
    houses.push({
        x: Math.random() * (MAP_WIDTH - 150),
        y: Math.random() * (MAP_HEIGHT - 120),
        w: 120,
        h: 90,
        doorX: 0,
        doorY: 0
    });
}
houses.forEach(h => {
    h.doorX = h.x + h.w / 2 - 15;
    h.doorY = h.y + h.h - 12;
});

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

/* ========================
   ZOMBIE SPAWNING
======================== */

function spawnWave() {
    for (let i = 0; i < wave * 5; i++) {
        let type = Math.random();
        let z = {
            x: Math.random() * MAP_WIDTH,
            y: Math.random() * MAP_HEIGHT,
            radius: 14,
            hp: 1,
            speed: 1
        };

        if (type < 0.6) {
            z.hp = 1;
            z.speed = 1;
        } else if (type < 0.85) {
            z.hp = 4;
            z.speed = 0.8;
        } else {
            z.hp = 1;
            z.speed = 2;
            z.radius = 10;
        }

        zombies.push(z);
    }
}

spawnWave();

/* ========================
   HELPERS
======================== */

function inWater(x, y) {
    for (let l of lakes) {
        if (Math.hypot(x - l.x, y - l.y) < l.radius) return true;
    }
    for (let r of rivers) {
        if (x > r.x && x < r.x + r.length &&
            y > r.y && y < r.y + r.width)
            return true;
    }
    return false;
}

function onDock(x, y) {
    for (let d of docks) {
        if (x > d.x && x < d.x + d.w &&
            y > d.y && y < d.y + d.h)
            return true;
    }
    return false;
}

/* ========================
   SHOOTING
======================== */

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

/* ========================
   UPDATE LOOP
======================== */

function update() {

    let speed = player.speed;
    if (inWater(player.x, player.y) && !onDock(player.x, player.y)) {
        speed = 1.5;
    }

    if (keys["w"]) player.y -= speed;
    if (keys["s"]) player.y += speed;
    if (keys["a"]) player.x -= speed;
    if (keys["d"]) player.x += speed;

    bullets.forEach(b => {
        b.x += b.dx;
        b.y += b.dy;
    });

    bullets = bullets.filter(b =>
        b.x > 0 && b.x < MAP_WIDTH &&
        b.y > 0 && b.y < MAP_HEIGHT
    );

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

/* ========================
   DRAW
======================== */

function draw() {

    ctx.fillStyle = "#3a7f3a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    let offsetX = player.x - canvas.width / 2;
    let offsetY = player.y - canvas.height / 2;

    lakes.forEach(l => {
        ctx.fillStyle = "#1565c0";
        ctx.beginPath();
        ctx.arc(l.x - offsetX, l.y - offsetY, l.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    rivers.forEach(r => {
        ctx.fillStyle = "#1976d2";
        ctx.fillRect(r.x - offsetX, r.y - offsetY, r.length, r.width);
    });

    docks.forEach(d => {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(d.x - offsetX, d.y - offsetY, d.w, d.h);
    });

    houses.forEach(h => {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(h.x - offsetX, h.y - offsetY, h.w, h.h);
        ctx.fillStyle = "#654321";
        ctx.fillRect(h.doorX - offsetX, h.doorY - offsetY, 30, 15);
    });

    crates.forEach(c => {
        ctx.fillStyle = "#a0522d";
        ctx.fillRect(c.x - offsetX - 15, c.y - offsetY - 15, 30, 30);
    });

    zombies.forEach(z => {
        ctx.fillStyle = "green";
        ctx.beginPath();
        ctx.arc(z.x - offsetX, z.y - offsetY, z.radius, 0, Math.PI * 2);
        ctx.fill();
    });

    bullets.forEach(b => {
        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(b.x - offsetX, b.y - offsetY, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "blue";
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, player.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.fillText("Score: " + score, 20, 30);
    ctx.fillText("Wave: " + wave, 20, 50);
}

update();
