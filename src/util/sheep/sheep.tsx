import { useRef, useEffect, useState } from "react";

// game defaults
let fieldWidth = 1600;
let fieldHeight = 1600;
let backgroundColor = "darkgreen";
let fieldColor = "#9ECB91";

const enemySeparationMult = 2.5;
const separationStrength = 50;

const sheepImg = new Image();
sheepImg.src = "/sheep/sheep.png";
const wolfImg = new Image();
wolfImg.src = "/sheep/wolf.png";
const warningImg = new Image();
warningImg.src = "/sheep/warning.png";
const mushroomImg = new Image();
mushroomImg.src = "/sheep/mushroom.png";
const knifeImg = new Image();
knifeImg.src = "/sheep/knife.png";
const beeImg = new Image();
beeImg.src = "/sheep/bee.png";
const stingerImg = new Image();
stingerImg.src = "/sheep/stinger.png";
const hogImg = new Image();
hogImg.src = "/sheep/hog.png";

const sheepWithKnife = new Image();
sheepWithKnife.src = "/sheep/sheep_with_knife.png";
const sheepWithShoes = new Image();
sheepWithShoes.src = "/sheep/sheep_with_shoes.png";
const adrenaline = new Image();
adrenaline.src = "/sheep/adrenaline.png";
const extraWool = new Image();
extraWool.src = "/sheep/extra_wool.png";
const biggerEyes = new Image();
biggerEyes.src = "/sheep/bigger_eyes.png";
const shield = new Image();
shield.src = "/sheep/shield.png";
const lucky = new Image();
lucky.src = "/sheep/lucky.png";

let paused = false;
let attackSpeed = 1;
let movementSpeed = 1;
let range = 1;
let luck = 0.10;

export default function Sheep() {
  const scoreRef = useRef<HTMLParagraphElement | null>(null);
  const [startGame, setStartGame] = useState<Boolean>(false);
  useEffect(()=>{
    const scoreElement = scoreRef.current;
    if (!scoreElement) return;
    const topScore = `${Math.round(Number(localStorage.getItem("topScore") ?? 0))} seconds`;
    scoreElement.textContent = topScore;
  }, [startGame]);
  
  return <>
    { startGame 
    ? 
    <Game setStartGame={setStartGame} startGame={startGame}/>
    : 
    <div className="w-screen h-screen flex flex-col items-center justify-center">
      <h1 className="text-[2vw] font-bold">Sheep Survival</h1>
      <button onClick={() => {setStartGame(true)}} className="text-[2vw] hover:text-cyan-400">
        start
      </button>
      <div className="text-[1.5vw] flex flex-row space-x-2">
        <p className="font-bold">best: </p> <p ref={scoreRef}></p>
      </div>
    </div>
    }
  </>
}

const outOfBounds = (pos: number[], bounds: number[]): boolean => {
  return !(bounds[0] <= pos[0] && pos[0] <= bounds[2] && bounds[1] <= pos[1] && pos[1] <= bounds[3]);
}

