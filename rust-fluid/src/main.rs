mod fluid;
mod vector;
use fluid::Fluid;


fn main() {

    let fluid = Fluid::new(10);

    fluid.test();

    loop {
        fluid.run_frame(0.1);
    }

}
