import chroma from "chroma-js";

import { canvasDimensions } from "./main";
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

type InteractionForce = {
    force: number,
    position: Vector
}

const SpeedColorGradient = chroma.scale(['#2980b9', '#27ae60', '#f1c40f', '#c0392b'])
    .mode('lrgb')
    //.domain([0, 0.25, 0.25, 1]);


const SIMULATIONS_PER_FRAME = 3;
const PREDICTION_FACTOR = 1 / SIMULATIONS_PER_FRAME;

export class Fluid {

    //constructors
    private numberOfParticles: number = 0;
    private canvasContext: CanvasRenderingContext2D;
    
    //"constants"
    private interactionForce: {force: number, position: Vector} = {force: 0, position: {x: 0, y: 0}};
    private gravity: number = 9;
    private collisionDamping: number = 0.1;
    private smoothingRadius: number = 20;
    private targetDensity: number = 2;
    private pressureMultiplier: number = 25;
    private nearPressureMultiplier: number = 1;
    private viscosity: number = 0.1;

    private particleRadius: number = 2;
    private FM = new FluidMaths(this.smoothingRadius);

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



    //ENCAPSULATION
    public setInteractionForce(mouseInput?: InteractionForce) {
        if(mouseInput !== undefined) {
            this.interactionForce = {force: mouseInput.force, position: mouseInput.position};
        } else {
            return this.interactionForce;
        }
    }

    public gravityEncap(gravity?: number) {
        if(gravity !== undefined) {
            this.gravity = gravity;
        } else {
            return this.gravity;
        }
    }

    public collisionDampingEncap(damping?: number) {
        if(damping !== undefined) {
            this.collisionDamping = damping;
        } else {
            return this.collisionDamping;
        }
    }

    public smoothingRadiusEncap(radius?: number) {
        if(radius !== undefined) {
            this.smoothingRadius = radius;
            this.FM = new FluidMaths(this.smoothingRadius);
        } else {
            return this.smoothingRadius;
        }
    }

    public targetDensityEncap(density?: number) {
        if(density !== undefined) {
            this.targetDensity = density;
        } else {
            return this.targetDensity;
        }
    }

    public pressureMultiplierEncap(multiplier?: number) {
        if(multiplier !== undefined) {
            this.pressureMultiplier = multiplier;
        } else {
            return this.pressureMultiplier;
        }
    }

    public nearPressureMultiplierEncap(multiplier?: number) {
        if(multiplier !== undefined) {
            this.nearPressureMultiplier = multiplier;
        } else {
            return this.nearPressureMultiplier;
        }
    }