type Setter<T> = React.Dispatch<T>;
function Game({setStartGame, startGame}: {setStartGame: Setter<Boolean>, startGame: Boolean}){
  console.log(`Game() invoc`);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [showUpgrades, setShowUpgrades] = useState<boolean>(false);
  // something-something re-rendering
  const playerRef = useRef<Player | null>(null);
  if (playerRef.current === null) playerRef.current = new Player([0, 0]);
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const mushroomsRef = useRef<Mushroom[]>([]);
  // upgrades
  const upgradesRef = useRef<Upgrade[]>([]);
  if (upgradesRef.current && upgradesRef.current.length === 0){
    upgradesRef.current = [
      new Upgrade(1, "+1 knife", '"who gave it a knife?"', sheepWithKnife, () => {playerRef.current!.addWeapon()}),
      new Upgrade(1, "shield (R to activate)", "can't touch this", shield, () => {playerRef.current!.hasShield = true;}),
      new Upgrade(0, "+10% attack speed", "adrenaline", adrenaline, () => {attackSpeed += 0.1}),
      new Upgrade(0, "+10% movement speed", "shoes", sheepWithShoes, () => {movementSpeed += 0.1}),
      new Upgrade(0, "+2 max health", "thicker wool", extraWool, () => {playerRef.current!.maxHealth += 2; playerRef.current!.health += 2}),
      new Upgrade(0, "+10% range", "bigger eyes", biggerEyes, () => {range += 0.1}),
      new Upgrade(0, "+luck", "4-leaf clover", lucky, () => {luck = Math.min(luck + 0.05, 1)}),
    ];
  };
  const upgrades = upgradesRef.current;
  useEffect(() => {
    if (!canvasRef) throw new Error(`No canvasRef`);
    const canvas = canvasRef.current;
    if (!canvas) throw new Error(`No canvas`);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(`Couldn't get canvas 2D context`);
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const gapX = (canvas.width - fieldWidth) / 2; 
    const gapY = (canvas.height - fieldHeight) / 2;
    let cameraBounds = [-fieldWidth / 2, -fieldHeight / 2, fieldWidth / 2, fieldHeight / 2];
    let bounds = [gapX, gapY, canvas.width - gapX, canvas.height - gapY];
    // mnemonics
    const player = playerRef.current
    if (!player) throw new Error(`Player object is unexpectedly null`);
    player.pos = [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)];
    const enemies = enemiesRef.current;
    const projectiles = projectilesRef.current;
    const mushrooms = mushroomsRef.current;

    let animId: number;
    let lastTime: number | null = null;
    let elapsedTime = 0;
    let lastBossSpawn = 0;
    let bossSpawnCooldown = 60;
    let enemySpawnCooldown = 4;
    let enemySpawnTimer = 0;
    let camera = [0, 0];

    // listeners
    const keys = new Set<string>();
    window.addEventListener("keydown", (e) => {
      keys.add(e.key.toLowerCase());
    });
    window.addEventListener("keyup", (e) => {
      keys.delete(e.key.toLowerCase());
    })
    window.addEventListener("keydown", (e) => {
      if (e.key === "p"){
        for (let i=0;i<10;i++){
          enemies.push(new Hog(bounds));
        }
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) lastTime = null;
    });

    // game logic
    const gameLoop = (time: DOMHighResTimeStamp) => {
      if (lastTime === null){
        lastTime = time
      }

      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;
      elapsedTime += dt;

      update(dt);
      render();

      animId = requestAnimationFrame(gameLoop);
    };

    const gameOver = () => {
      const priorTopScore = Number(localStorage.getItem('topScore') ?? 0);
      localStorage.setItem('topScore', `${Math.max(elapsedTime, priorTopScore)}`);
      setStartGame(false);
    }
    const update = (dt: number) => {
      if (paused) return;
      // collisions
      // player hurt by collision with enemy
      for (const enemy of enemies){
        if (player.state === "shield" || player.invincibilityTimer > 0) break;
        const dist = Math.hypot(player.pos[0] - enemy.pos[0], player.pos[1] - enemy.pos[1]);
        if (dist > player.radius + enemy.radius) continue;
        player.applyDamage(enemy.damage, gameOver);
      }
      // player hurt by collision with projectile
      for (const projectile of projectiles){
        if (player.state === "shield" || player.invincibilityTimer > 0) break;
        const dist = Math.hypot(projectile.pos[0] - player.pos[0], projectile.pos[1] - player.pos[1]);
        if (dist > player.radius + projectile.radius) continue;
        player.applyDamage(projectile.damage, gameOver);
      }
      // weapon damage enemies
      for (const enemy of enemies){
        if (enemy.state === "spawning") continue;
        for (const weapon of player.weapons){
          if (weapon.enemiesHit.has(enemy)) continue;
          const weaponPos = weapon.getGlobalPos();          
          const dist = Math.hypot(enemy.pos[0] - weaponPos[0], enemy.pos[1] - weaponPos[1]);
          if (dist > enemy.radius) continue;
          enemy.applyDamage(weapon.damage);
          weapon.enemiesHit.add(enemy);
        }
      }
      // enemies die
      for (let i = 0; i < enemies.length; i += 1){
        const enemy = enemies[i];
        if (enemy.health === 0){
          // spawn a mushroom on enemy death
          if (Math.random() <= luck){
            spawnMushroom(enemy.pos);
          }
          enemies.splice(i, 1);
        }
      }
      // out-of-bound projectiles
      for (let i = 0; i < projectiles.length; i++){
        const projectile = projectiles[i];
        if (outOfBounds(projectile.pos, bounds)){
          projectiles.splice(i, 1);
        }
      }
      // mushroom pickup
      for (let i = 0; i < mushrooms.length; i++){
        const mushroom = mushrooms[i];
        const dist = Math.hypot(player.pos[0] - mushroom.pos[0], player.pos[1] - mushroom.pos[1]);
        if (dist > player.radius + mushroom.radius) continue;
        // player.applyShield();
        mushrooms.splice(i, 1);
        setShowUpgrades(true);
        paused = true;
        break;
      }
      // movement
      player.update(keys, dt, bounds, camera, cameraBounds);
      for (const projectile of projectiles){
        projectile.update(dt);
      }
      for (const weapon of player.weapons){
        weapon.update(enemies, dt);
      }
      for (const enemy of enemies){
        enemy.update(player, dt, enemies, bounds, projectiles);
      }
      // spawning enemies
      enemySpawnTimer -= dt;
      if (enemySpawnTimer <= 0){
        // spawnEnemy();
        enemySpawnTimer = enemySpawnCooldown;
        enemySpawnCooldown = Math.max(enemySpawnCooldown * 0.95, 1.5);
      }
      // boss
      if (elapsedTime - lastBossSpawn >= bossSpawnCooldown){
        enemies.push(new Hog(bounds));
        bossSpawnCooldown = Math.max(bossSpawnCooldown - 5, 60);
        lastBossSpawn = elapsedTime;
      }
    }

    const spawnMushroom = (pos: number[]) => {
      const mushroom = new Mushroom(pos, bounds);
      mushrooms.push(mushroom);
    }

    const spawnEnemy = () => {
      let spawned;
      if (Math.random() >= 0.2){
        spawned = new Wolf(bounds);
      } else{
        spawned = new Bee(bounds);
      }
      enemies.push(spawned);
    }

    // debug hog
    // enemies.push(new Hog(bounds));

    const render = () => {
      ctx.font = `42px sans-serif`;
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = fieldColor;
      ctx.fillRect(bounds[0] + camera[0], bounds[1] + camera[1], fieldWidth, fieldHeight);
      const timestamp: string = `Not mutton for ${Math.floor(elapsedTime)} seconds`;
      ctx.fillStyle = "white";
      ctx.fillText(timestamp, 25, 125);

      for (const mushroom of mushrooms){
        mushroom.render(ctx, camera);
      }
      for (const projectile of projectiles){
        projectile.render(ctx, camera);
      }
      for (const enemy of enemies){
        enemy.render(ctx, camera);
      }
      player.render(ctx, camera);
      for (const weapon of player.weapons){
        weapon.render(ctx, camera);
      }
      // render player health bar
      const healthText = `${player.health}/${player.maxHealth}`;
      ctx.fillStyle = "white";
      ctx.fillText(healthText, 450, 65);
      ctx.fillStyle = "white";
      ctx.fillRect(25, 25, 400, 50);
      ctx.fillStyle = "red";
      ctx.fillRect(25, 25, (player.health / player.maxHealth) * 400, 50);
    }

    // start game loop
    animId = requestAnimationFrame(gameLoop)

    // clean-up
    return () => {
      cancelAnimationFrame(animId);
    }
  }, [startGame]);

  return <>
    <canvas ref={canvasRef} style={{
      display: 'block', 
      width: '100vw',
      height: '100vh',
      margin: 0,
    }}/>
    <Abilities player={playerRef.current!}/>
    {showUpgrades ? <PickUpgrade upgrades={upgrades} setShowUpgrades={setShowUpgrades}/> : <></>}
  </>
}

