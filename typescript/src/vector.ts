export type Vector = {
    x: number,
    y: number
}

export function dot(a: Vector, b: Vector): number {
    return (a.x * b.x) + (a.y * b.y);
}

export function vectorMagnitude(v: Vector): number {
    return Math.sqrt((v.x * v.x) + (v.y * v.y));
}

export function subtractVectors(a: Vector, b: Vector): Vector {
    return { x: a.x - b.x, y: a.y - b.y };
}

export function addVectors(a: Vector, b: Vector): Vector {
    return { x: a.x + b.x, y: a.y + b.y };
}