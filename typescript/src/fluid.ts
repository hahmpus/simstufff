import chroma from "chroma-js";

import { constants } from "./main";
import FluidMaths from "./math";
import { Vector, subtractVectors, addVectors, vectorMagnitude, dot } from "./vector";

type Densities = {
    density: number,
    nearDensity: number
}

type GridData = {
    index: number,
    cellKey: number,
    cellHash: number
}

const SpeedColorGradient = chroma.scale(['#2980b9', '#27ae60', '#f1c40f', '#c0392b'])
    .mode('lrgb')
    //.domain([0, 0.25, 0.25, 1]);

const GRAVITY = 9;
const COLLISION_DAMPING = 0.1;
const SMOOTHING_RADIUS = 5;
const TARGET_DENSITY = 2;
const PRESSURE_MULTIPLIER = 50;
const NEAR_PRESSURE_MULTIPLIER = 10;
const VISCOSITY = 0.1;

const PARTICLE_RADIUS = 2;
const SIMULATIONS_PER_FRAME = 5;
const PREDICTION_FACTOR = 1 / SIMULATIONS_PER_FRAME;

const FM = new FluidMaths(SMOOTHING_RADIUS);

export class Fluid {

    //particles
    private numberOfParticles: number = 0;
    private canvasContext: CanvasRenderingContext2D;

    //particle data
    private particlePositions: Array<Vector>    = [];
    private predictedPositions: Array<Vector>   = [];
    private particleVelocities: Array<Vector>   = [];
    private particleDensities: Array<Densities> = [];
    private gridSpatialLookup: Array<GridData>  = [];
    private gridStartIndices: Array<number>     = [];

    private gridOffsets: Array<Vector> = [
        {x: -1, y: -1}, //nw 
        {x: 0,  y: -1}, //n
        {x: 1,  y: -1}, //ne
        {x: -1, y: 0 }, //w
        {x: 0,  y: 0 }, //center
        {x: 1,  y: 0 }, //e
        {x: -1, y: 1 }, //sw
        {x: 0,  y: 1 }, //s
        {x: 1,  y: 1 }  //se
    ];

    constructor(amount: number, ctx: CanvasRenderingContext2D) {
        this.numberOfParticles = amount;
        this.canvasContext = ctx;
    }