function Abilities({player}: {player: Player}){
  const [, update] = useState(0);
  useEffect(()=>{
    const id = setInterval(() => {
      update(x => (x + 1) % 4);
    }, 100);
    return () => clearInterval(id);
  }, []);
  const imgContainer = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const container = imgContainer.current;
    if (!container) return;
    container.innerHTML = '';
    container.appendChild(shield);
  }, []);
  return <div className="fixed left-0 bottom-0">

    {/* { player.hasShield && 
      <div className="w-42 h-42 bg-gray-600 rounded-xl shadow-xl">
        <div ref={imgContainer}/>
      </div>
    } */}
  </div>
}

function PickUpgrade({upgrades, setShowUpgrades}: {upgrades: Upgrade[], setShowUpgrades: Setter<boolean>}){
  const pickRandom = (ups: Upgrade[]): Upgrade[] => {
    // fisher-yates shuffle - random shuffle, pick first three - I didn't write this
    return [...ups].sort(() => 0.5 - Math.random()).slice(0, 3);
  } 
  const commons = upgrades.filter(upgrade => upgrade.rarity === 0);
  const rolledUpgrades: Upgrade[] = pickRandom((Math.random() >= luck) ? commons : upgrades);
  return <div className="fixed top-0 w-screen h-screen flex flex-row p-20 bg-green-800 gap-16 justify-center items-center">
    {rolledUpgrades.map((upgrade, index) => 
      <UpgradePanel upgrade={upgrade} setShowUpgrades={setShowUpgrades} key={index}/>
    )}
  </div>
}

function UpgradePanel({upgrade, setShowUpgrades}: {upgrade: Upgrade, setShowUpgrades: Setter<boolean>}){
  const imgContainer = useRef<HTMLDivElement | null>(null);

  const selectUpgrade = () => {
    upgrade.select();
    setShowUpgrades(false);
    paused = false;
  }

  useEffect(() => {
    const container = imgContainer.current;
    if (!container) throw new Error(`Could not get upgrade image container`);
    container.innerHTML = '';
    container.appendChild(upgrade.img);
  }, []);
  return <div onClick={selectUpgrade} style={{backgroundColor: `${(upgrade.rarity) ? `yellow` : `white`}`}} className="w-1/3 h-1/2 rounded-xl shadow-xl flex flex-col items-center justify-center hover:scale-105">
    <div ref={imgContainer}/>
    <div className="text-2xl">{upgrade.desc}</div>    
    <div className="text-3xl font-bold">{upgrade.name}</div>
  </div>
}

const applyVelocity = (pos: number[], vel: number[], bounds: number[], radius: number) => {
  pos[0] += vel[0]
  pos[1] += vel[1]
  pos[0] = Math.min(Math.max(pos[0], Math.floor(radius + bounds[0])), bounds[2] - radius);
  pos[1] = Math.min(Math.max(pos[1], Math.floor(radius + bounds[1])), bounds[3] - radius);
}

type PlayerState = "default" | "shield";
class Player{
  pos: number[];
  vel: number[];
  speed: number = 500;
  radius: number = 40;
  color: string = "white";
  state: PlayerState = "default";
  maxHealth: number = 5;
  health: number = this.maxHealth;
  invincibilityDuration = 0.5;
  invincibilityTimer = 0;
  // shield
  hasShield: boolean = true;
  shieldCooldown: number = 0;
  shieldCooldownDuration: number = 8;
  shieldDuration: number = 3;
  shieldTimer: number = 0;
  // weapons
  weapons: Weapon[] = [];
  weaponDist: number = 60;

