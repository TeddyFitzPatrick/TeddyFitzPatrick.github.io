import { useRef, useEffect, useState } from "react";

// game defaults
const defaultBackgroundColor = "#9ECB91";

const defaultPlayerColor = "#FFFFFF";
const defaultPlayerRadius = 25;
const defaultPlayerSpeed = 500;

const defaultEnemyColor = "#9CA0A6";
const defaultEnemyRadius = 25;

const defaultEnemySpeed = 375;
const defaultChargeSpeedMult = 2;
const enemySeparationMult = 2.5;
const attackRadius = 200;

const separationStrength = 50;
const defaultEnemySpawnInterval = 1;
const numStartingEnemies = 1;

const sheepImg = new Image();
sheepImg.src = "/sheep/sheep.jpeg";

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

type Setter<T> = React.Dispatch<T>;
function Game({setStartGame, startGame}: {setStartGame: Setter<Boolean>, startGame: Boolean}){
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const player = new Player([0, 0]);
  const enemies = Array.from({ length: numStartingEnemies }, () => new Enemy([0, 0]));

  useEffect(() => {
    if (!canvasRef) throw new Error(`No canvasRef`);
    const canvas = canvasRef.current;
    if (!canvas) throw new Error(`No canvas`);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error(`Couldn't get canvas 2D context`);

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // user input
    const keys = new Set<string>();
    window.addEventListener("keydown", (e) => {
      keys.add(e.key);
    });
    window.addEventListener("keyup", (e) => {
      keys.delete(e.key)
    })

    // init
    player.pos = [Math.floor(canvas.width / 2), Math.floor(canvas.height / 2)]
    for (const enemy of enemies){
      enemy.setRandomPos(canvas);
    }

    let animId: number;
    let lastTime: number | null = null;
    let elapsedTime = 0;
    let enemySpawnInterval = defaultEnemySpawnInterval;
    let enemySpawnCooldown = enemySpawnInterval;
    const gameLoop = (time: DOMHighResTimeStamp) => {
      if (lastTime === null){
        lastTime = time
      }

      const dt = (time - lastTime) / 1000;
      lastTime = time;
      elapsedTime += dt;

      update(dt);
      render();

      animId = requestAnimationFrame(gameLoop);
    };

    const update = (dt: number) => {
      // lose
      for (const enemy of enemies){
        const dist = Math.hypot(player.pos[0] - enemy.pos[0], player.pos[1] - enemy.pos[1]);
        if (dist <= player.radius * 2){
          // record score
          const priorTopScore = Number(localStorage.getItem('topScore') ?? 0);
          localStorage.setItem('topScore', `${Math.max(elapsedTime, priorTopScore)}`);
          setStartGame(false);
        }
      }
      player.update(keys, dt, canvas);
      enemySpawnCooldown -= dt;
      if (enemySpawnCooldown <= 0){
        spawnEnemy();
        enemySpawnCooldown = enemySpawnInterval;
        enemySpawnInterval *= 0.99;
      }
      for (const enemy of enemies){
        enemy.update(player.pos, dt, enemies, canvas);
      }
    }

    const spawnEnemy = () => {
      const spawned = new Enemy([0, 0]);
      spawned.setRandomPos(canvas);
      enemies.push(spawned);
    }

    ctx.font = `32px sans-serif`;
    const render = () => {
      ctx.fillStyle = defaultBackgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.fillStyle = "black";
      const timestamp: string = `Avoided becoming mutton ${Math.floor(elapsedTime)} seconds`;
      ctx.fillText(timestamp, 25, 50);

      player.render(ctx);
      for (const enemy of enemies){
        enemy.render(ctx);
      }
    }

    // start game loop
    animId = requestAnimationFrame(gameLoop)

    // clean-up
    return () => {
      cancelAnimationFrame(animId);
    }
  }, [startGame]);

  return (
    <canvas ref={canvasRef} style={{
      display: 'block', 
      width: '100vw',
      height: '100vh',
      margin: 0,
    }}/>
  );
}

const applyVelocity = (pos: number[], vel: number[], canvasDim: number[], radius: number) => {
  pos[0] += vel[0]
  pos[1] += vel[1]
  pos[0] = Math.min(Math.max(pos[0], Math.floor(radius)), canvasDim[0] - radius);
  pos[1] = Math.min(Math.max(pos[1], Math.floor(radius)), canvasDim[1] - radius);
}

class Player{
  pos: number[];
  vel: number[];
  speed: number;
  radius: number;
  color: string;

  constructor(initPos: number[], initVel: number[] = [0, 0], radius=defaultPlayerRadius, color=defaultPlayerColor, speed=defaultPlayerSpeed){
    this.pos = initPos;
    this.vel = initVel;
    this.radius = radius;
    this.color = color;
    this.speed = speed;
  }

