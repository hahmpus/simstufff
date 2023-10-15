import { constants } from "./main";
import { distanceBetween, Vector, subtractVectors, vectorMagnitude } from "./vector";


const GRAVITY = 9;
const COLLISION_DAMPING = 0.9;
const SMOOTHING_RADIUS = 10;
const TARGET_DENSITY = 1;
const PRESSURE_MULTIPLIER = 1;
const PARTICLE_RADIUS = 2;
const PARTICLE_MASS = 1;

export class Fluid {

    private numberOfParticles: number = 0;

    private particlePositions:  Array<Vector> = [];
    private particleVelocities: Array<Vector> = [];
    private particleDensities:  Array<number> = [];

    private gridSpatialLookup: Array<number> = [];
    private gridStartIndices: Array<number> = [];

    constructor(amount: number) {
        this.numberOfParticles = amount;
    }

    //RENDERING
    public renderLoop(ctx: CanvasRenderingContext2D) {

        //initialize particles
        if(this.particlePositions.length == 0) {
            for(let i = 0; i < this.numberOfParticles; i++) {
                this.particlePositions.push({x: Math.random() *constants.canvasWidth, y: Math.random() * constants.canvasHeight});
                this.particleVelocities.push({x: 0, y: 0});
                this.particleDensities.push(0);
            }
        }

        //gravity and density calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            //this.particleVelocities[i].y += GRAVITY;
            this.particleDensities[i] = this.calculateDensity(i);
        }

        //pressure calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            let pressureForce = this.calculatePressureForce(i);
            let pressureAccelerationX = pressureForce.x / this.particleDensities[i];
            let pressureAccelerationY = pressureForce.y / this.particleDensities[i];
            
            this.particleVelocities[i].x = pressureAccelerationX;
            this.particleVelocities[i].y = pressureAccelerationY;
        }

        //update positions and check bounds
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particlePositions[i].x += this.particleVelocities[i].x;
            this.particlePositions[i].y += this.particleVelocities[i].y;
            this.checkCanvasBounds(i);

            this.drawParticle(ctx, this.particlePositions[i], "orange");
        }

    }

    private drawParticle(ctx: CanvasRenderingContext2D, position: Vector, color: string = "white") {
        if (ctx != null) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.arc(position.x, position.y, PARTICLE_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }

    //GRID
    private neighborSearch(particle: Vector) {
        let cellCoord = this.getCellCoord(particle, SMOOTHING_RADIUS);
        let radiusSquared = SMOOTHING_RADIUS * SMOOTHING_RADIUS;
    }

    private updateGridLookup(points: Array<Vector>, radius: number) {

        for(let i = 0; i < points.length; i++) {
            let cell = this.getCellCoord(points[i], radius);
            let hash = this.hashCell(cell);
            let key = this.convertHashToKey(hash);
            this.gridSpatialLookup[i] = key;
            this.gridStartIndices[i] = Number.MAX_SAFE_INTEGER;
        }

        this.gridSpatialLookup.sort();

        for(let i = 0; i < points.length; i++) {
            let key = this.gridSpatialLookup[i];
            let prevKey = i == 0 ? Number.MAX_SAFE_INTEGER : this.gridSpatialLookup[i - 1];
            if(key != prevKey) {
                this.gridStartIndices[key] = i;
            }
        }

    }

    private getCellCoord(point: Vector, radius: number): Vector {
        let x = Math.floor(point.x / radius);
        let y = Math.floor(point.y / radius);
        return {x: x, y: y};
    }

    private hashCell(cell: Vector) {
        let a = cell.x * 15823;
        let b = cell.y * 9737333;
        return a + b;
    }

    private convertHashToKey(hash: number) {
        return hash % this.gridSpatialLookup.length;
    }

  


    //PHYSICS 
    private checkCanvasBounds(index: number) {
        //x
        if (this.particlePositions[index].x < 0 + PARTICLE_RADIUS) {
            this.particlePositions[index].x = 0 + PARTICLE_RADIUS;
            this.particleVelocities[index].x *= -COLLISION_DAMPING;
        } else if (this.particlePositions[index].x > constants.canvasWidth - PARTICLE_RADIUS) {
            this.particlePositions[index].x = constants.canvasWidth - PARTICLE_RADIUS;
            this.particleVelocities[index].x *= -COLLISION_DAMPING;
        }
        //y
        if (this.particlePositions[index].y < 0 + PARTICLE_RADIUS) {
            this.particlePositions[index].y = 0 + PARTICLE_RADIUS;
            this.particleVelocities[index].y *= -COLLISION_DAMPING;
        } else if (this.particlePositions[index].y > constants.canvasHeight - PARTICLE_RADIUS) {
            this.particlePositions[index].y = constants.canvasHeight - PARTICLE_RADIUS;
            this.particleVelocities[index].y *= -COLLISION_DAMPING;
        }
    }

    //magic numbers
    private smoothingKernel(distance: number, radius: number) {
        if(distance >= radius) return 0;
        let volume: number = (Math.PI * Math.pow(radius, 4)) / 6;
        return (radius - distance) * (radius - distance) / volume;
    }

    //magic derivative numbers
    private smoothingKernelDerivative(distance: number, radius: number) {
        if(distance >= radius) return 0;
        let scale = 12 / (Math.PI * Math.pow(radius, 4));
        return (distance - radius) * scale;
    }

    private calculateDensity(index: number) {

        let density = 0;

        for(let otherIndex = 0; otherIndex < this.numberOfParticles; otherIndex++) {
            let offset = subtractVectors(this.particlePositions[index], this.particlePositions[otherIndex]);
            let distance = vectorMagnitude(offset);
            let influence = this.smoothingKernel(distance, SMOOTHING_RADIUS);
            density += PARTICLE_MASS * influence;
        }

        return density;
    }

    private convertDensityToPressure(density: number) {
        let densityError = density - TARGET_DENSITY;
        let pressure = densityError * PRESSURE_MULTIPLIER;
        return pressure;
    }

    private calculateSharedPressure(densityA: number, densityB: number) {
        let pressureA = this.convertDensityToPressure(densityA);
        let pressureB = this.convertDensityToPressure(densityB);
        return (pressureA + pressureB) / 2;
    }

    private calculatePressureForce(index: number) {

        let pressureForce = {x: 0, y: 0};

        for(let otherIndex = 0; otherIndex < this.particlePositions.length; otherIndex++) {
            if(otherIndex == index) continue;

            let offset = subtractVectors(this.particlePositions[index], this.particlePositions[otherIndex]);
            let distance = vectorMagnitude(offset);

            let direction = {x: 0, y: 0};
            if(distance != 0) {
                direction = {x: offset.x / distance, y: offset.y / distance};
            } else {
                direction = {x: Math.random(), y: Math.random()};
            }

            let slope = this.smoothingKernelDerivative(distance, SMOOTHING_RADIUS);
            let density = this.particleDensities[otherIndex];
            let sharedPressure = this.calculateSharedPressure(density, this.particleDensities[index]);

            pressureForce.x += sharedPressure * direction.x * slope * PARTICLE_MASS / density;
            pressureForce.y += sharedPressure * direction.y * slope * PARTICLE_MASS / density;
        }

        return pressureForce;
    }   
}