  constructor(initPos: number[], initVel: number[] = [0, 0]){
    this.pos = initPos;
    this.vel = initVel;

    this.addWeapon()
  }

  update(keys: Set<string>, dt: number, bounds: number[], camera: number[], cameraBounds: number[]){
    switch (this.state){
      case "shield":
        this.shieldTimer = Math.max(this.shieldTimer - dt, 0);
        if (this.shieldTimer <= 0){
          this.shieldCooldown = this.shieldCooldownDuration;
          this.state = "default";
        }
        break;
      case "default":
        this.shieldCooldown = Math.max(this.shieldCooldown - dt, 0);  
        break;
    }
    this.invincibilityTimer = Math.max(this.invincibilityTimer - dt, 0);
    this.vel = [0, 0];
    if (keys.has("ArrowRight") || keys.has("d")) this.vel[0] = 1;
    if (keys.has("ArrowLeft") || keys.has("a")) this.vel[0] = -1;
    if (keys.has("ArrowDown") || keys.has("s")) this.vel[1] = 1;
    if (keys.has("ArrowUp") || keys.has("w")) this.vel[1] = -1;

    if (keys.has("r") && this.hasShield && this.shieldCooldown === 0) this.applyShield();
    const length = Math.hypot(this.vel[0], this.vel[1]);
    if (length > 0) {  // normalize vel vector
      this.vel[0] /= length;
      this.vel[1] /= length;
    }
    this.vel[0] *= this.speed * movementSpeed * dt;
    this.vel[1] *= this.speed * movementSpeed * dt;
    applyVelocity(this.pos, this.vel, bounds, this.radius);
    applyVelocity(camera, [-this.vel[0], -this.vel[1]], cameraBounds, this.radius);
    // move the weapon with the player
    for (const weapon of this.weapons){
      weapon.pos = this.pos;
    }
  }

  applyShield(){
    this.shieldTimer = this.shieldDuration;
    this.state = "shield";
  }

  addWeapon(){
    if (this.weapons.length >= 6) throw new Error(`Too many weapons`);
    const angle = (this.weapons.length * 60) * (Math.PI / 180);
    const offset = [Math.cos(angle) * this.weaponDist, Math.sin(angle) * this.weaponDist];
    const newWeapon = new Weapon([this.pos[0], this.pos[1]], offset);
    this.weapons.push(newWeapon);
  }

  applyDamage(damage: number, gameOver: () => void){
    this.health -= damage;
    this.invincibilityTimer = this.invincibilityDuration;
    if (this.health > 0) return;
    // lose - save top score
    gameOver();
  }
  
  render(ctx: CanvasRenderingContext2D, camera: number[]){
    // debug player hitbox
    // ctx.fillStyle = "red";
    // ctx.lineWidth = 3;
    // ctx.strokeRect(this.pos[0] + camera[0] - this.radius, this.pos[1] + camera[1] - this.radius, this.radius * 2, this.radius * 2);

    let borderColor = (this.state === "shield") ? "cyan" : "black";
    borderColor = (this.invincibilityTimer > 0) ? "red" : borderColor;
    let borderWidth = (this.state === "shield") ? 8 : 0;
    borderWidth = (this.invincibilityTimer > 0) ? 8 : borderWidth;
    const offsetPos = [this.pos[0] + camera[0], this.pos[1] + camera[1]]
    renderImg(ctx, offsetPos, this.radius, sheepImg, 4, borderWidth, borderColor)
  }
}

type GenericEnemyState = "telegraph" | "spawning" | "idle";
type EnemyState = WolfState | BeeState | HogState;
abstract class Enemy{
  pos: number[];
  vel: number[] = [0, 0];
  abstract speed: number;
  abstract radius: number;
  abstract maxHealth: number;
  abstract health: number;
  abstract damage: number;
  abstract state: EnemyState;
  abstract attackRange: number;
  abstract img: HTMLImageElement;
  // telegraphing
  telegraphTimer: number = 0;
  telegraphDuration: number = 0.3;
  // spawning
  spawningTimer: number = 0;
  spawningDuration: number = 2;
  // idle
  idleMoveTimer: number = 0;
  idleMoveDuration: number = 2;
  idleStandTimer: number = 0;
  idleStandDuration = 3
  idleVel: number[] = [0, 0];

  shrinkDuration: number = 0.15;
  shrinkTimer: number = 0;
  shrinkAmount: number = 2;

  constructor(bounds: number[], radius: number){
    this.pos = this.getSpawnLocation(bounds, radius);
  }

  abstract update(player: Player, dt: number, enemies: Enemy[], bounds: number[], projectiles: Projectile[]): void; 

