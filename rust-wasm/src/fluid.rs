use super::vector::Vector2;
use wasm_bindgen::prelude::*;
use web_sys::CanvasRenderingContext2d;

const SIMULATION_STEPS: usize = 10;
pub struct Fluid {
    number_of_particles: usize,
    canvas_context: web_sys::CanvasRenderingContext2d,

    //particle tracking
    predicted_positions: Vec<Vector2>,
    particle_positions: Vec<Vector2>,
    particle_velocities: Vec<Vector2>,

    //force constants
    gravity: f32,
}

impl Fluid {
    pub fn new(particle_amount: usize, ctx: CanvasRenderingContext2d) -> Self {
        
        let mut particle_positions = Vec::with_capacity(particle_amount);
        let mut particle_velocities = Vec::with_capacity(particle_amount);

        for _ in 0..particle_amount {
            particle_positions.push(Vector2::random_with_limits(0.0, 800.0));
            particle_velocities.push(Vector2::random_with_limits(0.0, 800.0));
        }
        
        Self {
            number_of_particles: particle_amount,
            canvas_context: ctx,
        
            predicted_positions: Vec::with_capacity(particle_amount),
            particle_positions,
            particle_velocities,

            gravity: 1.0,
        }
    }

    pub fn gravity(&mut self, new_value: Option<f32>) -> Option<f32> {
        match new_value {
            Some(value) => {
                self.gravity = value;
                None
            },
            None => {
                Some(self.gravity)
            }   
        }
    }

    fn drawParticle(&mut self, position: Vector2) {
        self.canvas_context.begin_path();
        self.canvas_context.arc(
            position.x as f64, 
            position.y as f64, 
            5.0, 
            0.0, 
            2.0 * std::f64::consts::PI
        ).unwrap();
        self.canvas_context.stroke();
    }


    fn frame(&mut self, delta_time: f32) {

        //reset canvas
        self.canvas_context.set_fill_style(&JsValue::from_str("black"));
        self.canvas_context.fill_rect(
            0.0, 
            0.0, 
            self.canvas_context.canvas().unwrap().width() as f64, 
            self.canvas_context.canvas().unwrap().height() as f64
        );

        self.simulation_step();

        for index in 0..self.number_of_particles {
            self.drawParticle(self.predicted_positions[index]);
        }
    }

    fn simulation_step(&mut self) {
        for index in 0..self.number_of_particles {
            let velocity = self.particle_velocities[index];
            let position = self.particle_positions[index];
            let predicted = position + velocity;
            self.predicted_positions[index] = predicted;
        }
    }

}