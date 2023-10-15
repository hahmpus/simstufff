export type Vector = {
    x: number,
    y: number
}

export function distanceBetween(a: Vector, b: Vector) {
    return Math.sqrt(Math.pow((a.x - b.x), 2)  + Math.pow((a.y - b.y), 2));
}

export function vectorMagnitude(v: Vector) {
    return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vectorDirection(v: Vector) {
    return Math.atan2(v.y, v.x);
}

export function subtractVectors(a: Vector, b: Vector) {
    return { x: a.x - b.x, y: a.y - b.y };
}