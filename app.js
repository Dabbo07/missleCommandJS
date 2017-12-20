var canvas;
var ctx;

var screenW;
var screenH;

var enemyMissileSpeed = 150;
var enemyMissileWarheadSize = 8;
var enemyMissileColour = "#ffff00";
var playerMissileSpeed = 30;
var playerMissileWarheadSize = 20;
var playerMissileColour = "random";
var totalBases = 5;
var maxMissles = 20;
var ticks = 75;

var missiles = [];
var explosions = [];
var bases = [];
var smokes = [];
var snow = [];

var turretSelector = 1;
var dazzle = 0;
var ammo = 50;
var score = 0;
var gameoverState = 0;
var gameoverTick = 0;
var gameoverWipeSize = 0;
var heloTimer;
var heloSpawnTimeSeconds = 60;
var helo = {
    cx: 300,
    cy: 200,
    rotor: 1,
    rotorTime: 5,
    stage: 0,
    wait: 0
};



function moveMissiles() {
    for (var i = 0; i < missiles.length; i++) {
        var currentMis = missiles[i];
        currentMis.cy = currentMis.cy + currentMis.spdy;
        currentMis.cx = currentMis.cx + currentMis.spdx;

        if (currentMis.cx >= (currentMis.tx - 5) && currentMis.cx <= (currentMis.tx + 5)) {
            if (currentMis.cy >= (currentMis.ty - 5) && currentMis.cy <= (currentMis.ty + 5)) {
                var exp = {
                    cx: currentMis.cx,
                    cy: currentMis.cy,
                    size: 1,
                    sizeDir: 1,
                    warheadSize: currentMis.warheadSize
                };
                explosions.push(exp);
                missiles.splice(i, 1);
            }
        }
    }
    setTimeout(moveMissiles, 100);
};

function collisionCheck(exp) {
    // base check
    var expXmin = exp.cx - exp.size;
    var expXmax = exp.cx + exp.size;
    var expYmin = exp.cy - exp.size;
    var expYmax = exp.cy + exp.size;
    for (var i = 0; i < totalBases; i++) {
        var cb = bases[i];
        if (cb.alive) {
            if ((cb.cx >= expXmin && cb.cx <= expXmax) || ((cb.cx + 20) >= expXmin && (cb.cx + 20) <= expXmax)) {
                if ((cb.cy >= expYmin && cb.cy <= expYmax) || ((cb.cy + 20) >= expYmin && (cb.cy + 20) <= expYmax)) {
                    bases[i].health = bases[i].health - 1;
                    dazzle = 5;
                    if (bases[i].health < 0) {
                        bases[i].health = 0;
                        bases[i].alive = false;
                        dazzle = 25;
                        var smoke = {
                            ox: cb.cx + 12,
                            oy: cb.cy + 10,
                            plumes: [],
                            life: 35
                        };
                        smokes.push(smoke);
                    };
                };
            };
        };
    };
    // Helo check
    if (helo.stage > 0) {
        if (((helo.cx - 8) >= expXmin && (helo.cx - 8) <= expXmax) || ((helo.cx + 10) >= expXmin && (helo.cx + 10) <= expXmax)) {
            if (((helo.cy - 6) >= expYmin && (helo.cy - 6) <= expYmax) || ((helo.cy + 5) >= expYmin && (helo.cy + 5) <= expYmax)) {
                dazzle = 5;
                helo.stage = 0;
                heloTimer = setTimeout(callHelo, (heloSpawnTimeSeconds * 1000));
            };
        };
    };

    // Missle check
    for (var i = 0; i < missiles.length; i++) {
        var ms = missiles[i];
        if ((ms.cx >= expXmin && ms.cx <= expXmax)) {
            if ((ms.cy >= expYmin && ms.cy <= expYmax)) {
                missiles.splice(i, 1);
            };
        };
    };
};