  separate(enemies: Enemy[], dt: number){
    for (const other of enemies){
      if (other == this) continue;
      const dx = this.pos[0] - other.pos[0];
      const dy = this.pos[1] - other.pos[1];
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < this.radius * enemySeparationMult){
        this.pos[0] += (dx / dist) * separationStrength * dt;
        this.pos[1] += (dy / dist) * separationStrength * dt;
      }
    }
  }

  idle(dt: number, bounds: number[]){
    const idleMoveSpeed = 0.5 * this.speed;
    if (this.idleStandTimer === 0 && this.idleMoveTimer === 0){
      this.idleMoveTimer = this.idleMoveDuration;
      this.idleVel = [((Math.random() * 2) - 1) * idleMoveSpeed, ((Math.random() * 2) - 1) * idleMoveSpeed];
    }
    if (this.idleStandTimer > 0){
      this.idleStandTimer -= dt;
      if (this.idleStandTimer <= 0){
        this.idleStandTimer = 0;
        this.idleMoveTimer = this.idleMoveDuration;
        this.idleVel = [((Math.random() * 2) - 1) * idleMoveSpeed, ((Math.random() * 2) - 1) * idleMoveSpeed];
      }
    } else{
      this.idleMoveTimer -= dt;
      applyVelocity(this.pos, [this.idleVel[0] * dt, this.idleVel[1] * dt], bounds, this.radius);
      if (this.idleMoveTimer <= 0){
        this.idleMoveTimer = 0;
        this.idleStandTimer = this.idleStandDuration;
      }
    }
  }

  telegraph(){
    this.telegraphTimer = this.telegraphDuration;
    this.state = "telegraph"
  }

  applyDamage(damage: number){
    if (damage < 0) throw new Error(`For some reason, a negative damage was applied`);
    this.health = Math.max(this.health - damage, 0);
    this.shrinkTimer = this.shrinkDuration;
  }

  getSpawnLocation(bounds: number[], radius: number){
    const rand = Math.floor(Math.random() * 4)
    const rangeX = (bounds[2] - bounds[0]) - 2 * radius;
    const rangeY = (bounds[3] - bounds[1]) - 2 * radius;
    if (rand == 0){  // top
      return [Math.floor(Math.random() * rangeX) + bounds[0] + radius, bounds[1] + radius];
    } else if (rand == 1){  // right
      return [bounds[2] - radius, Math.floor(Math.random() * rangeY) + bounds[1] + radius];
    } else if (rand == 2){  // bottom
      return [Math.floor(Math.random() * rangeX) + bounds[0] + radius, bounds[3] - radius]
    } // left
    return [bounds[0] + radius, Math.floor(Math.random() * rangeY) + bounds[1] + radius]
  }

  render(ctx: CanvasRenderingContext2D, camera: number[]){
    let borderColor = (this.state === "telegraph") ? "red" : "black";
    let borderWidth = (this.state === "telegraph") ? 4 : 0;
    const img = (this.state == "spawning") ? warningImg : this.img;
    const offsetPos = [this.pos[0] + camera[0], this.pos[1] + camera[1]]
    const radius = this.radius - ((this.shrinkTimer > 0) ? this.shrinkAmount : 0);
    renderImg(ctx, offsetPos, radius, img, 0, borderWidth, borderColor);
  }
}

type WolfState = GenericEnemyState | "chase" | "attack";
const wolfRadius = 45;
class Wolf extends Enemy{
  speed: number = 350;
  radius: number = wolfRadius;
  maxHealth: number = 3;
  health: number = this.maxHealth;
  damage: number = 2;
  state: WolfState = "spawning";
  img: HTMLImageElement = wolfImg;
  telegraphDuration: number = 0.3;

  // attacking (pounce)
  attackSpeedMult: number = 2.1;
  attackRange: number = 200;
  attackDir: number[] = [0, 0];
  attackTimer: number = 0;
  attackDuration: number = 0.6;

  constructor(bounds: number[]){
    super(bounds, wolfRadius);
  }

  override update(player: Player, dt: number, enemies: Enemy[], bounds: number[], _projectiles: Projectile[]){
    switch(this.state){
      case "idle":
        this.idle(dt, bounds);
        break;
      case "spawning":
        this.spawningTimer = Math.max(this.spawningTimer - dt, 0);
        if (this.spawningTimer === 0) this.state = "chase";
        break;
      case "chase":
        this.chase(player, dt, enemies, bounds);
        break;
      case "attack":
        this.attack(dt, bounds);
        break;
      case "telegraph":
        this.telegraphTimer = Math.max(this.telegraphTimer - dt, 0);
        if (this.telegraphTimer === 0) this.startAttack(player);
        break;
    }
    this.shrinkTimer = Math.max(this.shrinkTimer - dt, 0);
  }

  startAttack(player: Player){
    const dx = player.pos[0] - this.pos[0];
    const dy = player.pos[1] - this.pos[1];
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    this.attackDir[0] = dx / dist;
    this.attackDir[1] = dy / dist;
    this.attackTimer = this.attackDuration;
    this.state = "attack";
  }

  attack(dt: number, bounds: number[]){
    this.attackTimer -= dt;
    const attackSpeed = this.speed * this.attackSpeedMult * dt;
    this.vel[0] = this.attackDir[0] * attackSpeed;
    this.vel[1] = this.attackDir[1] * attackSpeed;
    applyVelocity(this.pos, this.vel, bounds, this.radius);
    if (this.attackTimer <= 0) this.state = "chase";
  }

