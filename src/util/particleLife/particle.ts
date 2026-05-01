import { simulationVariables, canvas, ctx, particles, type colorMatrix } from './particleLife.tsx';

// performance
const PRUNING_DISTANCE = 100;

export class Particle{
    position: number[];
    velocity: number[];
    color: string;
 
    constructor(initialPosition: number[], initialVelocity: number[], color: string){
        this.position = initialPosition;
        this.velocity = initialVelocity;
        this.color = color;
    }

    applyForces(forceMatrix: colorMatrix){
        const minRadius = simulationVariables.minRadius;
        const maxRadius = simulationVariables.maxRadius;
        const middleRadius = (minRadius + maxRadius) / 2;
        for (const otherParticle of particles){
            // A particle should not attract or repel itself
            if (otherParticle == this){
                continue;
            }
            // Calculate deltaX and deltaY between particles
            const deltaX = otherParticle.position[0] - this.position[0];
            const deltaY = otherParticle.position[1] - this.position[1];
            // Pruning
            if (Math.abs(deltaX) > 100 || Math.abs(deltaY) > 100){
                continue;
            }
            // Only particles within a certain radius apply a force
            if (deltaX * deltaX + deltaY * deltaY > PRUNING_DISTANCE * PRUNING_DISTANCE){
                continue;
            }
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // Calculating the magnitude of force based on distance between particle nuclei
            let forceMagnitude = 0
            // 0 to minRadius (universally repulsive)
            if (distance < minRadius){
                forceMagnitude = distance / minRadius - 1;
            } 
            // minRadius to middleRadius
            else if (distance < middleRadius){
                forceMagnitude = 0.2 * (distance - minRadius) / (middleRadius - minRadius);
                const forceMultiplier = forceMatrix.get(this.color)?.get(otherParticle.color);
                if (forceMultiplier === undefined) throw new Error("Undefined particle color force interaction");
                forceMagnitude *= forceMultiplier;
            }
            // middleRadius to maxRadius
            else if (distance <= maxRadius){
                forceMagnitude = 0.2 * (distance - maxRadius) / (middleRadius - maxRadius);
                const forceMultiplier = forceMatrix.get(this.color)?.get(otherParticle.color);
                if (forceMultiplier === undefined) throw new Error("Undefined particle color force interaction");
                forceMagnitude *= forceMultiplier
            }
            // Calculate the direction of the force      
            let xDir = 0; let yDir = 0;
            if (distance !== 0){
                xDir = deltaX / distance
                yDir = deltaY / distance
            }
            // Apply acceleration to the particle's velocity
            this.velocity[0] += forceMagnitude * xDir;
            this.velocity[1] += forceMagnitude * yDir;
        }
    }
    // Add the velocity to the position and bound-check the particle
    applyVelocity(){
        this.position[0] += this.velocity[0];
        this.position[1] += this.velocity[1];
        // Bound check
        if (this.position[0] > canvas.width){
            this.velocity[0] = -Math.abs(this.velocity[0])-5;
            // this.position[0] -= canvas.width;
        } else if(this.position[0] < 0){
            this.velocity[0] = Math.abs(this.velocity[0])+5;
            // this.position[0] += canvas.width;
        }

        if (this.position[1] > canvas.height){
            this.velocity[1] = -Math.abs(this.velocity[1])-5;
            // this.position[1] -= canvas.height;
        } else if(this.position[1] < 0){
            this.velocity[1] = Math.abs(this.velocity[1])+5;
            // this.position[1] += canvas.height;
        }

    }
    // Reduce velocity according to a coefficient of friction
    applyFriction(){
        this.velocity[0] *= (1 - simulationVariables.frictionCoefficient);
        this.velocity[1] *= (1 - simulationVariables.frictionCoefficient);
    }
    // Update the state of the particle (position/velocity)
    update(forceMatrix: colorMatrix){
        this.applyForces(forceMatrix);
        this.applyVelocity();
        this.applyFriction();
    }
    // Draw the particle on the screen
    render(){

        ctx.fillStyle = "black";
        ctx.beginPath();
        ctx.arc(this.position[0], this.position[1], simulationVariables.particleSize+0.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = this.color;

        ctx.beginPath();
        ctx.arc(this.position[0], this.position[1], simulationVariables.particleSize, 0, 2 * Math.PI);
        ctx.fill();
    }
}