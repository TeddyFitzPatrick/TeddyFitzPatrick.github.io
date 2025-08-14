import { particleSize, canvas, ctx, particles, forceMatrix, minRadius, maxRadius, frictionCoefficient } from './particleLife.ts';

export class Particle{
    position: number[];
    velocity: number[];
    color: string;

    constructor(initialPosition: number[], initialVelocity: number[], color: string){
        this.position = initialPosition;
        this.velocity = initialVelocity;
        this.color = color;
    }

    applyForces(){
        let deltaX, deltaY, distance, angle, forceMagnitude,xDir, yDir
        const middleRadius = (minRadius + maxRadius) / 2;
        for (let otherParticle of particles){
            // A particle should not attract or repel itself
            if (otherParticle == this){
                continue;
            }
            // Calculate deltaX and deltaY between particles
            deltaX = otherParticle.position[0] - this.position[0];
            deltaY = otherParticle.position[1] - this.position[1];
            // Pruning
            if (deltaX > 100 || deltaY > 100){
                continue;
            }
            // Calculate distance between particles
            distance = Math.sqrt(Math.pow(deltaX, 2) + Math.pow(deltaY, 2));
            // Only particles within a certain radius apply a force
            if (distance > 100){
                continue;
            }
            // Calculcate the angle of the force and apply it to the velocity
            angle = Math.atan2(deltaY, deltaX);
            xDir = Math.cos(angle);
            yDir = Math.sin(angle);

            // Calculating the magnitude of force based on distance between particle nuclei
            forceMagnitude = 0
            // 0 to minRadius (universally repulsive)
            if (distance < minRadius){
                forceMagnitude = distance / minRadius - 1;
            } 
            // minRadius to middleRadius
            else if (distance < middleRadius){
                forceMagnitude = 0.2 * (distance - minRadius) / (middleRadius - minRadius);
                forceMagnitude *= forceMatrix[this.color][otherParticle.color];
            }
            // middleRadius to maxRadius
            else if (distance <= maxRadius){
                forceMagnitude = 0.2 * (distance - maxRadius) / (middleRadius - maxRadius);
                forceMagnitude *= forceMatrix[this.color][otherParticle.color];
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
        this.velocity[0] *= (1 - frictionCoefficient);
        this.velocity[1] *= (1 - frictionCoefficient);
    }
    // Update the state of the particle (position/velocity)
    update(){
        this.applyForces();
        this.applyVelocity();
        this.applyFriction();
    }

    // Draw the particle on the screen
    render(){
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.position[0], this.position[1], particleSize, 0, 2 * Math.PI);
        ctx.fill();
    }
}