  chase(player: Player, dt: number, enemies: Enemy[], bounds: number[]){
    const angle = Math.atan2(player.pos[1] - this.pos[1], player.pos[0] - this.pos[0]);
    this.vel[0] = Math.cos(angle) * this.speed * dt;
    this.vel[1] = Math.sin(angle) * this.speed * dt;
    this.separate(enemies, dt);
    applyVelocity(this.pos, this.vel, bounds, this.radius);
    const distToPlayer = Math.hypot(player.pos[0] - this.pos[0], player.pos[1] - this.pos[1]);
    if (distToPlayer <= this.attackRange) this.telegraph();
  }
}

type BeeState = GenericEnemyState | "avoid";
const beeRadius = 30;
class Bee extends Enemy{
  speed: number = 250;
  radius: number = beeRadius;
  maxHealth: number = 1;
  health: number = this.maxHealth;
  damage: number = 2;
  state: BeeState = "spawning";
  img: HTMLImageElement = beeImg;
  telegraphDuration: number = 0.15;

  attackRange: number = 500;
  cooldownTimer: number = 0;
  cooldownDuration: number = 2; 

  constructor(bounds: number[]){
    super(bounds, beeRadius);
  }

  override update(player: Player, dt: number, enemies: Enemy[], bounds: number[], projectiles: Projectile[]){
    switch (this.state){
      // case "idle":
      //   this.idle(dt, bounds);
      //   break;
      case "spawning":
        this.spawningTimer = Math.max(this.spawningTimer - dt, 0);
        if (this.spawningTimer === 0) this.state = "avoid";
        break;
      case "avoid":
        this.avoid(player, dt, bounds, enemies);
        break;
      case "telegraph":
        this.telegraphTimer = Math.max(this.telegraphTimer - dt, 0);
        if (this.telegraphTimer === 0) this.startAttack(player, projectiles)
        break;
    }
    this.cooldownTimer = Math.max(this.cooldownTimer - dt, 0);
    this.shrinkTimer = Math.max(this.shrinkTimer - dt, 0);
  }

  startAttack(player: Player, projectiles: Projectile[]){
    this.cooldownTimer = this.cooldownDuration;
    const angle = Math.atan2(player.pos[1] - this.pos[1], player.pos[0] - this.pos[0]);
    const initVel = [Math.cos(angle), Math.sin(angle)];
    projectiles.push(new Stinger([this.pos[0], this.pos[1]], initVel, angle));
    this.state = "avoid";
  }

  avoid(player: Player, dt: number, bounds: number[], enemies: Enemy[]){
    const distToPlayer = Math.hypot(player.pos[0] - this.pos[0], player.pos[1] - this.pos[1]);
    const angle = Math.atan2(player.pos[1] - this.pos[1], player.pos[0] - this.pos[0]);
    this.vel[0] = Math.cos(angle) * this.speed * dt;
    this.vel[1] = Math.sin(angle) * this.speed * dt;
    if (distToPlayer < this.attackRange){
      this.vel[0] *= -1;
      this.vel[1] *= -1;
    }
    this.separate(enemies, dt);
    applyVelocity(this.pos, this.vel, bounds, this.radius);
    if (distToPlayer <= this.attackRange && this.cooldownTimer === 0) this.telegraph();
  }
}

type HogState = GenericEnemyState | "default" | "charging";
const hogRadius = 100;
class Hog extends Enemy{
  speed: number = 200;
  radius: number = hogRadius;
  maxHealth: number = 10;
  health: number = this.maxHealth;
  damage: number = 3;
  state: HogState = "spawning";
  img: HTMLImageElement = hogImg;
  telegraphDuration: number = 0.3;

  attackRange: number = fieldWidth;
  chargeSpeedMult: number = 6;
  endPos: number[] = [0, 0];

  override shrinkAmount: number = 8;

  constructor(bounds: number[]){
    super(bounds, hogRadius);
  }

  override update(player: Player, dt: number, _enemies: Enemy[], bounds: number[], _projectiles: Projectile[]){
    switch (this.state){
      case "spawning":
        this.spawningTimer = Math.max(this.spawningTimer - dt, 0);
        if (this.spawningTimer === 0) this.state = "default";
        break;
      case "default":
        // approximate future player distance using current player distance
        const currDist = Math.hypot(this.pos[0] - player.pos[0], this.pos[1] - player.pos[1]);
        const timeToCollision = this.telegraphDuration + (currDist / (this.speed * this.chargeSpeedMult));
        const projected = [
          player.pos[0] + player.vel[0] * player.speed * movementSpeed * timeToCollision,
          player.pos[1] + player.vel[1] * player.speed * movementSpeed * timeToCollision
        ];
        const angle = Math.atan2(projected[1] - this.pos[1], projected[0] - this.pos[0]);
        this.vel[0] = Math.cos(angle) * this.speed * this.chargeSpeedMult;
        this.vel[1] = Math.sin(angle) * this.speed * this.chargeSpeedMult;
        const dx = this.vel[0]; const dy = this.vel[1];
        let t = Infinity;
        if (dx > 0) t = Math.min(t, (bounds[2] - this.pos[0]) / dx);
        if (dx < 0) t = Math.min(t, (bounds[0] - this.pos[0]) / dx);
        if (dy > 0) t = Math.min(t, (bounds[3] - this.pos[1]) / dy);
        if (dy < 0) t = Math.min(t, (bounds[1] - this.pos[1]) / dy); 
        this.endPos = [this.pos[0] + dx * t, this.pos[1] + dy * t];
        this.telegraph();
        break;
      case "telegraph":
        this.telegraphTimer = Math.max(this.telegraphTimer - dt, 0);
        if (this.telegraphTimer === 0) this.state = "charging";
        break;
      case "charging":
        applyVelocity(this.pos, [this.vel[0] * dt, this.vel[1] * dt], bounds, this.radius);
        const dist = Math.hypot(this.pos[0] - this.endPos[0], this.pos[1] - this.endPos[1]);
        if (dist - this.radius * Math.sqrt(2) <= 0) this.state = "default";
        break;
    }
    this.shrinkTimer = Math.max(this.shrinkTimer - dt, 0);
  }