function drawHelo() {
    if (helo.stage > 0) {
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.arc(helo.cx, helo.cy, 3, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.strokeStyle = "#ffffff";
        ctx.moveTo(helo.cx, helo.cy);
        ctx.lineTo((helo.cx + 10), helo.cy);
        ctx.lineTo((helo.cx + 10), (helo.cy - 3));
        ctx.moveTo((helo.cx - 3), (helo.cy + 5));
        ctx.lineTo((helo.cx + 5), (helo.cy + 5));
        
        if (helo.rotor === 1) {
            ctx.moveTo(helo.cx - 8, helo.cy - 6);
            ctx.lineTo(helo.cx + 10, helo.cy - 6);
        };
        helo.rotorTime--;
        if (helo.rotorTime < 1) {
            helo.rotorTime = 12;
            helo.rotor = 1 - helo.rotor;
        };
        
        ctx.stroke();
    };
    var mainBase = Math.ceil(bases.length / 2) - 1;
    var homePos = bases[mainBase].cx + 30;
    switch (helo.stage) {
        case 1:
            helo.cx = helo.cx - 1;
            if (helo.cx < homePos) {
                helo.stage = 2;
                helo.wait = 25;
            };
            break;
        case 2:
            helo.wait = helo.wait - 1;
            if (helo.wait < 1) {
                helo.stage = 3;
            };
            break;
        case 3:
            helo.cy = helo.cy + 1;
            if (helo.cy > (screenH - 22)) {
                helo.stage = 4;
                helo.wait = 800;
            };
            break;
        case 4:
            helo.wait = helo.wait - 1;
            var perc = Math.floor((50 / 800) * (800 - helo.wait));
            if (ammo < perc) {
                ammo++;
            };
            if (helo.wait < 1) {
                helo.stage = 5;
            };
            break;
        case 5:
            helo.cy = helo.cy - 1;
            if (helo.cy < (screenH - 35)) {
                helo.stage = 6;
            };
            break;
        case 6:
            helo.cx = helo.cx - 1;
            helo.cy = helo.cy - 1;
            if (helo.cy < (screenH - 100)) {
                helo.stage = 7;
            };
            break;
        case 7:
            helo.cx = helo.cx - 1;
            if (helo.cx < -20) {
                helo.stage = 0;
                heloTimer = setTimeout(callHelo, (heloSpawnTimeSeconds * 1000));
            };
            break;
    };
};

function callHelo() {
    helo.cy = screenH - 100;
    helo.cx = screenW + 10;
    helo.stage = 1;
};

function drawPage() {
    ctx.fillStyle = "#000000";
    if (dazzle > 0 && Math.random() > .78) {
        ctx.fillStyle = "#ffffff";
        dazzle--;
    };
    ctx.fillRect(0,0,canvas.width, canvas.height);

    // Ground
    ctx.fillStyle = "#00aa00";
    ctx.fillRect(0, screenH - 15, screenW, 20);

    // Ammo count
    ctx.fillStyle = "#0000ff";
    ctx.fillRect((screenW / 2) - 75, screenH - 10, 150, 10);
    var perc = Math.floor((146 / 50) * ammo);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect((screenW / 2) - 73, screenH - 8, perc, 6);

    // Turrent Left
    ctx.beginPath();
    ctx.fillStyle = "#880088";
    ctx.arc(0, screenH, 25, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#660066";
    ctx.arc(0, screenH, 22, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();

    // Turrent Right
    ctx.beginPath();
    ctx.fillStyle = "#880088";
    ctx.arc(screenH, screenW, 25, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = "#660066";
    ctx.arc(screenH, screenW, 22, 0, Math.PI*2, true);
    ctx.closePath();
    ctx.fill();
    
    drawHelo();

    for (var i = 0; i < snow.length; i++) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(snow[i].cx, snow[i].cy, 1, 1);
        snow[i].cy = snow[i].cy + snow[i].sy;
        if (snow[i].cy > (screenH - 22)) {
            snow[i].cy = 1;
            snow[i].cx = (1 + Math.floor(Math.random() * screenW));
            snow[i].sy = (1 + Math.floor(Math.random() * 3));
        };
        if (Math.random() > .76) {
            snow[i].cx = snow[i].cx + (1 + Math.floor(Math.random() * 3));
            if (snow[i].cx > screenW) snow[i].cx = 1;
        };
        if (Math.random() > .76) {
            snow[i].cx = snow[i].cx - (1 + Math.floor(Math.random() * 3));
            if (snow[i].cx < 1) snow[i].cx = screenW;
        };
    };

    for (var i = 0; i < bases.length; i++) {
        if (bases[i].alive) {
            var remain = Math.floor((10 / 100) * bases[i].health);
            var damage = 10 - remain;
            ctx.fillStyle = "#880088";
            ctx.fillRect(bases[i].cx, bases[i].cy, 20, damage);
            ctx.fillStyle = "#ff00ff";
            ctx.fillRect(bases[i].cx, bases[i].cy + damage, 20, remain);
        };
    };

    for (var i = 0; i < missiles.length; i++) {
        var currentMis = missiles[i];
        ctx.beginPath();
        var col = currentMis.colour;
        if (col === 'random') {
            col = "#ffff00";
            if (Math.random() > .8) col = "#ff0000";
            if (Math.random() > .8) col = "#ff00ff";
            if (Math.random() > .8) col = "#ffffff";
            if (Math.random() > .8) col = "#0000ff";
        };
        ctx.strokeStyle = col;
        ctx.moveTo(currentMis.sx, currentMis.sy);
        ctx.lineTo(currentMis.cx, currentMis.cy);
        ctx.stroke();
    };

    for (var i = 0; i < explosions.length; i++) {
        var currentExp = explosions[i];
        ctx.beginPath();
        ctx.fillStyle = "#ff0000";
        if (Math.random() > .9) {
            ctx.fillStyle = "#ffff00";
        };
        ctx.arc(currentExp.cx, currentExp.cy, currentExp.size, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.fill();
        collisionCheck(currentExp);
        currentExp.size = currentExp.size + currentExp.sizeDir;
        if (currentExp.size > currentExp.warheadSize) {
            currentExp.sizeDir = -1;
        };
        if (currentExp.size < 1) {
            explosions.splice(i, 1);
        };
    };

    for (var i = 0; i < smokes.length; i++) {
        var sm = smokes[i];
        for(var a = 0; a < sm.plumes.length; a++) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(160, 160, 160, 0.25)";
            ctx.arc(sm.plumes[a].cx, sm.plumes[a].cy, sm.plumes[a].size, 0, Math.PI*2, true);
            ctx.closePath();
            ctx.fill();
            if (Math.random() > .95) {
                sm.plumes[a].cx = sm.plumes[a].cx + 1;
            };
            if (Math.random() > .7) {
                sm.plumes[a].cy = sm.plumes[a].cy - 1;
                sm.plumes[a].size = 10 - ((9 / 50) * (sm.plumes[a].cy - (sm.oy - 50)));
                if (sm.plumes[a].cy < (sm.oy - 50)) {
                    sm.plumes.splice(a, 1);
                };
            };
        };
        if (sm.plumes.length < sm.life) {
            var smoke = {
                cx: sm.ox,
                cy: sm.oy,
                size: 1
            };
            sm.plumes.push(smoke);
        };
        if (Math.random() > .996) {
            sm.life = sm.life - 1;
            if (sm.life < 0) {
                sm.life = 0;
                if (sm.plumes.length === 0) {
                    smokes.splice(i, 1);
                };
            };
        };
    };


    if (missiles.length < (maxMissles - 2) && Math.random() > .995) {
        spawnEnemyMissile();
    };

    ctx.fillStyle="#0000aa";
    ctx.fillRect((screenW / 2) - 70, 10, 150, 18);
	ctx.fillStyle="#ffffff";
	ctx.font = "10px Verdana";								
	ctx.fillText("Score : " + score, (screenW / 2) - 65, 22);	

    score++;

    var baseCount = 0;
    for (var i = 0; i < bases.length; i++) {
        if (bases[i].alive) baseCount = baseCount + 1;
    };
    if (baseCount > 0) {
        setTimeout(drawPage, 10);
    } else {
        clearTimeout(heloTimer);
        gameoverState = 1;
        gameoverTick = 50;
        setTimeout(drawGameover, 10);
    };
};

function drawGameover() {
    ctx.fillStyle = "#f0f0aa";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.fillStyle="#0000aa";
    ctx.fillRect((screenW / 2) - 70, 10, 150, 18);
	ctx.fillStyle="#ffffff";
	ctx.font = "10px Verdana";								
	ctx.fillText("Score : " + score, (screenW / 2) - 65, 22);	
    
    ctx.fillStyle="#0000ff";
	ctx.font = "28px Verdana";								
    ctx.fillText("G A M E  O V E R", ((screenW / 2) - 120), (screenH / 2));

    if (gameoverState === 1) {
        gameoverTick--;
        if (gameoverTick < 1) {
            gameoverTick = 0;
            gameoverState = 2;
        };
    };

    if (gameoverState > 1) {
        ctx.fillStyle="#aa0000";
        ctx.fillRect((screenW / 2) - 70, screenH - 60, 150, 18);
        ctx.fillStyle="#ffffff";
        ctx.font = "10px Verdana";								
        ctx.fillText("Press FIRE to RESTART", (screenW / 2) - 52, screenH - 48);
    };

    if (gameoverState === 3) {
        gameoverWipeSize = gameoverWipeSize + 5;
        ctx.fillStyle="#000000";
        ctx.fillRect(Math.floor((screenW / 2 ) - gameoverWipeSize), Math.floor((screenH / 2 ) - gameoverWipeSize), (gameoverWipeSize * 2), (gameoverWipeSize * 2));
        if (gameoverWipeSize > (screenH / 2)) {
            gameoverState = 0;
            start();
        };
    };

    if (gameoverState > 0) {
        setTimeout(drawGameover, 100);
    };
};

function spawnEnemyMissile() {
    var target;
    for (var i = 0; i < 100; i++) {
        target = Math.floor(Math.random() * totalBases);
        if (bases[target].alive) break;
    };
    
    var startX = -50 + Math.floor((Math.random() * (screenW + 100)));
    var startY = 0;
    if (startX < 0) {
        startY = -startX;
        startX = 0;
    };
    if (startY > screenW) {
        startY = -startX;
        startX = screenW;
    };
    var offsetX = -5 + Math.floor(Math.random() * 30);
    if (bases[target].alive) {
        createMissile(startX, startY, bases[target].cx + offsetX, bases[target].cy + 5, enemyMissileSpeed, enemyMissileWarheadSize, enemyMissileColour);
    };
};

function createMissile(startX, startY, targX, targY, travelTime, warheadSize, col) {
    var speedY = (targY - startY) / travelTime
    var speedX = (targX - startX) / travelTime

    var mis = {
        sy: startY,
        sx: startX,
        cy: startY,
        cx: startX,
        ty: targY,
        tx: targX,
        spdy: speedY,
        spdx: speedX,
        warheadSize: warheadSize,
        colour: col
    };
    missiles.push(mis);
};

function doMouseDown() {
    canvas_x = event.pageX;
    canvas_y = event.pageY;

    var spawnX = 10;
    var spawnY = screenH - 10;
    turretSelector = 1 - turretSelector;

    if (gameoverState > 1) {
        gameoverState = 3;
    } else {
        if (turretSelector === 1) {
            spawnX = screenW - 10;
        };
        if (ammo > 0 && missiles.length < maxMissles) {
            createMissile(spawnX, spawnY, canvas_x, canvas_y, playerMissileSpeed, playerMissileWarheadSize, playerMissileColour);
            ammo--;
        };
    };
};

function start() {
    canvas = document.getElementById("canvasArea");
    canvas.addEventListener("mousedown", doMouseDown, false);
    
    screenW = canvas.width;
    screenH = canvas.height;

    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // Initialise Game (useful for game restart)
    missiles = [];
    explosions = [];
    bases = [];
    smokes = [];
    snow = [];
    turretSelector = 1;
    dazzle = 0;
    ammo = 50;
    score = 0;
    gameoverState = 0;
    gameoverTick = 0;
    gameoverWipeSize = 0;
    heloSpawnTimeSeconds = 60;
    helo = {
        cx: 300,
        cy: 200,
        rotor: 1,
        rotorTime: 5,
        stage: 0,
        wait: 0
    };

    for (var i = 0; i < 100; i++) {
        var snowflake = {
            cy: (1 + Math.floor(Math.random() * (screenH - 40))),
            cx: (1 + Math.floor(Math.random() * screenW)),
            sy: (1 + Math.floor(Math.random() * 3))
        };
        snow.push(snowflake);
    };

    var deployArea = screenW - 80; // 80 = turrets x 2
    var baseSection = Math.floor(deployArea / totalBases);
    var baseSectionPos = Math.floor((baseSection / 2) - 10);
    var remainder = deployArea - baseSection;
    var leftPadding = 40;

    for (var i = 0; i < totalBases; i++) {
        var newBase = {
            cx: (leftPadding + (baseSection * i) + baseSectionPos),
            cy: (screenH - 20),
            alive: true,
            health: 100
        };
        bases.push(newBase);
    };

    heloTimer = setTimeout(callHelo, (5 * 1000));
    setTimeout(moveMissiles, 100);
    setTimeout(drawPage, 100);
};