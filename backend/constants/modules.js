// Single responsibility: the 15 AirMouse sub-problem modules, as seeded
// into Core Technical's task list. Single source of truth so the seed
// route always matches the actual sprint plan.
const MODULES = [
  { id: 1, title: 'World: Gazebo maze arena', desc: 'Build the 15x15m Gazebo world: 1m corridors, 8ft clearance, 2x2m rooms, entry/exit markers, grid overlay. Target: Day 1-2.' },
  { id: 2, title: 'Drone model: URDF/SDF + weight budget', desc: 'Drone frame model with prop guards, mass budget under the 10kg class. Target: Day 1-2.' },
  { id: 3, title: 'Sensors: camera, IMU, LIDAR on the drone', desc: 'Attach and configure camera/IMU/2D LIDAR plugins via ros_gz_bridge. Target: Day 2.' },
  { id: 4, title: 'Flight control: velocity -> thrust bridge', desc: 'Bridge Gazebo physics to ROS2 velocity commands. Use PX4 SITL or ros_gz velocity control, not a custom controller. Target: Day 3-4.' },
  { id: 5, title: 'Localization: GPS-denied odometry', desc: 'Visual-inertial or LIDAR-inertial odometry via robot_localization. Track A. Target: Day 5-6.' },
  { id: 6, title: 'Obstacle avoidance: reactive local safety', desc: 'Reactive avoidance so the drone doesn\u2019t clip walls in 1m corridors. Nav2 local costmap or a potential-field node. Track B. Target: Day 5-6.' },
  { id: 7, title: 'SLAM: real-time 2D occupancy map', desc: 'Live-updating 2D SLAM via slam_toolbox. Track A. Target: Day 6-7.' },
  { id: 8, title: 'Exploration: frontier-based autonomous coverage', desc: 'Autonomous exploration of the unknown maze via explore_lite or Nav2. Track B. Target: Day 6-7.' },
  { id: 9, title: 'Grid reference: map coords -> grid-box IDs', desc: 'Custom node converting SLAM map coordinates into competition grid IDs (e.g. C4). Genuinely original work. Track A. Target: Day 7-8.' },
  { id: 10, title: 'Survivor detection: vision pipeline', desc: 'Detect survivors/dummies in the camera feed with a pretrained YOLO model. Track A. Target: Day 8-9.' },
  { id: 11, title: 'Survivor localization: detection -> grid + marker', desc: 'Project a detection into the map frame, snap to grid cell, publish a marker. Original work. Track A. Target: Day 8-9.' },
  { id: 12, title: 'Mission FSM: full autonomy state machine', desc: 'Sequence launch -> enter -> explore -> map/detect -> tag -> return -> land with zero manual steps. Track B. Target: Day 9-10.' },
  { id: 13, title: 'GCS dashboard: live feed, map, markers, status', desc: 'Web dashboard showing live camera, live map, survivor markers, mission status via rosbridge_suite. Track B. Target: Day 10-11.' },
  { id: 14, title: 'Safety: failsafes and abort', desc: 'Battery, link-loss, geofence, and abort handling. Track B. Target: Day 9-10.' },
  { id: 15, title: 'Integration: full end-to-end mission run', desc: 'Launch file bringing all 14 real modules up together; run and log a full mission. Depends on everything else. Target: Day 11-13.' },
];

export { MODULES };