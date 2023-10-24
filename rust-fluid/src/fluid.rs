//import vector
use super::vector::Vector2;

#[derive(Debug, Clone)]
pub struct Fluid {
    pub number_of_particles: usize,

    particle_positions: Vec<Vector2>,
    predicted_positions: Vec<Vector2>,
    particle_velocities: Vec<Vector2>,
    particle_densities: Vec<Vector2>,
}

impl Fluid {

    pub fn new(number_of_particles: usize) -> Self {
        Self {
            number_of_particles,
            particle_positions:  Vec::with_capacity(number_of_particles),
            predicted_positions: Vec::with_capacity(number_of_particles),
            particle_velocities: Vec::with_capacity(number_of_particles),
            particle_densities:  Vec::with_capacity(number_of_particles),
        }
    }

    pub fn test(&self) {
        println!("test, {:?}", self.particle_positions);
    }

}