  update(keys: Set<string>, dt: number, canvas: HTMLCanvasElement){
    this.vel = [0, 0];
    if (keys.has("ArrowRight") || keys.has("d")) this.vel[0] = this.speed * dt;
    if (keys.has("ArrowLeft") || keys.has("a")) this.vel[0] = -this.speed * dt;
    if (keys.has("ArrowDown") || keys.has("s")) this.vel[1] = this.speed * dt;
    if (keys.has("ArrowUp") || keys.has("w")) this.vel[1] = -this.speed * dt;
    const length = Math.hypot(this.vel[0], this.vel[1]);
    if (length > 0) {
      this.vel[0] = (this.vel[0] / length) * this.speed * dt;
      this.vel[1] = (this.vel[1] / length) * this.speed * dt;
    }
    applyVelocity(this.pos, this.vel, [canvas.width, canvas.height], this.radius)
  }
  
  render(ctx: CanvasRenderingContext2D){

    ctx.beginPath();
    ctx.arc(this.pos[0], this.pos[1], this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();  

    ctx.drawImage(sheepImg, this.pos[0] - this.radius / 2, this.pos[1] - this.radius / 2, this.radius, this.radius);
    // ctx.fillStyle = "red";
    // ctx.fillRect(this.pos[0], this.pos[1], 3, 3);
  }
}

type EnemyState = "chase" | "charge" | "cooldown";
class Enemy{
  pos: number[];
  vel: number[];
  speed: number;
  radius: number;
  color: string;
  state: EnemyState = "chase";

  chargeDir: number[] = [0, 0];
  chargeTimer: number = 0;
  chargeTimerDuration: number = 0.6;
  chargeSpeedMult: number = defaultChargeSpeedMult;

  cooldown: number = 0;
  cooldownDuration: number = 0.2;

  constructor(initPos: number[], initVel: number[] = [0, 0], radius=defaultEnemyRadius, color=defaultEnemyColor, speed=defaultEnemySpeed){
    this.pos = initPos;
    this.vel = initVel;
    this.radius = radius;
    this.color = color;
    this.speed = speed;
  }

  update(playerPos: number[], dt: number, enemies: Enemy[], canvas: HTMLCanvasElement){
    switch(this.state){
      case "chase":
        this.chase(playerPos, dt, enemies, canvas);
        const distToPlayer = Math.hypot(
          playerPos[0] - this.pos[0],
          playerPos[1] - this.pos[1]
        );
        if (distToPlayer < attackRadius){
          this.cooldown = this.cooldownDuration
          this.state = "cooldown"
        } 
        break;
      case "charge":
        this.chargeTimer -= dt;
        const chargeSpeed = this.speed * this.chargeSpeedMult;
        this.vel[0] = this.chargeDir[0] * chargeSpeed * dt;
        this.vel[1] = this.chargeDir[1] * chargeSpeed * dt;
        applyVelocity(this.pos, this.vel, [canvas.width, canvas.height], this.radius);
        if (this.chargeTimer <= 0){
          this.state = "chase";
        }
        break;
      case "cooldown":
        this.cooldown -= dt;
        if (this.cooldown <= 0){
          this.startCharge(playerPos)
        }
        break;
    }
  }

  chase(playerPos: number[], dt: number, enemies: Enemy[], canvas: HTMLCanvasElement){
    const angle = Math.atan2(playerPos[1] - this.pos[1], playerPos[0] - this.pos[0]);
    this.vel[0] = Math.cos(angle) * this.speed * dt;
    this.vel[1] = Math.sin(angle) * this.speed * dt;

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
  
    applyVelocity(this.pos, this.vel, [canvas.width, canvas.height], this.radius);
  }

  startCharge(playerPos: number[]){
    const dx = playerPos[0] - this.pos[0];
    const dy = playerPos[1] - this.pos[1];
    const dist = Math.hypot(dx, dy);
    if (dist === 0) return;

    this.chargeDir[0] = dx / dist;
    this.chargeDir[1] = dy / dist;

    this.chargeTimer = this.chargeTimerDuration;
    this.state = "charge";
  }

  render(ctx: CanvasRenderingContext2D){
    ctx.beginPath();
    ctx.arc(this.pos[0], this.pos[1], this.radius, 0, Math.PI * 2);
    ctx.fillStyle = (this.state == "cooldown") ? "red" : this.color;
    ctx.fill();  
  }

  setRandomPos(canvas: HTMLCanvasElement){
    const rand = Math.floor(Math.random() * 4)
    if (rand == 0){
      this.pos = [Math.floor(Math.random() * canvas.width), 0] 
    } else if (rand == 1){
      this.pos = [canvas.width, Math.floor(Math.random() * canvas.height)]
    } else if (rand == 2){
      this.pos = [Math.floor(Math.random() * canvas.width), canvas.height]
    } else {
      this.pos = [0, Math.floor(Math.random() * canvas.height)]
    }
  }
}