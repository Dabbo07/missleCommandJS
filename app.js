// Missile Command JS
// Darren Edmonds, Dec 2017

var canvas;                                     // Canvas DOM object
var ctx;                                        // 2D context from Canvas object
var screenW;                                    // Width dimension from Canvas (defined from HTML markup)
var screenH;                                    // Height dimension from Canvas (defined from HTML markup)

// -- Game Customisation Configuration --
var enemyMissileSpeed = 150;                    // Speed of incoming missile, higher values are slower.
var enemyMissileWarheadSize = 8;                // Size of explosion (circle), larger circles cause more damage.
var enemyMissileColour = "#ffff00";             // Colour of incoming missing, can be "random" to generate "pulsing" colour effect.
var playerMissileSpeed = 30;                    // Speed of player missile, should be faster than incoming to allow intercepts - lower value means faster
var playerMissileWarheadSize = 20;              // Size of explosion (circle), larger circles cause more damage.
var playerMissileColour = "random";             // Colour of player missile, can be "random" to generate "pulsing" colour effect.
var totalBases = 5;                             // Number of bases to generate, odd numbers are preferred (so we have central base), positions will be calculated.
var maxMissles = 20;                            // Maximum number of missles on screen at any one time - including players, performance setting.
var heloSpawnTimeSeconds = 60;                  // Number of seconds between helicopter spawns.

var missiles = [];                              // Array that holds active missles on the screen, removed when dead.
var explosions = [];                            // Array that holds active explosions animating on the screen, removed when complete.
var bases = [];                                 // Array that holds all base objects
var smokes = [];                                // Array that holds active smoke effects, removed when expired.
var snow = [];                                  // Array that holds snow flake objects, objects are recycled.

var turretSelector = 1;                         // Toggles state between 1 and 0, decides spawn position of player missles (left or right).
var dazzle = 0;                                 // If greater than zero, screen will randomilyt flash white - used to indicate base/helo has been hit.
var ammo = 50;                                  // Number of shots player has available, replenished by helo in game.
var score = 0;                                  // Score, a measure of time the player has survived, increased by 1 per tick.
var gameoverState = 0;                          // Animation state for gameover screen and controls user input and timers.
var gameoverTick = 0;                           // Timeout before "Press FIRE to CONTINUE"
var gameoverWipeSize = 0;                       // The black border wipe animation size
var heloTimer;                                  // Variable to track to current timer to spawn a helo - needs to cleared on game over.
var helo = {                                    // Helocopter object
    cx: 300,                                    // X Co-ordinate
    cy: 200,                                    // Y Co-ordinate
    rotor: 1,                                   // Rotate animation flag, alternates 1/0 (on/off)
    rotorTime: 5,                               // Adds delay to slow down rotor animation to game cycles.
    stage: 0,                                   // Animation stage helicopter is running
    wait: 0                                     // Used to hold the helicopter in a wait state in certain animation stages
};

// Moves incoming missles towards targeted base position and spawn explosion when reached target (no hit detection).
function moveMissiles() {
    for (var i = 0; i < missiles.length; i++) {
        var currentMis = missiles[i];
        currentMis.cy = currentMis.cy + currentMis.spdy;
        currentMis.cx = currentMis.cx + currentMis.spdx;
        // Crude, rectangle hit box checking.
        if (currentMis.cx >= (currentMis.tx - 5) && currentMis.cx <= (currentMis.tx + 5)) {
            if (currentMis.cy >= (currentMis.ty - 5) && currentMis.cy <= (currentMis.ty + 5)) {
                var exp = {
                    cx: currentMis.cx,                      // X Co-ordinate for explosion centre
                    cy: currentMis.cy,                      // Y Co-ordinate for explosion centre
                    size: 1,                                // Size of circle
                    sizeDir: 1,                             // Growth direction of circle (1 - growing or -1 - shrinking)
                    warheadSize: currentMis.warheadSize     // Maximum size to grow to, before shrinking
                };
                explosions.push(exp);                       // Add explosion object to explosion array
                missiles.splice(i, 1);                      // Remove incoming missile (dead) from missle array
            };
        };
    };
    if (gameoverState === 0) {
        setTimeout(moveMissiles, 100);                      // Ensure game is not over before setting up timer call (100ms), prevents multiple calls on game restart
    };
};