    //RENDERING
    public runFrame(deltaTime: number) {
        for(let i = 0; i < SIMULATIONS_PER_FRAME; i++) {
            this.simulationStep(deltaTime / SIMULATIONS_PER_FRAME);
        }
        //this.drawGrid(true);
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.drawParticle(i)
            //this.drawSpatialLookup(i, 0);
            //this.drawGradient(i);
            this.drawDirection(i);

        }
    }

    public simulationStep(deltaTime: number) {
        //initialize particles
        if(this.particlePositions.length == 0) {
            for(let i = 0; i < this.numberOfParticles; i++) {
                this.particlePositions.push({x: Math.random() * constants.canvasWidth / 4, y: Math.random() * constants.canvasHeight});
                this.particleVelocities.push({x: 0, y: 0});
                this.particleDensities.push({density: 0, nearDensity: 0});
            }
        }

        //apply predictions
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
            this.particleDensities[i] = this.calculateDensity(i);
            this.particleVelocities[i].y += GRAVITY * deltaTime;
        }

        //pressure and viscosity calculation
        for(let i = 0; i < this.numberOfParticles; i++) {
            //pressure
            let pressureForce = this.calculatePressureForce(i);      
            let pressureAccelerationX = pressureForce.x / this.particleDensities[i].density;
            let pressureAccelerationY = pressureForce.y / this.particleDensities[i].density;

            this.particleVelocities[i].x += pressureAccelerationX * deltaTime;
            this.particleVelocities[i].y += pressureAccelerationY * deltaTime;

            //viscosity
            let viscosityForce = this.calculateViscosityForce(i);
            let viscosityAccelerationX = viscosityForce.x / this.particleDensities[i].density;
            let viscosityAccelerationY = viscosityForce.y / this.particleDensities[i].density;

            this.particleVelocities[i].x += viscosityAccelerationX * deltaTime;
            this.particleVelocities[i].y += viscosityAccelerationY * deltaTime;
        }

        //update positions and check bounds
        for(let i = 0; i < this.numberOfParticles; i++) {
            this.particlePositions[i].x += this.particleVelocities[i].x;
            this.particlePositions[i].y += this.particleVelocities[i].y;
            this.checkCanvasBounds(i);
        }

    }

    private drawParticle(index: number, target?: number) {
        let vector = this.particlePositions[index];
        if (this.canvasContext != null) {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.beginPath();
            this.canvasContext.fillStyle = target == index ? 'hotpink' : this.speedBasedColor(index);
            this.canvasContext.arc(vector.x, vector.y, PARTICLE_RADIUS, 0, 2 * Math.PI);
            this.canvasContext.fill();
            this.canvasContext.restore();
        }
    }

    private drawGradient(index: number) {
        let vector = this.particlePositions[index];
        if (this.canvasContext != null) {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.beginPath();
            this.canvasContext.fillStyle = "rgba(127, 0, 127, 0.1)";
            this.canvasContext.arc(vector.x, vector.y, SMOOTHING_RADIUS, 0, 2 * Math.PI);
            this.canvasContext.fill();
            this.canvasContext.restore();
        }
    }

    private drawDirection(index: number) {
        let vector = this.particlePositions[index];
        let next = this.predictedPositions[index];
        if (this.canvasContext != null) {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.beginPath();
            this.canvasContext.strokeStyle = "white";
            this.canvasContext.moveTo(vector.x, vector.y);
            this.canvasContext.lineTo(next.x, next.y);
            this.canvasContext.stroke();
            this.canvasContext.restore();
        }
    }

    private drawSpatialLookup(index: number, target: number) {
        let cell = this.particlePositions[index];
        let cellPos = this.positionToCell(cell);

        let startx = cellPos.x * SMOOTHING_RADIUS;
        let starty = cellPos.y * SMOOTHING_RADIUS;

        if (this.canvasContext != null && target == index) {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.beginPath();
            this.canvasContext.strokeStyle = "rgba(0, 255, 0, 0.7)";
            for(let i = 0; i < this.gridOffsets.length; i++) {
                let offset = this.gridOffsets[i];
                this.canvasContext.rect(startx + offset.x * SMOOTHING_RADIUS, starty + offset.y * SMOOTHING_RADIUS, SMOOTHING_RADIUS, SMOOTHING_RADIUS);
            }
            this.canvasContext.stroke();
            this.canvasContext.restore();
        }
       
    }

    private drawGrid(highlight: boolean = false) {
        if(this.canvasContext != null) {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.beginPath();
            this.canvasContext.strokeStyle = "rgba(255, 255, 255, 0.1)";
            for(let x = 0; x < constants.canvasWidth; x += SMOOTHING_RADIUS) {
                this.canvasContext.moveTo(x, 0);
                this.canvasContext.lineTo(x, constants.canvasHeight);
            }
            for(let y = 0; y < constants.canvasHeight; y += SMOOTHING_RADIUS) {
                this.canvasContext.moveTo(0, y);
                this.canvasContext.lineTo(constants.canvasWidth, y);
            }
            this.canvasContext.stroke();
            this.canvasContext.restore();
        }
    }

    private speedBasedColor(index: number) {
        let vector = this.particleVelocities[index];
        let speed = vectorMagnitude(vector) / 2;
        return SpeedColorGradient(speed).hex();
    }




    //GRID
    private updateGrid () {
        for(let i = 0; i < this.numberOfParticles; i++) {
            let cellPos  = this.positionToCell(this.predictedPositions[i]);
            let cellHash = this.hashCell(cellPos);
            let cellKey  = this.getKeyFromHash(cellHash);
  
            this.gridSpatialLookup[i] = {index: i, cellKey: cellKey, cellHash: cellHash};
            this.gridStartIndices[i]  = Number.POSITIVE_INFINITY;
        }

        this.gridSpatialLookup.sort((a, b) => {
            return a.cellKey - b.cellKey;
        });

        for(let i = 0; i < this.numberOfParticles; i++) {
            let cellKey = this.gridSpatialLookup[i].cellKey;
            let prevKey = i == 0 ? Number.POSITIVE_INFINITY : this.gridSpatialLookup[i - 1].cellKey;
            if(cellKey != prevKey) {
                this.gridStartIndices[cellKey] = i;
            }
        }
    }

    private checkNeighbours(index: number, callback: (neighbourIndex: number) => void) {
        const particle = this.predictedPositions[index];
        let originCell = this.positionToCell(particle);

        for(let i = 0; i < this.gridOffsets.length; i++) {
            
            let offset       = this.gridOffsets[i];
            let offsetHash   = this.hashCell(addVectors(originCell, offset));
            let offsetKey    = this.getKeyFromHash(offsetHash);
            let currentIndex = this.gridStartIndices[offsetKey];

            while(currentIndex < this.numberOfParticles) {
                let indexData = this.gridSpatialLookup[currentIndex];
                currentIndex++;

                if(indexData.cellKey != offsetKey) break;
                if(indexData.cellHash != offsetHash) continue;

                callback(indexData.index);
            }

        }
    }

    private positionToCell(position: Vector): {x: number, y: number} {
        let cellX = Math.floor(position.x / SMOOTHING_RADIUS);
        let cellY = Math.floor(position.y / SMOOTHING_RADIUS);
        return {x: cellX, y: cellY};
    }

    private hashCell(cell: Vector): number {
        let a: number = cell.x * 15823;
        let b: number = cell.y * 9737333;
        return a + b;
    }

    private getKeyFromHash(hash: number): number {
        return hash % this.numberOfParticles;
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

    private densityKernel(distance: number, radius: number): number {
        return FM.SpikyKernelPow2(distance, radius);
    }

    private densityDerivative(distance: number, radius: number): number {
        return FM.DerivativeSpikyPow2(distance, radius);
    }

    private nearDensityKernel(distance: number, radius: number): number {
        return FM.SpikyKernelPow3(distance, radius);
    }

    private nearDensityDerivative(distance: number, radius: number): number {
        return FM.DerivativeSpikyPow3(distance, radius);
    }

    private viscosityKernel(distance: number, radius: number): number {
        return FM.SmoothingKernelPoly6(distance, radius);
    }

    private densityToPressure(density: number): number {
        let densityError = density - TARGET_DENSITY;
        let pressure = densityError * PRESSURE_MULTIPLIER;
        return pressure;
    }

    private nearDensityToPressure(density: number): number {
        return density * NEAR_PRESSURE_MULTIPLIER;
    }

    private calculateDensity(index: number): Densities {
        const particle = this.predictedPositions[index];
        let density = 0;
        let nearDensity = 0
        let sqrRadius = SMOOTHING_RADIUS * SMOOTHING_RADIUS;

        this.checkNeighbours(index, (neighbourIndex) => {
            let neigbhourPosition = this.predictedPositions[neighbourIndex];
            let neigbhourOffset = subtractVectors(neigbhourPosition, particle);
            let sqrDistance = dot(neigbhourOffset, neigbhourOffset);
            
            if(sqrDistance > sqrRadius) return;
            
            let dst = Math.sqrt(sqrDistance);
            density += this.densityKernel(dst, SMOOTHING_RADIUS);
            nearDensity += this.nearDensityKernel(dst, SMOOTHING_RADIUS);

        });

        return {density: density, nearDensity: nearDensity};
    }

    private calculatePressureForce(index: number): Vector {
        const particle = this.predictedPositions[index];

        let sqrRadius = SMOOTHING_RADIUS * SMOOTHING_RADIUS;
        let densities = this.particleDensities[index];
        let pressure = this.densityToPressure(densities.density);
        let nearPressure = this.nearDensityToPressure(densities.nearDensity);
        let pressureForce = {x: 0, y: 0};

        this.checkNeighbours(index, (neighbourIndex) => {
            if(neighbourIndex == index) return;

            let neigbhourPosition = this.predictedPositions[neighbourIndex];
            let neigbhourOffset = subtractVectors(particle, neigbhourPosition);
            let sqrDistance = dot(neigbhourOffset, neigbhourOffset);
            
            if(sqrDistance > sqrRadius) return;

            let distance = Math.sqrt(sqrDistance);
            // let offset = subtractVectors(particle, this.predictedPositions[neighbourIndex]);
            // let distance = vectorMagnitude(offset);

            let dirToNeighbour = {x: 0, y: 0};
            if(distance > 0) {
                dirToNeighbour = {x: neigbhourOffset.x / distance, y: neigbhourOffset.y / distance};
            } else {
                dirToNeighbour = {x: Math.random(), y: Math.random()};
            }

            let neighbourDensities = this.particleDensities[neighbourIndex];
            let neigbhourPressure = this.densityToPressure(neighbourDensities.density);
            let neighbourNearPressure = this.nearDensityToPressure(neighbourDensities.nearDensity);

            let sharedPressure = (pressure + neigbhourPressure) / 2;
            let sharedNearPressure = (nearPressure + neighbourNearPressure) / 2;
            let densitySlope = this.densityDerivative(distance, SMOOTHING_RADIUS);
            let nearDensitySlope = this.nearDensityDerivative(distance, SMOOTHING_RADIUS);

            pressureForce.x += sharedPressure * dirToNeighbour.x * densitySlope / neighbourDensities.density;
            pressureForce.y += sharedPressure * dirToNeighbour.y * densitySlope / neighbourDensities.density;
           
            pressureForce.x += sharedNearPressure * dirToNeighbour.x * nearDensitySlope / neighbourDensities.density;
            pressureForce.y += sharedNearPressure * dirToNeighbour.y * nearDensitySlope / neighbourDensities.density;
        });

        return pressureForce;
    }

    private calculateViscosityForce(index: number): Vector {
        const particle = this.predictedPositions[index];
        const velocity = this.particleVelocities[index];
        let viscosityForce = {x: 0, y: 0};
        let sqrRadius = SMOOTHING_RADIUS * SMOOTHING_RADIUS;

        this.checkNeighbours(index, (neighbourIndex) => {
            let neigbhourPosition = this.predictedPositions[neighbourIndex];
            let neigbhourOffset = subtractVectors(neigbhourPosition, particle);
            let sqrDistance = dot(neigbhourOffset, neigbhourOffset);
            
            if(sqrDistance > sqrRadius) return;
            
            let dst = Math.sqrt(sqrDistance);
            let neigbhourVelocity = this.particleVelocities[neighbourIndex];

            viscosityForce.x += (neigbhourVelocity.x - velocity.x) * this.viscosityKernel(dst, SMOOTHING_RADIUS);
            viscosityForce.y += (neigbhourVelocity.y - velocity.y) * this.viscosityKernel(dst, SMOOTHING_RADIUS);
        });

        return {x: viscosityForce.x * VISCOSITY, y: viscosityForce.y * VISCOSITY};
    }
}