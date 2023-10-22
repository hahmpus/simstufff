export default class FluidMaths {

    //private SmoothingRadius: number;
    
    private Poly6ScalingFactor: number;
    private SpikyPow3ScalingFactor: number;
    private SpikyPow2ScalingFactor: number;
    private SpikyPow3DerivativeScalingFactor: number;
    private SpikyPow2DerivativeScalingFactor: number;

    constructor(smoothingRadius: number) {
        //this.SmoothingRadius = smoothingRadius;

        this.Poly6ScalingFactor = 4 / (Math.PI * Math.pow(smoothingRadius, 8));
        this.SpikyPow3ScalingFactor = 10 / (Math.PI * Math.pow(smoothingRadius, 5));
        this.SpikyPow2ScalingFactor = 6 / (Math.PI * Math.pow(smoothingRadius, 4));
        this.SpikyPow3DerivativeScalingFactor = 30 / (Math.pow(smoothingRadius, 5) * Math.PI);
        this.SpikyPow2DerivativeScalingFactor = 12 / (Math.pow(smoothingRadius, 4) * Math.PI);
    
    }

    public SmoothingKernelPoly6(dst: number, radius: number) {
        if (dst < radius) {
            let v = radius * radius - dst * dst;
            return v * v * v * this.Poly6ScalingFactor;
        }
        return 0;
    }

    public SpikyKernelPow3(dst: number, radius: number) {
        if (dst < radius) {
            let v = radius - dst;
            return v * v * v * this.SpikyPow3ScalingFactor;
        }
        return 0;
    }

    public SpikyKernelPow2(dst: number, radius: number) {
        if (dst < radius) {
            let v = radius - dst;
            return v * v * this.SpikyPow2ScalingFactor;
        }
        return 0;
    }

    public DerivativeSpikyPow3(dst: number, radius: number) {
        if (dst <= radius) {
            let v = radius - dst;
            return -v * v * this.SpikyPow3DerivativeScalingFactor;
        }
        return 0;
    }

    public DerivativeSpikyPow2(dst: number, radius: number) {
        if (dst <= radius) {
            let v = radius - dst;
            return -v * this.SpikyPow2DerivativeScalingFactor;
        }
        return 0;
    }
}