function collisionCheck(exp) {
    var expXmin = exp.cx - exp.size;                        // Get explosion min/max dimensions based on size of explosion (rectangle hit box)
    var expXmax = exp.cx + exp.size;
    var expYmin = exp.cy - exp.size;
    var expYmax = exp.cy + exp.size;
    for (var i = 0; i < totalBases; i++) {
        var cb = bases[i];                                  // cb = current base
        if (cb.alive) {
            // Crude rectangle collision box, checking if base dimensions overlap explosion rectangle.
            if ((cb.cx >= expXmin && cb.cx <= expXmax) || ((cb.cx + 20) >= expXmin && (cb.cx + 20) <= expXmax)) {
                if ((cb.cy >= expYmin && cb.cy <= expYmax) || ((cb.cy + 20) >= expYmin && (cb.cy + 20) <= expYmax)) {
                    bases[i].health = bases[i].health - 1;      // Reduce base health by 1 point per tick that explosion overlaps base
                    dazzle = 5;                                 // Set dazzle to last 5 ticks (screen flash)
                    if (bases[i].health < 0) {                  // Check is base health is zero
                        bases[i].health = 0;            
                        bases[i].alive = false;                 // kill base (stop rendering, targeting, etc)
                        dazzle = 25;                            // Flash screen for 25 frames
                        var smoke = {
                            ox: cb.cx + 12,                     // X origin co-ordinate where smoke plumes spawn from
                            oy: cb.cy + 10,                     // y origin co-ordinate where smoke plumes spawn from
                            plumes: [],                         // plume array to hold individual plums (transparent grey circles)
                            life: 35                            // Life of smoke, also maximum number of plumes to spawn at once (more intense -> nothing)
                        };
                        smokes.push(smoke);                     // Add smoke object to smokes array
                    };
                };
            };
        };
    };
    // Helo check
    if (helo.stage > 0) {
        // crude, rectangle collision box, checks if helo rectangle overlaps explosion
        if (((helo.cx - 8) >= expXmin && (helo.cx - 8) <= expXmax) || ((helo.cx + 10) >= expXmin && (helo.cx + 10) <= expXmax)) {
            if (((helo.cy - 6) >= expYmin && (helo.cy - 6) <= expYmax) || ((helo.cy + 5) >= expYmin && (helo.cy + 5) <= expYmax)) {
                dazzle = 5;                                                         // flash screen for 5 framse
                helo.stage = 0;                                                     // reset helo animation (remove from display)
                heloTimer = setTimeout(callHelo, (heloSpawnTimeSeconds * 1000));    // reset spawn timer for helo
            };
        };
    };

    // Missle check
    for (var i = 0; i < missiles.length; i++) {
        var ms = missiles[i];
        // checks missle (single point) is within crude explsion rectangle collision box
        if ((ms.cx >= expXmin && ms.cx <= expXmax)) {
            if ((ms.cy >= expYmin && ms.cy <= expYmax)) {
                missiles.splice(i, 1);                          // Removes missle from missiles array
            };
        };
    };
};

