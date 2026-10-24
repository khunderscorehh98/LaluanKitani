import { describe, expect, it } from 'vitest';
import { AVOID, buildCustomModel, stepType, toSteps, viaRoad } from '../../src/lib/routing.js';

const square = (x, y, d = 0.001) => ({
  type: 'Polygon',
  coordinates: [
    [
      [x - d, y - d],
      [x + d, y - d],
      [x + d, y + d],
      [x - d, y + d],
      [x - d, y - d],
    ],
  ],
});

describe('buildCustomModel', () => {
  it('only prefers main roads when nothing is reported', () => {
    const model = buildCustomModel();
    expect(model.priority.map((s) => s.if)).toEqual(['road_class == RESIDENTIAL', 'road_class == SERVICE']);
    expect(model).not.toHaveProperty('areas');
    expect(model).not.toHaveProperty('speed');
  });

  it('blocks hard-avoid areas and slows jams and busy Peak Spots', () => {
    const model = buildCustomModel({
      hard: [square(114.9, 4.9), square(114.91, 4.9)],
      danger: [square(114.92, 4.9)],
      jammed: [square(114.93, 4.9)],
      peak: [square(114.94, 4.9)],
    });
    expect(model.priority).toContainEqual({ if: 'in_hard0 || in_hard1', multiply_by: '0' });
    expect(model.priority).toContainEqual({ if: 'in_danger0', multiply_by: String(AVOID.dangerPriority) });
    expect(model.speed).toEqual([
      { if: 'in_jam0', multiply_by: String(AVOID.jammedSpeed) },
      { if: 'in_peak0', multiply_by: String(AVOID.peakSpotSpeed) },
    ]);
    expect(model.areas.features.map((f) => f.id)).toEqual(['hard0', 'hard1', 'danger0', 'jam0', 'peak0']);
  });
});

describe('route steps', () => {
  const coordinates = [
    [114.9, 4.9],
    [114.91, 4.9],
    [114.92, 4.91],
  ];
  const instructions = [
    { sign: 0, street_name: 'Jalan Gadong', distance: 1200.4, time: 90000, interval: [0, 1] },
    { sign: 6, exit_number: 2, street_name: 'Jalan Tutong', distance: 300, time: 30000, interval: [1, 2] },
    { sign: 2, street_name: '', distance: 50, time: 10000, interval: [2, 2] },
    { sign: 4, street_name: '', distance: 0, time: 0, interval: [2, 2] },
  ];

  it('maps GraphHopper signs to step types', () => {
    expect([-2, 2, 6, 4, -7, 99].map(stepType)).toEqual(['left', 'right', 'roundabout', 'arrive', 'keep_left', 'continue']);
  });

  it('turns instructions into steps with where each starts', () => {
    const steps = toSteps(instructions, coordinates);
    expect(steps[0]).toEqual({
      type: 'continue',
      road: 'Jalan Gadong',
      distance_m: 1200,
      duration_s: 90,
      location: [114.9, 4.9],
    });
    expect(steps[1]).toMatchObject({ type: 'roundabout', exit: 2, road: 'Jalan Tutong', location: [114.91, 4.9] });
    expect(steps[2].road).toBeNull();
  });

  it('names a route by the road it spends longest on', () => {
    expect(viaRoad(instructions)).toBe('Jalan Gadong');
    expect(viaRoad([])).toBeNull();
  });
});
