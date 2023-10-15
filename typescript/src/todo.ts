    // private calculateProperty(index: number) {
        
    //     let property = 0;
    //     const mass = 1;

    //     for(let i = 0; i < this.particlePositions.length; i++) {
    //         let distance = distanceBetween(this.particlePositions[index], this.particlePositions[i]);
    //         let influence = this.smoothingKernel(SMOOTHING_RADIUS, distance);
    //         let density = this.particleDensities[i];
    //         //let density = this.particleDensities[i].density;
    //         property += this.particleProperties[i] * mass * influence / density;
    //     }

    //     this.particleProperties[index] = property;
    //     return property;
    // }

    // private calculatePropertyGradient(index: number) {

    //     let propertyGradient = 0;
    //     const mass = 1;
    
    //     for(let i = 0; i < this.particlePositions.length; i++) {
    //         let distance = distanceBetween(this.particlePositions[index], this.particlePositions[i]);
    //         let direction = directionBetween(this.particlePositions[index], this.particlePositions[i]) / distance;
    //         let slope = this.smoothingKernelDerivative(distance, SMOOTHING_RADIUS);
    //         let density = this.particleDensities[i];
    //         //let density = this.particleDensities[i].density;
    //         propertyGradient += -this.particleProperties[i] * mass * direction * slope / density;
    //     }

    //     //this.particleProperties[index] = propertyGradient;
    //     return propertyGradient;
    // }