function drawHelo() {
    if (helo.stage > 0) {
        // Draw helo body (circle)
        ctx.beginPath();
        ctx.fillStyle = "#ffffff";
        ctx.arc(helo.cx, helo.cy, 3, 0, Math.PI*2, true);
        ctx.closePath();
        ctx.fill();
        
        // Draw helo tail
        ctx.beginPath();
        ctx.strokeStyle = "#ffffff";
        ctx.moveTo(helo.cx, helo.cy);
        ctx.lineTo((helo.cx + 10), helo.cy);
        ctx.lineTo((helo.cx + 10), (helo.cy - 3));
        ctx.moveTo((helo.cx - 3), (helo.cy + 5));
        ctx.lineTo((helo.cx + 5), (helo.cy + 5));
        
        // Draw helo rotor
        if (helo.rotor === 1) {
            ctx.moveTo(helo.cx - 8, helo.cy - 6);
            ctx.lineTo(helo.cx + 10, helo.cy - 6);
        };

        // Rotor change delay
        helo.rotorTime--;
        if (helo.rotorTime < 1) {
            helo.rotorTime = 12;
            helo.rotor = 1 - helo.rotor;
        };
        ctx.stroke();
    };
    var mainBase = Math.ceil(bases.length / 2) - 1;             // Get middle base ID
    var homePos = bases[mainBase].cx + 30;                      // Get right position from base for helo landing.
    switch (helo.stage) {
        case 1:                                                     // Stage 1: Move helo from right to landing X (homePos)
            helo.cx = helo.cx - 1;
            if (helo.cx < homePos) {
                helo.stage = 2;
                helo.wait = 25;
            };
            break;
        case 2:                                                     // Stage 2: Hover helo for set amount of time
            helo.wait = helo.wait - 1;
            if (helo.wait < 1) {
                helo.stage = 3;
            };
            break;
        case 3:                                                     // Stage 3: Move helo down screen to land on helo pad.
            helo.cy = helo.cy + 1;
            if (helo.cy > (screenH - 22)) {
                helo.stage = 4;
                helo.wait = 800;
            };
            break;
        case 4:                                                     // Stage 4: Make helo wait on landing pad until ammo replenished.
            helo.wait = helo.wait - 1;
            var perc = Math.floor((50 / 800) * (800 - helo.wait));
            if (ammo < perc) {
                ammo++;
            };
            if (helo.wait < 1) {
                helo.stage = 5;
            };
            break;
        case 5:                                                     // Stage 5: Raise helo up a little amount
            helo.cy = helo.cy - 1;
            if (helo.cy < (screenH - 35)) {
                helo.stage = 6;
            };
            break;
        case 6:                                                     // Stage 6: Raise helo diagonally until it reaches exit height.
            helo.cx = helo.cx - 1;
            helo.cy = helo.cy - 1;
            if (helo.cy < (screenH - 100)) {
                helo.stage = 7;
            };
            break;
        case 7:                                                     // Stage 7: Move helo off screen to the left, despawn and reset spawn timer.
            helo.cx = helo.cx - 1;
            if (helo.cx < -20) {
                helo.stage = 0;
                heloTimer = setTimeout(callHelo, (heloSpawnTimeSeconds * 1000));
            };
            break;
    };
};

function callHelo() {
    // Reset helo position and start animation cycle (Stage 1)
    helo.cy = screenH - 100;
    helo.cx = screenW + 10;
    helo.stage = 1;
};

