import { constants } from "./main";
import Vector, {Position, Velocity} from "./vector";

const GRAVITY = 0.98;
const COLLISION_DAMPENING = 0.5;
const SMOOTHING_RADIUS = 1;
const PARTICLE_MASS = 1;

var particles: Array <Particle> = [];

class Particle extends Vector {
 
    private radius: number = 10;
    // private color: string = "hotpink";

    constructor(position: Position, velocity: Velocity) {
        super(position.x, position.y, velocity.vx, velocity.vy);
    }

    public draw = (ctx: CanvasRenderingContext2D): void => {
        if (ctx != null) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.fillStyle = "red";
            ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }

    public move = (): void => {
        this.velocity.vy += GRAVITY;
        this.position.x += this.velocity.vx;
        this.position.y += this.velocity.vy;
        this.checkBounds();
    }

    public checkBounds = (): void => {
        //bounce at bottom
        if (this.position.y > constants.canvasHeight - this.radius) {
            this.position.y = constants.canvasHeight - this.radius;
            this.velocity.vy *= -1 * COLLISION_DAMPENING;
        }
    }

    smoothingKernel = (radius: number, dst: number) => {
        const volume = Math.PI * Math.pow(radius, 8) / 4;
        //let value: number = Math.max(0, radius - dst);
        let value: number = Math.max(0, radius * radius - dst * dst);
        return value * value * value / volume;
    }

    calculateDensity = (particle: Particle) => {
        let density: number = 0;

        particles.forEach((p) => {
            let dst: number = this.distanceTo(p);
            let influence: number = this.smoothingKernel(SMOOTHING_RADIUS, dst);
            density += influence * PARTICLE_MASS;
        });

        return density;
    }

    calculateProperty = (particles: Array<Particle>) => {
        let property: number = 0;

        for(let i = 0; i < particles.length; i++) {
            let p = particles[i];
            let dst: number = this.distanceTo(p);
            let influence: number = this.smoothingKernel(SMOOTHING_RADIUS, dst);
            property += influence * 1;
        }

    }
    
    distanceTo(otherParticle: Particle) {
        let dx = this.position.x - otherParticle.position.x;
        let dy = this.position.y - otherParticle.position.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

}

function spawnParticle(x: number, y: number) {
    let p = new Particle({x, y}, {vx: 0, vy: 0});
    particles.push(p);
}

export function renderParticles(ctx: CanvasRenderingContext2D) {
    if(particles.length <= 100) {
        //spawn random particles
        let x = Math.floor(Math.random() * constants.canvasWidth);
        let y = Math.floor(Math.random() * constants.canvasHeight);
        spawnParticle(x, y);
    }

    particles.forEach((p, i) => {
        p.move();
        p.draw(ctx);
    });
}