  renderPath(ctx: CanvasRenderingContext2D, dest: number[], camera: number[]){
    ctx.strokeStyle = "red";
    ctx.beginPath();
    ctx.lineWidth = 100;
    ctx.moveTo(this.pos[0] + camera[0], this.pos[1] + camera[1]);
    ctx.lineTo(dest[0] + camera[0], dest[1] + camera[1]);
    ctx.stroke();
  }

  override render(ctx: CanvasRenderingContext2D, camera: number[]){
    let borderColor = (this.state === "telegraph") ? "red" : "black";
    let borderWidth = (this.state === "telegraph") ? 0 : 0;
    const img = (this.state == "spawning") ? warningImg : this.img;
    const offsetPos = [this.pos[0] + camera[0], this.pos[1] + camera[1]]
    const radius = this.radius - ((this.shrinkTimer > 0) ? this.shrinkAmount : 0);
    renderImg(ctx, offsetPos, radius, img, 0, borderWidth, borderColor);

    // draw red-line charge path
    if (this.state === "telegraph"){
      this.renderPath(ctx, this.endPos, camera);
    }
  }
}

abstract class Projectile{
  abstract img: HTMLImageElement;
  abstract speed: number;
  abstract radius: number;
  abstract damage: number;
  angleOfAttack: number;
  pos: number[];
  vel: number[];
  constructor(initPos: number[], initVel: number[], angleOfAttack: number){
    this.pos = initPos;
    this.vel = initVel;
    this.angleOfAttack = angleOfAttack;
  }

  update(dt: number){
    this.pos[0] += this.vel[0] * this.speed * dt;
    this.pos[1] += this.vel[1] * this.speed * dt;
  }


  render(ctx: CanvasRenderingContext2D, camera: number[]) {
    const renderX = this.pos[0] + camera[0];
    const renderY = this.pos[1] + camera[1];

    // draw projectile at the angle of attack
    renderRotatedImg(ctx, this.img, this.radius, [renderX, renderY], this.angleOfAttack)

    // // debug (hurtbox)
    // ctx.strokeStyle = "red";
    // ctx.lineWidth = 2;
    // ctx.strokeRect(renderX - this.img.width / 2, renderY - this.img.height / 2, this.img.width, this.img.height);

    // // debug (center)
    // ctx.beginPath();
    // ctx.strokeStyle = "red";
    // ctx.lineWidth = 5;
    // ctx.arc(renderX, renderY, 3, 0, 2 * Math.PI);
    // ctx.stroke();
  }
}

class Stinger extends Projectile{
  img: HTMLImageElement = stingerImg;
  speed: number = 800;
  radius: number = 20;
  damage: number = 1;
  constructor(initPos: number[], initVel: number[], angleOfAttack: number){
    super(initPos, initVel, angleOfAttack);
  }
}

type WeaponState = "idle" | "attack";
class Weapon{
  // positioning
  pos: number[];
  playerOffset: number[];
  attackOffset: number[] = [0, 0];
  angleOfAttack: number = 0;  // rads
  state: WeaponState = "idle";
  img: HTMLImageElement = knifeImg;
  //
  damage: number = 1;
  attackRange: number = 300;
  // cooldown
  cooldownTimer: number = 0;
  cooldownDuration: number = 0.5;
  // attack anim
  attackTimer: number = 0;
  attackDuration: number = 0.3;
  targetEnemy: Enemy | null = null;
  enemiesHit: Set<Enemy> = new Set<Enemy>();

  constructor(pos: number[], playerOffset: number[]){
    this.pos = pos;
    this.playerOffset = playerOffset;
  }

  update(enemies: Enemy[], dt: number){
    switch(this.state){
      case "idle":
        this.idle(enemies, dt);
        break;
      case "attack":
        this.attack(dt);
        break;
    }
  }

  idle(enemies: Enemy[], dt: number){
    this.cooldownTimer -= dt;
    if (this.cooldownTimer > 0){
      return;
    }
    this.cooldownTimer = 0;
    for (const enemy of enemies){
      if (enemy.state === "spawning") continue;
      const rangeX = this.pos[0] + this.playerOffset[0] + this.attackOffset[0];
      const rangeY = this.pos[1] + this.playerOffset[1] + this.attackOffset[1];
      const dist = Math.hypot(rangeX - enemy.pos[0], rangeY - enemy.pos[1]);
      if (dist > this.attackRange * range) continue
      this.startAttack(enemy);
      break;
    }
  }

