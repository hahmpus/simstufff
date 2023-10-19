import chroma from "chroma-js";

import { constants } from "./main";
import { Vector, subtractVectors, addVectors, vectorMagnitude } from "./vector";

const SpeedColorGradient = chroma.scale(['#2980b9', '#27ae60', '#f1c40f', '#c0392b'])
    .mode('lrgb')
    //.domain([0, 0.25, 0.25, 1]);

const GRAVITY = 9;
const COLLISION_DAMPING = 0.9;
const SMOOTHING_RADIUS = 20;
const TARGET_DENSITY = 2;
const PRESSURE_MULTIPLIER = 10;

const PARTICLE_RADIUS = 3;
const SIMULATIONS_PER_FRAME = 5;
const PREDICTION_FACTOR = 1 / SIMULATIONS_PER_FRAME;



export class Fluid {

    //particles
    private numberOfParticles: number = 0;

    //particle data
    private particlePositions:  Array<Vector> = [];
    private predictedPositions: Array<Vector> = [];
    private particleVelocities: Array<Vector> = [];
    private particleDensities:  Array<number> = [];

    //optimization
    private gridSpatialLookup: Array<number> = [];
    private gridStartIndices: Array<number> = [];
    private gridOffsets: Array<Vector> = [
        {x: -SMOOTHING_RADIUS, y: -SMOOTHING_RADIUS}, {x: 0, y: -SMOOTHING_RADIUS}, {x: SMOOTHING_RADIUS, y: -SMOOTHING_RADIUS},
        {x: -SMOOTHING_RADIUS, y: 0},                 {x: 0, y: 0},                 {x: SMOOTHING_RADIUS, y: 0},
        {x: -SMOOTHING_RADIUS, y: SMOOTHING_RADIUS }, {x: 0, y: SMOOTHING_RADIUS }, {x: SMOOTHING_RADIUS, y: SMOOTHING_RADIUS }
    ];

    constructor(amount: number) {
        this.numberOfParticles = amount;
    }

    //RENDERING
    public runFrame(ctx: CanvasRenderingContext2D, deltaTime: number) {
        for(let i = 0; i < SIMULATIONS_PER_FRAME; i++) {
            this.simulationStep(ctx, deltaTime / SIMULATIONS_PER_FRAME);
        }
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.drawParticle(ctx, i);
            this.drawGradient(ctx, i);
            //this.drawDirection(ctx, i);
        }
    }

    public simulationStep(ctx: CanvasRenderingContext2D, deltaTime: number) {
        //initialize particles
        if(this.particlePositions.length == 0) {
            for(let i = 0; i < this.numberOfParticles; i++) {
                this.particlePositions.push({x: Math.random() * constants.canvasWidth, y: Math.random() * constants.canvasHeight});
                this.particleVelocities.push({x: 0, y: 0});
                this.particleDensities.push(0);
            }
        }

        //apply predict
        for(let i = 0; i < this.numberOfParticles; i++) {
            let velocity = this.particleVelocities[i];
            let future: Vector = {x: velocity.x * PREDICTION_FACTOR, y: velocity.y * PREDICTION_FACTOR};
            let predicted = addVectors(this.particlePositions[i], future);
            this.predictedPositions[i] = {x: predicted.x, y: predicted.y};
        }

        //grid update
        this.updateGrid();

        //density calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particleDensities[i] = this.calculateDensity(this.predictedPositions[i]);
        }

        //pressure calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            let pressureForce = this.calculatePressureForce(i);
            //if(i != 0) continue;            
            let pressureAccelerationX = pressureForce.x / this.particleDensities[i];
            let pressureAccelerationY = pressureForce.y / this.particleDensities[i];
            
            this.particleVelocities[i].x += pressureAccelerationX * deltaTime;
            this.particleVelocities[i].y += (pressureAccelerationY * deltaTime) + (GRAVITY * deltaTime);
        }

        //update positions and check bounds
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particlePositions[i].x += this.particleVelocities[i].x;
            this.particlePositions[i].y += this.particleVelocities[i].y;
            this.checkCanvasBounds(i);
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

    private drawGradient(ctx: CanvasRenderingContext2D, index: number) {
        let vector = this.particlePositions[index];
        if (ctx != null) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.fillStyle = "rgba(127, 0, 127, 0.1)";
            ctx.arc(vector.x, vector.y, SMOOTHING_RADIUS, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }

    private drawDirection(ctx: CanvasRenderingContext2D, index: number) {
        //position, and predicted position and draw line betwenn them
        //draw as a trianglepointing at the next position
        let vector = this.particlePositions[index];
        // let speed = this.particleVelocities[index];
        // let next = addVectors(vector, speed);
        let next = this.predictedPositions[index];
        if (ctx != null) {
            ctx.save();
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.strokeStyle = "white";
            ctx.moveTo(vector.x, vector.y);
            ctx.lineTo(next.x, next.y);
            ctx.stroke();
            ctx.restore();
        }
    }

    private speedBasedColor(index: number) {
        let vector = this.particleVelocities[index];
        let speed = vectorMagnitude(vector) / 4;
        return SpeedColorGradient(speed).hex();
    }

    //GRID
    private updateGrid () {
        for(let i = 0; i < this.numberOfParticles; i++) {
            let cellPos = this.positionToCell(this.particlePositions[i]);
            let cellKey = this.hashCell(cellPos);
            this.gridSpatialLookup[i] = cellKey;
            this.gridStartIndices[i] = Number.MAX_SAFE_INTEGER;
        }

        this.gridSpatialLookup.sort();

        for(let i = 0; i < this.numberOfParticles; i++) {
            let cellKey = this.gridSpatialLookup[i];
            let prevKey = i == 0 ? Number.MAX_SAFE_INTEGER : this.gridStartIndices[cellKey];
            if(cellKey != prevKey) {
                this.gridStartIndices[cellKey] = i;
            }
        }
    }

    private positionToCell(position: Vector): {x: number, y: number} {
        let cellX = position.x / SMOOTHING_RADIUS;
        let cellY = position.y / SMOOTHING_RADIUS;
        return {x: cellX, y: cellY};
    }

    private hashCell(cell: Vector): number {
        let a: number = cell.x * 15823;
        let b: number = cell.y * 9737333;
        return a + b;
    }

    private getKeyFromHash(hash: number): number {
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
        if (distance < radius)
        {
            const SpikyPow2ScalingFactor = 6 / (Math.PI * Math.pow(radius, 4));
            let v:number = radius - distance;
            return v * v * SpikyPow2ScalingFactor;
        }
        return 0;
    }

    //magic derivative numbers
    private smoothingKernelDerivative(distance: number, radius: number): number {
        if (distance <= radius)
        {
            const SpikyPow2DerivativeScalingFactor = -12 / (Math.pow(radius, 4) * Math.PI);
            let v:number = radius - distance;
            return v * SpikyPow2DerivativeScalingFactor;
        }
        return 0;
    }

    private calculateDensity(particle: Vector): number {
        let density = 0;

        for(let otherIndex = 0; otherIndex < this.numberOfParticles; otherIndex++) {
            let offset = subtractVectors(particle, this.predictedPositions[otherIndex]);
            let distance = vectorMagnitude(offset);
            let influence = this.smoothingKernel(distance, SMOOTHING_RADIUS);
            density += influence;
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

            let offset = subtractVectors(this.predictedPositions[index], this.predictedPositions[otherIndex]);
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
            
            pressureForce.x += sharedPressure * direction.x * slope / density;
            pressureForce.y += sharedPressure * direction.y * slope / density;
        }

        return pressureForce;
    }   
}