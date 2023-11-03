use std::ops::{Add, Sub};

#[derive(Debug, Copy, Clone)]
pub struct Vector2 {
    pub x: f32,
    pub y: f32,
}

impl Vector2 {
    pub fn new(x: f32, y: f32) -> Self {
        Self { x, y }
    }

    pub fn rand() -> Self {
        Self {
            x: rand::random::<f32>(),
            y: rand::random::<f32>()
        }
    }

    pub fn random_with_limits(min: f32, max: f32) -> Self {
        Self {
            x: rand::random::<f32>() * (max - min) + min,
            y: rand::random::<f32>() * (max - min) + min,
        }
    }

    pub fn magnitude(&self) -> f32 {
        ((self.x * self.x + self.y * self.y) as f32).sqrt()
    }
}

impl Add for Vector2 {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

impl Sub for Vector2 {
    type Output = Self;

    fn sub(self, other: Self) -> Self {
        Self {
            x: self.x - other.x,
            y: self.y - other.y,
        }
    }
}