  startAttack(enemy: Enemy){
    this.state = "attack";
    this.attackTimer = this.attackDuration;
    this.targetEnemy = enemy;
    const weaponX = this.pos[0] + this.playerOffset[0];
    const weaponY = this.pos[1] + this.playerOffset[1];
    this.angleOfAttack = Math.atan2(this.targetEnemy.pos[1] - weaponY, this.targetEnemy.pos[0] - weaponX);
  }

  attack(dt: number){
    if (this.targetEnemy === null) throw new Error(`Attacking non-existent enemy`);
    const weaponX = this.pos[0] + this.playerOffset[0];
    const weaponY = this.pos[1] + this.playerOffset[1];
    this.angleOfAttack = Math.atan2(this.targetEnemy.pos[1] - weaponY, this.targetEnemy.pos[0] - weaponX);

    let progress = (this.attackDuration - this.attackTimer) / this.attackDuration;
    if (progress > 0.5){
      progress = 1 - progress
    } 
    progress *= 2;
    this.attackOffset[0] = Math.cos(this.angleOfAttack) * this.attackRange * range * progress;
    this.attackOffset[1] = Math.sin(this.angleOfAttack) * this.attackRange * range * progress;
    this.attackTimer -= dt;
    // end the attack
    if (this.attackTimer <= 0){
      this.state = "idle";
      this.cooldownTimer = this.cooldownDuration / attackSpeed;
      this.attackOffset = [0, 0];
      this.targetEnemy = null;
      this.enemiesHit.clear();
    }
  }

  render(ctx: CanvasRenderingContext2D, camera: number[]){
    const global: number[] = this.getGlobalPos();
    const renderX = global[0] + camera[0];
    const renderY = global[1] + camera[1];

    // draw weapon at the angle of attack
    const effectiveRadius = Math.max(this.img.width, this.img.height);
    renderRotatedImg(ctx, this.img, effectiveRadius, [renderX, renderY], this.angleOfAttack + Math.PI / 2);

    // weapon center (debug)
    // ctx.beginPath();
    // ctx.strokeStyle = "red";
    // ctx.lineWidth = 5;
    // ctx.arc(renderX, renderY, 3, 0, 2 * Math.PI);
    // ctx.stroke();

    // weapon range (debug)
    // const rangeX = this.pos[0] + this.playerOffset[0] + this.attackOffset[0];
    // const rangeY = this.pos[1] + this.playerOffset[1] + this.attackOffset[1];
    // ctx.beginPath();
    // ctx.strokeStyle = "red";
    // ctx.arc(rangeX + camera[0], rangeY + camera[1], this.range, 0, 2 * Math.PI);
    // ctx.stroke();
  }

  getGlobalPos(): number[]{
    const globalX = this.pos[0] + this.playerOffset[0] + this.attackOffset[0];
    const globalY = this.pos[1] + this.playerOffset[1] + this.attackOffset[1];
    return [globalX, globalY]
  }
}

class Mushroom{
  pos: number[];
  radius = 25;

  constructor(initPos: number[], bounds: number[]){
    this.pos = initPos;
    bounds;
    // this.pos = this.getRandomPos(bounds);
  }

  getRandomPos(bounds: number[]){
    const randX = Math.floor(Math.random() * (bounds[2] - bounds[0] - 2 * this.radius)) + bounds[0] + this.radius;
    const randY = Math.floor(Math.random() * (bounds[3] - bounds[1] - 2 * this.radius)) + bounds[1] + this.radius;
    return [randX, randY];
  }

  render(ctx: CanvasRenderingContext2D, camera: number[]){
    const offsetPos = [this.pos[0] + camera[0], this.pos[1] + camera[1]];
    renderImg(ctx, offsetPos, this.radius, mushroomImg);
  }
}

class Upgrade{
  rarity: number;
  name: string;
  desc: string;
  img: HTMLImageElement;
  select: () => void;
  constructor(rarity: number, name: string, desc: string, img: HTMLImageElement, select: () => void){
    this.rarity = rarity;
    this.name = name;
    this.desc = desc;
    this.img = img;
    this.select = select;
  }
}

const renderImg = (ctx: CanvasRenderingContext2D, pos: number[], radius: number, img: HTMLImageElement, inset=0, borderWidth=0, borderColor="black") => {
  // ctx.save();
  // ctx.beginPath();
  // ctx.arc(pos[0], pos[1], radius, 0, 2 * Math.PI);
  // ctx.clip();
  ctx.drawImage(img, pos[0] - radius + inset, pos[1] - radius + inset, radius * 2 - 2 * inset, radius * 2 - 2 * inset);
  // ctx.restore();
  if (borderWidth <= 0) return;
  // border
  ctx.beginPath();
  ctx.arc(pos[0], pos[1], radius, 0, 2 * Math.PI);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = borderWidth;
  ctx.stroke();
}

const renderRotatedImg = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, radius: number, pos: number[], angle: number) => {
  ctx.save();
  ctx.translate(pos[0], pos[1]);
  ctx.rotate(angle);
  const scaledWidth = Math.min(radius, img.width);
  const scaledHeight = Math.min(radius, img.height);
  ctx.drawImage(img, -img.width / 2, -img.height / 2, scaledWidth, scaledHeight);
  ctx.restore();
}