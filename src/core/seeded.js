// A run of numbers in [0, 1) that is the same every time for the same seed (the
// Park-Miller generator), for things drawn "at random" that must look the same at each
// play: stars on a sky, the wobble of a stone, the dust Sora breaks into.
export const seeded = (seed) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};
