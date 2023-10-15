import { constants } from "./main";
import Vector, {Position, Velocity, Denisty} from "./vector";
import Victor from "victor";

const GRAVITY = 1;
const COLLISION_DAMPING = 0.5;
const SMOOTHING_RADIUS = 0.5;
const PARTICLE_MASS = 1;

const PARTICLE_RADIUS = 10;

export class Fluid {

    private numberOfParticles: number = 0;

    // private particlePositions:  Array<Position> = [];
    private particleVelocities: Array<Velocity> = [];
    // private particleDensities:  Array<Denisty>  = [];
    // private particleProperties: Array<any>      = [];

    private particles:  Array<Victor> = [];

    constructor(amount: number) {
        this.numberOfParticles = amount;
    }

    //RENDERING
    public renderLoop(ctx: CanvasRenderingContext2D) {
        if(this.particles.length == 0) {
            for(let i = 0; i < this.numberOfParticles; i++) {
                var vector = new Victor(Math.random() * constants.canvasWidth, Math.random() * constants.canvasHeight);
                this.particles.push(vector);
                this.particleVelocities.push({vx: 0, vy: 0});                
            }
        }

        this.particles.forEach((position, index) => {
            this.moveParticle(index);
            this.drawParticle(ctx, position);
        });
    }

    private drawParticle(ctx: CanvasRenderingContext2D, position: Position) {
        if (ctx != null) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.fillStyle = "lightblue";
            ctx.arc(position.x, position.y, PARTICLE_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }

    private moveParticle(index: number) {
        var particle = this.particles[index];
        var velocity = this.particleVelocities[index];
        particle.x += velocity.vx;
        this.checkCanvasBounds(index);
    }

    private checkCanvasBounds(index: number) {
        let vector = this.particles[index];
        //x
        if (vector.x < 0 + PARTICLE_RADIUS) {
            vector.x = 0 + PARTICLE_RADIUS;
            this.particleVelocities[index].vx *= -COLLISION_DAMPING;
        } else if (vector.x > constants.canvasWidth - PARTICLE_RADIUS) {
            vector.x = constants.canvasWidth - PARTICLE_RADIUS;
            this.particleVelocities[index].vx *= -COLLISION_DAMPING;
        }
        //y
        if (vector.y < 0 + PARTICLE_RADIUS) {
            vector.y = 0 + PARTICLE_RADIUS;
            this.particleVelocities[index].vy *= -COLLISION_DAMPING;
        } else if (vector.y > constants.canvasHeight - PARTICLE_RADIUS) {
            vector.y = constants.canvasHeight - PARTICLE_RADIUS;
            this.particleVelocities[index].vy *= -COLLISION_DAMPING;
        }
    }


}