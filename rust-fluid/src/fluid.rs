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

    pub fn new(particle_amount: usize) -> Self {
        Self {
            number_of_particles: particle_amount,
            particle_positions:  Vec::with_capacity(particle_amount),
            predicted_positions: Vec::with_capacity(particle_amount),
            particle_velocities: Vec::with_capacity(particle_amount),
            particle_densities:  Vec::with_capacity(particle_amount),
        }
    }

    pub fn test(&self) {
        println!("test, {:?}", self.particle_positions);
    }

    pub fn run_frame(&self, delta_time: f32) {
        //loop over all particles
        self.simulation_step(delta_time);
        
        for i in 0..self.number_of_particles {
            
        }
    }

    fn simulation_step(&self, delta_time: f32) {
        println!("simulation step, {:?}", delta_time);     
    }

}