function drawPage() {
    ctx.fillStyle = "#000000";                                                      // BLACK
    if (dazzle > 0 && Math.random() > .78) {                                        // If we are in dazzle mode (>0) then randomily select WHITE
        ctx.fillStyle = "#ffffff";
        dazzle--;
    };
    ctx.fillRect(0,0,canvas.width, canvas.height);                                  // CLEAR Canvas in BLACK/WHITE (above)

    // Draw green rectangle (Ground)
    ctx.fillStyle = "#00aa00";
    ctx.fillRect(0, screenH - 15, screenW, 20);

    // Draw ammo bar
    ctx.fillStyle = "#0000ff";
    ctx.fillRect((screenW / 2) - 75, screenH - 10, 150, 10);
    var perc = Math.floor((146 / 50) * ammo);
    ctx.fillStyle = "#00ffff";
    ctx.fillRect((screenW / 2) - 73, screenH - 8, perc, 6);

    // Turrent Left (circles)
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

    // Turrent Right (circles)
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

    // Draw each snowflake and move them randomily down the screen, reset position if reaching the bottom.
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

    // Draw all the bases (if alive), showing damage
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

    // Draw each missle (and players)
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

    // Draw each explision, random RED/YELLOW colour, check for collisions and control growth/shrinkage.
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

    // Animate Smoke plumes (if any)
    for (var i = 0; i < smokes.length; i++) {
        var sm = smokes[i];
        for(var a = 0; a < sm.plumes.length; a++) {
            ctx.beginPath();
            ctx.fillStyle = "rgba(160, 160, 160, 0.25)";                                            // Coluor grey, transparent 25%
            ctx.arc(sm.plumes[a].cx, sm.plumes[a].cy, sm.plumes[a].size, 0, Math.PI*2, true);
            ctx.closePath();
            ctx.fill();
            if (Math.random() > .95) {
                sm.plumes[a].cx = sm.plumes[a].cx + 1;                                              // Move smoke plume right, randomily
            };
            if (Math.random() > .7) {
                sm.plumes[a].cy = sm.plumes[a].cy - 1;                                              // Move smoke upwards randomily
                sm.plumes[a].size = 10 - ((9 / 50) * (sm.plumes[a].cy - (sm.oy - 50)));             // Increase size of plume based on height
                if (sm.plumes[a].cy < (sm.oy - 50)) {
                    sm.plumes.splice(a, 1);                                                         // Kill plume if maximum height reached
                };
            };
        };
        // Check is we have enough room to spawn another smoke plume, based on remaining life.
        if (sm.plumes.length < sm.life) {
            var smoke = {
                cx: sm.ox,
                cy: sm.oy,
                size: 1
            };
            sm.plumes.push(smoke);              // Add plume to smoke object.
        };
        if (Math.random() > .996) {
            // Randomily decreae lifespan of smoke
            sm.life = sm.life - 1;
            if (sm.life < 0) {
                sm.life = 0;
                if (sm.plumes.length === 0) {
                    smokes.splice(i, 1);        // Remove smoke object from smokes when dead.
                };
            };
        };
    };

    // if we have room for more missins, randomily spawn another one.    
    if (missiles.length < (maxMissles - 2) && Math.random() > .995) {
        spawnEnemyMissile();
    };

    // Draw blue box and score text on screen (top middle position)
    ctx.fillStyle="#0000aa";
    ctx.fillRect((screenW / 2) - 70, 10, 150, 18);
	ctx.fillStyle="#ffffff";
	ctx.font = "10px Verdana";								
	ctx.fillText("Score : " + score, (screenW / 2) - 65, 22);	

    // increase score per tick.
    score++;

    // Cound alive bases
    var baseCount = 0;
    for (var i = 0; i < bases.length; i++) {
        if (bases[i].alive) baseCount = baseCount + 1;
    };
    // if we still have bases, continume came loop by setting timeoout.
    if (baseCount > 0) {
        setTimeout(drawPage, 10);
    } else {
        // No more bases, game over!
        clearTimeout(heloTimer);                // Stop helo from spawning
        gameoverState = 1;                      // Start game over cycle
        gameoverTick = 50;                      // Set wait time for restart of game to activate
        setTimeout(drawGameover, 10);           // Start gameover timer
    };
};

function drawGameover() {
    // Clear canvase with pale yellow
    ctx.fillStyle = "#f0f0aa";
    ctx.fillRect(0,0,canvas.width, canvas.height);
    // Display blue box with score value
    ctx.fillStyle="#0000aa";
    ctx.fillRect((screenW / 2) - 70, 10, 150, 18);
	ctx.fillStyle="#ffffff";
	ctx.font = "10px Verdana";								
	ctx.fillText("Score : " + score, (screenW / 2) - 65, 22);	
    
    // Display GAMEOVER text in middle of canvas
    ctx.fillStyle="#0000ff";
	ctx.font = "28px Verdana";								
    ctx.fillText("G A M E  O V E R", ((screenW / 2) - 120), (screenH / 2));

    // if waiting, decrease tick and then move to next cycle.
    if (gameoverState === 1) {
        gameoverTick--;
        if (gameoverTick < 1) {
            gameoverTick = 0;
            gameoverState = 2;
        };
    };

    if (gameoverState > 1) {
        // Prompt user that a new game can start, red background.
        ctx.fillStyle="#aa0000";
        ctx.fillRect((screenW / 2) - 70, screenH - 60, 150, 18);
        ctx.fillStyle="#ffffff";
        ctx.font = "10px Verdana";								
        ctx.fillText("Press FIRE to RESTART", (screenW / 2) - 52, screenH - 48);
    };

    if (gameoverState === 3) {
        // Animate ectangle balck wipe
        gameoverWipeSize = gameoverWipeSize + 5;
        ctx.fillStyle="#000000";
        ctx.fillRect(Math.floor((screenW / 2 ) - gameoverWipeSize), Math.floor((screenH / 2 ) - gameoverWipeSize), (gameoverWipeSize * 2), (gameoverWipeSize * 2));
        if (gameoverWipeSize > (screenH / 2)) {
            // Wipe complete, reset game variable and start game.
            gameoverState = 0;
            start();
        };
    };

    if (gameoverState > 0) {
        // Call itself until game restarted.
        setTimeout(drawGameover, 100);
    };
};

