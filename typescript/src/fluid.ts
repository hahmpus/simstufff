import chroma from "chroma-js";

import { constants } from "./main";
import { Vector, subtractVectors, addVectors, vectorMagnitude } from "./vector";

const SpeedColorGradient = chroma.scale(['#2980b9', '#27ae60', '#f1c40f', '#c0392b'])
    .mode('lrgb')
    //.domain([0,0.25,1]);

const GRAVITY = 0;
const COLLISION_DAMPING = 0.95;
const SMOOTHING_RADIUS = 25;
const TARGET_DENSITY = 2;
const PRESSURE_MULTIPLIER = 2;
const PARTICLE_MASS = 1;

const PARTICLE_RADIUS = 3;



export class Fluid {

    //particles
    private numberOfParticles: number = 0;

    //constants
    private particlePositions:  Array<Vector> = [];
    private preticedPositions:  Array<Vector> = [];
    private particleVelocities: Array<Vector> = [];
    private particleDensities:  Array<number> = [];

    //optimization
    private gridSpatialLookup: Array<number> = [];
    private gridStartIndices: Array<number> = [];

    constructor(amount: number) {
        this.numberOfParticles = amount;
    }

    //RENDERING
    public renderLoop(ctx: CanvasRenderingContext2D, deltaTime: number) {
        //initialize particles
        if(this.particlePositions.length == 0) {
            for(let i = 0; i < this.numberOfParticles; i++) {
                this.particlePositions.push({x: Math.random() * constants.canvasWidth / 4, y: Math.random() * constants.canvasHeight});
                this.particleVelocities.push({x: 0, y: 0});
                this.particleDensities.push(0);
            }

            //add two static particles
            // this.particlePositions.push({x: 500, y: 500});
            // this.particleVelocities.push({x: 0, y: 0});
            // this.particleDensities.push(0);
            
            // this.particlePositions.push({x: 480, y: 500});
            // this.particleVelocities.push({x: 0, y: 0});
            // this.particleDensities.push(0);
            // this.particlePositions.push({x: 500, y: 480});
            // this.particleVelocities.push({x: 0, y: 0});
            // this.particleDensities.push(0);
            // this.particlePositions.push({x: 520, y: 500});
            // this.particleVelocities.push({x: 0, y: 0});
            // this.particleDensities.push(0);
            // this.particlePositions.push({x: 500, y: 520});
            // this.particleVelocities.push({x: 0, y: 0});
            // this.particleDensities.push(0);
        }

        //apply gravity and predict
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particleVelocities[i].y += GRAVITY * deltaTime;
            let predicted = addVectors(this.particlePositions[i], this.particleVelocities[i]);
            this.preticedPositions[i] = {x: predicted.x * deltaTime, y: predicted.y * deltaTime};
            this.preticedPositions[i] = {x: predicted.x * (1 / 120), y: predicted.y * (1 / 120)};
        }

        //density calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particleDensities[i] = this.calculateDensity(this.particlePositions[i]);
        }

        //pressure calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            let pressureForce = this.calculatePressureForce(i);
            //if(i != 0) continue;            
            let pressureAccelerationX = pressureForce.x / this.particleDensities[i];
            let pressureAccelerationY = pressureForce.y / this.particleDensities[i];
            
            this.particleVelocities[i].x += pressureAccelerationX * deltaTime;
            this.particleVelocities[i].y += pressureAccelerationY * deltaTime;
        }

        //update positions and check bounds
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particlePositions[i].x += this.particleVelocities[i].x;
            this.particlePositions[i].y += this.particleVelocities[i].y;
            this.checkCanvasBounds(i);

            this.drawParticle(ctx, i);
        }

    }

    private drawParticle(ctx: CanvasRenderingContext2D, index: number) {
        let vector = this.particlePositions[index];
        if (ctx != null) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.fillStyle = this.speedBasedColor(index);
            ctx.arc(vector.x, vector.y, PARTICLE_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }

    private speedBasedColor(index: number) {
        let vector = this.particleVelocities[index];
        let speed = vectorMagnitude(vector) / 10;
        return SpeedColorGradient(speed).hex();
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

    private hashCell(cell: Vector): number {
        let a = cell.x * 15823;
        let b = cell.y * 9737333;
        return a + b;
    }

    private convertHashToKey(hash: number): number {
        return hash % this.gridSpatialLookup.length;
    }

  


    //PHYSICS 
    private checkCanvasBounds(index: number): void {
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
    private smoothingKernel(distance: number, radius: number): number {
        if(distance >= radius) return 0;
        let volume: number = (Math.PI * Math.pow(radius, 4)) / 6;
        return (radius - distance) * (radius - distance) / volume;
        // let volume = Math.PI * Math.pow(radius, 8) / 4;
        // let value = Math.max(0, radius * radius - distance * distance);
        // return value * value * value / volume;
    }

    //magic derivative numbers
    private smoothingKernelDerivative(distance: number, radius: number): number {
        if(distance >= radius) return 0;
        let scale = 12 / (Math.PI * Math.pow(radius, 4));
        return (distance - radius) * scale;
    }

    private calculateDensity(particle: Vector): number {
        let density = 0;

        for(let otherIndex = 0; otherIndex < this.numberOfParticles; otherIndex++) {
            let offset = subtractVectors(particle, this.particlePositions[otherIndex]);
            let distance = vectorMagnitude(offset);
            let influence = this.smoothingKernel(distance, SMOOTHING_RADIUS);
            density += PARTICLE_MASS * influence;
        }

        return density;
    }

    private convertDensityToPressure(density: number): number {
        let densityError = density - TARGET_DENSITY;
        let pressure = densityError * PRESSURE_MULTIPLIER;
        return pressure;
    }

    private calculateSharedPressure(densityA: number, densityB: number): number {
        let pressureA = this.convertDensityToPressure(densityA);
        let pressureB = this.convertDensityToPressure(densityB);
        return (pressureA + pressureB) / 2;
    }

    private calculatePressureForce(index: number): Vector {


        let pressureForce = {x: 0, y: 0};

        for(let otherIndex = 0; otherIndex < this.numberOfParticles; otherIndex++) {
            if(otherIndex == index) continue;

            let offset = subtractVectors(this.particlePositions[index], this.particlePositions[otherIndex]);
            let distance = vectorMagnitude(offset);

            //index == 1 && console.log(distance, offset);

            let direction = {x: 0, y: 0};
            if(distance != 0) {
                direction = {x: offset.x / distance, y: offset.y / distance};
            } else {
                direction = {x: Math.random(), y: Math.random()};
            }
            
            //index == 1 && console.log(direction);

            let slope = this.smoothingKernelDerivative(distance, SMOOTHING_RADIUS);
            let density = this.particleDensities[otherIndex];
            let sharedPressure = this.calculateSharedPressure(density, this.particleDensities[index]);

            index == 0 && console.log("index", index, density);
            //log all vars
            
            pressureForce.x += sharedPressure * direction.x * slope * PARTICLE_MASS / density;
            pressureForce.y += sharedPressure * direction.y * slope * PARTICLE_MASS / density;
            // if(index == 1) {
            //     console.log("index", otherIndex);
            //     console.log("offset", offset);
            //     console.log("distance", distance);
            //     console.log("direction", direction);
            //     console.log("slope", slope);
            //     console.log("density", density);
            //     console.log("sharedPressure", sharedPressure);
            //     console.log("pressureForce", pressureForce);
            // }
        }

        //index == 0 && console.log("pressureForce for ", index, pressureForce);

        return pressureForce;
    }   
}