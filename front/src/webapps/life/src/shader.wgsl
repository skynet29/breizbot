@group(0) @binding(0) var<uniform> grid: vec2f;
@group(0) @binding(1) var<storage> cellState: array<u32>; 

struct VertexInput {
  @location(0) pos: vec2f,
  @builtin(instance_index) instance: u32,
};

struct VertexOutput {
  @builtin(position) pos: vec4f,
  @location(0) cell: vec2f,
};

@vertex
fn vertexMain(input: VertexInput) -> VertexOutput {
    //return vec4f(pos.x, pos.y, 0, 1);
    //return vec4f(pos / grid, 0, 1);

    // let cell = vec2f(1, 1); // Cell(1,1) in the image above
    // let cellOffset = cell / grid * 2; // Compute the offset to cell
    // let gridPos = (input.pos + 1) / grid - 1 + cellOffset; // Add it here!

  let i = f32(input.instance);
  let state = f32(cellState[input.instance]);

  let cell = vec2f(i % grid.x, floor(i / grid.x));
  let cellOffset = cell / grid * 2;
  //let gridPos = (input.pos + 1) / grid - 1 + cellOffset;  
  let gridPos = (input.pos*state+1) / grid - 1 + cellOffset;

    //return vec4f(gridPos, 0, 1);
    var output: VertexOutput;
    output.pos = vec4f(gridPos, 0, 1);
    output.cell = cell;
    return output;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    //return vec4f(1, 0, 0, 1); // (Red, Green, Blue, Alpha)
  
    let c = input.cell / grid;
    return vec4f(c, 1-c.x, 1);
}