function spawnEnemyMissile() {
    var target;
    // Attempt to find an alive base 100 times before giving up.
    for (var i = 0; i < 100; i++) {
        target = Math.floor(Math.random() * totalBases);
        if (bases[target].alive) break;
    };
    
    // Set random spawn positon, any co-ord outside of width of canvas will spawn from the edges and move down the screen instead.
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
    // Ensure we randomily choose a postion near or on the base position.
    var offsetX = -5 + Math.floor(Math.random() * 30);
    if (bases[target].alive) {
        // Create a new missle if base is alive.
        createMissile(startX, startY, bases[target].cx + offsetX, bases[target].cy + 5, enemyMissileSpeed, enemyMissileWarheadSize, enemyMissileColour);
    };
};

function createMissile(startX, startY, targX, targY, travelTime, warheadSize, col) {
    var speedY = (targY - startY) / travelTime
    var speedX = (targX - startX) / travelTime

    // initialise missile object
    var mis = {
        sy: startY,                                 // Origin Y position
        sx: startX,                                 // Origin X postion
        cy: startY,                                 // Current Y position
        cx: startX,                                 // Current X position
        ty: targY,                                  // Destination Y position
        tx: targX,                                  // Destination X position
        spdy: speedY,                               // Speed of Y direction
        spdx: speedX,                               // Speed of X direction
        warheadSize: warheadSize,                   // Size of explosion if detonated
        colour: col                                 // Colour of line
    };
    missiles.push(mis);                             // Add missle object to array
};

// Mouse event function
function doMouseDown() {
    canvas_x = event.pageX;                         // Captures X co-ordinate of mouse position
    canvas_y = event.pageY;                         // Captures Y co-ordinate of mouse position

    var spawnX = 10;
    var spawnY = screenH - 10;
    turretSelector = 1 - turretSelector;

    if (gameoverState === 2) {
        // If gameoverState is 2, (listening for player click) then restart game by setting state to 3 (screen wipe)
        gameoverState = 3;
    } else {
        // Mid game player click.
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
    ctx.imageSmoothingEnabled = false;                              // Not used? Used to remove graphic issues at start of development.

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

    // Spawn snowflakes as random positions.
    for (var i = 0; i < 100; i++) {
        var snowflake = {
            cy: (1 + Math.floor(Math.random() * (screenH - 40))),
            cx: (1 + Math.floor(Math.random() * screenW)),
            sy: (1 + Math.floor(Math.random() * 3))
        };
        snow.push(snowflake);
    };

    // Calculate base positions
    var deployArea = screenW - 80; // 80 = turrets x 2
    var baseSection = Math.floor(deployArea / totalBases);
    var baseSectionPos = Math.floor((baseSection / 2) - 10);
    var remainder = deployArea - baseSection;
    var leftPadding = 40;

    // Create bases in correct positions based on screen dimensions.
    for (var i = 0; i < totalBases; i++) {
        var newBase = {
            cx: (leftPadding + (baseSection * i) + baseSectionPos),
            cy: (screenH - 20),
            alive: true,
            health: 100
        };
        bases.push(newBase);
    };

    heloTimer = setTimeout(callHelo, (5 * 1000));                       // Start helo spawn timer
    setTimeout(moveMissiles, 100);                                      // Start moving missiles
    setTimeout(drawPage, 100);                                          // Start main page draw
};