    public viscosityEncap(viscosity?: number) {
        if(viscosity !== undefined) {
            this.viscosity = viscosity;
        } else {
            return this.viscosity;
        }
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
            //this.drawDirection(i);

        }
    }

    private simulationStep(deltaTime: number) {
        //initialize particles
        if(this.particlePositions.length == 0) {
            for(let i = 0; i < this.numberOfParticles; i++) {
                this.particlePositions.push({x: canvasDimensions.width * Math.random() / 4, y: canvasDimensions.height * Math.random()});
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
        }

        //acceleration
        for(let i = 0; i < this.numberOfParticles; i++) {
            //external forces
            let externalForce = this.externalForces(this.particlePositions[i], this.particleVelocities[i]);
            this.particleVelocities[i].x += externalForce.x * deltaTime;
            this.particleVelocities[i].y += externalForce.y * deltaTime;

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
        
        this.canvasContext.save();
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.beginPath();
        this.canvasContext.fillStyle = target == index ? 'hotpink' : this.speedBasedColor(index);
        this.canvasContext.arc(vector.x, vector.y, this.particleRadius, 0, 2 * Math.PI);
        this.canvasContext.fill();
        this.canvasContext.restore();
    }

    private drawGradient(index: number) {
        let vector = this.particlePositions[index];
   
        this.canvasContext.save();
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.beginPath();
        this.canvasContext.fillStyle = "rgba(255, 0, 0, 0.05)";
        this.canvasContext.arc(vector.x, vector.y, this.smoothingRadius, 0, 2 * Math.PI);
        this.canvasContext.fill();
        this.canvasContext.restore();
    }

    private drawDirection(index: number) {
        let vector = this.particlePositions[index];
        let next = this.predictedPositions[index];

        this.canvasContext.save();
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.beginPath();
        this.canvasContext.strokeStyle = "white";
        this.canvasContext.moveTo(vector.x, vector.y);
        this.canvasContext.lineTo(next.x, next.y);
        this.canvasContext.stroke();
        this.canvasContext.restore();
    }

    private drawSpatialLookup(index: number, target: number) {
        let cell = this.particlePositions[index];
        let cellPos = this.positionToCell(cell);

        let startx = cellPos.x * this.smoothingRadius;
        let starty = cellPos.y * this.smoothingRadius;

        if (target == index) {
            this.canvasContext.save();
            this.canvasContext.globalAlpha = 1;
            this.canvasContext.beginPath();
            this.canvasContext.strokeStyle = "rgba(0, 255, 0, 0.7)";
            for(let i = 0; i < this.gridOffsets.length; i++) {
                let offset = this.gridOffsets[i];
                this.canvasContext.rect(startx + offset.x * this.smoothingRadius, starty + offset.y * this.smoothingRadius, this.smoothingRadius, this.smoothingRadius);
            }
            this.canvasContext.stroke();
            this.canvasContext.restore();
        }
       
    }

    private drawGrid(highlight: boolean = false) {
        this.canvasContext.save();
        this.canvasContext.globalAlpha = 1;
        this.canvasContext.beginPath();
        this.canvasContext.strokeStyle = "rgba(255, 255, 255, 0.1)";
        for(let x = 0; x < canvasDimensions.width; x += this.smoothingRadius) {
            this.canvasContext.moveTo(x, 0);
            this.canvasContext.lineTo(x, canvasDimensions.height);
        }
        for(let y = 0; y < canvasDimensions.height; y += this.smoothingRadius) {
            this.canvasContext.moveTo(0, y);
            this.canvasContext.lineTo(canvasDimensions.width, y);
        }
        this.canvasContext.stroke();
        this.canvasContext.restore();      
    }

    private speedBasedColor(index: number) {
        let vector = this.particleVelocities[index];
        let speed = vectorMagnitude(vector) / 2;
        return SpeedColorGradient(speed / 3).hex();
    }



    //GRID STUFF
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
        let cellX = Math.floor(position.x / this.smoothingRadius);
        let cellY = Math.floor(position.y / this.smoothingRadius);
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
        if (this.particlePositions[index].x < 0 + this.particleRadius) {
            this.particlePositions[index].x = 0 + this.particleRadius;
            this.particleVelocities[index].x *= -this.collisionDamping;
        } else if (this.particlePositions[index].x > canvasDimensions.width - this.particleRadius) {
            this.particlePositions[index].x = canvasDimensions.width - this.particleRadius;
            this.particleVelocities[index].x *= -this.collisionDamping;
        }
        //y
        if (this.particlePositions[index].y < 0 + this.particleRadius) {
            this.particlePositions[index].y = 0 + this.particleRadius;
            this.particleVelocities[index].y *= -this.collisionDamping;
        } else if (this.particlePositions[index].y > canvasDimensions.height - this.particleRadius) {
            this.particlePositions[index].y = canvasDimensions.height - this.particleRadius;
            this.particleVelocities[index].y *= -this.collisionDamping;
        }
    }

    private densityKernel(distance: number, radius: number): number {
        return this.FM.SpikyKernelPow2(distance, radius);
    }

    private densityDerivative(distance: number, radius: number): number {
        return this.FM.DerivativeSpikyPow2(distance, radius);
    }

    private nearDensityKernel(distance: number, radius: number): number {
        return this.FM.SpikyKernelPow3(distance, radius);
    }

    private nearDensityDerivative(distance: number, radius: number): number {
        return this.FM.DerivativeSpikyPow3(distance, radius);
    }

    private viscosityKernel(distance: number, radius: number): number {
        return this.FM.SmoothingKernelPoly6(distance, radius);
    }

    private densityToPressure(density: number): number {
        let densityError = density - this.targetDensity;
        let pressure = Math.min(0, densityError) * this.pressureMultiplier;
        return pressure;
    }

    private nearDensityToPressure(density: number): number {
        return density * this.nearPressureMultiplier;
    }

    private calculateDensity(index: number): Densities {
        const particle = this.predictedPositions[index];
        let density = 0;
        let nearDensity = 0
        let sqrRadius = this.smoothingRadius * this.smoothingRadius;

        this.checkNeighbours(index, (neighbourIndex) => {
            let neigbhourPosition = this.predictedPositions[neighbourIndex];
            let neigbhourOffset = subtractVectors(neigbhourPosition, particle);
            let sqrDistance = dot(neigbhourOffset, neigbhourOffset);
            
            if(sqrDistance > sqrRadius) return;
            
            let dst = Math.sqrt(sqrDistance);
            density += this.densityKernel(dst, this.smoothingRadius);
            nearDensity += this.nearDensityKernel(dst, this.smoothingRadius);

        });

        return {density: density, nearDensity: nearDensity};
    }

    private calculatePressureForce(index: number): Vector {
        const particle = this.predictedPositions[index];

        let sqrRadius = this.smoothingRadius * this.smoothingRadius;
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
            let densitySlope = this.densityDerivative(distance, this.smoothingRadius);
            let nearDensitySlope = this.nearDensityDerivative(distance, this.smoothingRadius);

            pressureForce.x += sharedPressure * dirToNeighbour.x * densitySlope / neighbourDensities.density;
            pressureForce.y += sharedPressure * dirToNeighbour.y * densitySlope / neighbourDensities.density;
           
            pressureForce.x += sharedNearPressure * dirToNeighbour.x * nearDensitySlope / neighbourDensities.nearDensity;
            pressureForce.y += sharedNearPressure * dirToNeighbour.y * nearDensitySlope / neighbourDensities.nearDensity;
        });

        return pressureForce;
    }

    private calculateViscosityForce(index: number): Vector {
        const particle = this.predictedPositions[index];
        const velocity = this.particleVelocities[index];
        let viscosityForce = {x: 0, y: 0};
        let sqrRadius = this.smoothingRadius * this.smoothingRadius;

        this.checkNeighbours(index, (neighbourIndex) => {
            let neigbhourPosition = this.predictedPositions[neighbourIndex];
            let neigbhourOffset = subtractVectors(neigbhourPosition, particle);
            let sqrDistance = dot(neigbhourOffset, neigbhourOffset);
            
            if(sqrDistance > sqrRadius) return;
            
            let dst = Math.sqrt(sqrDistance);
            let neigbhourVelocity = this.particleVelocities[neighbourIndex];

            viscosityForce.x += (neigbhourVelocity.x - velocity.x) * this.viscosityKernel(dst, this.smoothingRadius);
            viscosityForce.y += (neigbhourVelocity.y - velocity.y) * this.viscosityKernel(dst, this.smoothingRadius);
        });

        return {x: viscosityForce.x * this.viscosity, y: viscosityForce.y * this.viscosity};
    }

    private externalForces(inputPos: Vector, inputVel: Vector): Vector {
        let force = {x: 0, y: this.gravity};
     
        if(this.interactionForce.force != 0) {
            let inputPointOffset = subtractVectors(this.interactionForce.position, inputPos);
            let sqrDst = dot(inputPointOffset, inputPointOffset);
            if(sqrDst < this.interactionForce.force * this.interactionForce.force) {
                let dst = Math.sqrt(sqrDst);
                let edgeT = (dst / this.interactionForce.force);
                let centreT = 1 - edgeT;
                let dirToCentre = {x: inputPointOffset.x / dst, y: inputPointOffset.y / dst};

                let gravityWeight = 1 - (centreT * Math.min(1, this.interactionForce.force / 10));
                let accel = {x: force.x * gravityWeight + dirToCentre.x * centreT * this.interactionForce.force, y: force.y * gravityWeight + dirToCentre.y * centreT * this.interactionForce.force};
                accel.x -= inputVel.x * centreT;
                accel.y -= inputVel.y * centreT;
                return accel;
            }


        }
      
        return force;
    }
}