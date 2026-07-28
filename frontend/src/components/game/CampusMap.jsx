import React, { useMemo } from 'react'
import * as THREE from 'three'
import useGameStore from '../../store/gameStore'

/* ──────────────────────────────────────────────────────────────
   CAMPUS LAYOUT — Faithful to Christ University Central Campus Map
   All 24 buildings positioned in exact coordinates.
   ────────────────────────────────────────────────────────────── */

const CAMPUS_BUILDINGS = [
  // 1. Front Gate (top center)
  {
    id: 'front_gate', name: 'Front Gate',
    pos: [0, 0, -48], size: [14, 5, 4],
    color: '#5a4a3a', roofColor: '#3a2a1a',
    isGate: true,
  },
  // 2. Vehicle Entry
  {
    id: 'vehicle_entry', name: 'Vehicle Entry',
    pos: [-36, 0, -48], size: [8, 5, 4],
    color: '#374151', roofColor: '#1f2937',
    isGate: true,
  },
  // 3. Parking (next to vehicle entry)
  {
    id: 'parking', name: 'Parking Area',
    pos: [-36, 0, -32], size: [12, 0.1, 26],
    color: '#4b5563', roofColor: '#374151',
    isParking: true
  },
  // 4. Audi Block
  {
    id: 'audi_block', name: 'Audi Block',
    pos: [-12, 0, -38], size: [16, 9, 10],
    color: '#7c3412', roofColor: '#4a1a08',
    facade: '/locations/central_block.png',
    windows: true, floors: 4
  },
  // 5. Junior College
  {
    id: 'junior_college', name: 'Junior College',
    pos: [-10, 0, -24.5], size: [18, 7, 8],
    color: '#7c2d12', roofColor: '#4a1a08',
    facade: '/locations/classroom.png',
    windows: true, floors: 3
  },
  // 6. Central Block (hollow courtyard layout)
  {
    id: 'central_block', name: 'Central Block',
    pos: [-9, 0, -6], size: [20, 12, 18],
    color: '#8a3412', roofColor: '#5a1a08',
    windows: true, floors: 5, isHero: true, isCentral: true
  },
  // 7. Plants & Trees
  {
    id: 'plants_trees', name: 'Plants & Trees Area',
    pos: [22, 0, -38], size: [26, 0.05, 14],
    color: '#15803d', roofColor: '#15803d',
    isGreen: true
  },
  // 8. Basketball Court (Right)
  {
    id: 'basketball_court', name: 'Basketball Court (Right)',
    pos: [20, 0, -22], size: [16, 0.2, 12],
    color: '#1d4ed8', roofColor: '#1d4ed8',
    isCourt: true
  },
  // 9. Canteen (Right Top)
  {
    id: 'canteen_right_top', name: 'Canteen (Right Top)',
    pos: [34, 0, -26], size: [6, 4, 4],
    color: '#7c3d00', roofColor: '#4a2400',
    windows: true, floors: 2
  },
  // 10. Canteen (Right Middle)
  {
    id: 'canteen_right_mid', name: 'Canteen (Right Middle)',
    pos: [34, 0, -22], size: [6, 4, 4],
    color: '#7c3d00', roofColor: '#4a2400',
    windows: true, floors: 2
  },
  // 11. Canteen (Right Bottom)
  {
    id: 'canteen_right_bot', name: 'Canteen (Right Bottom)',
    pos: [34, 0, -17], size: [6, 4, 4],
    color: '#7c3d00', roofColor: '#4a2400',
    windows: true, floors: 2
  },
  // 12. Block - 1
  {
    id: 'block_1', name: 'Block - 1',
    pos: [34.5, 0, 3.5], size: [8, 8, 10],
    color: '#3b1c57', roofColor: '#1e0a2e',
    windows: true, floors: 4
  },
  // 13. Park Garden
  {
    id: 'park_garden', name: 'Park Garden',
    pos: [20, 0, -2], size: [16, 0.05, 16],
    color: '#16a34a', roofColor: '#16a34a',
    isParkGarden: true
  },
  // 14. Block - 2
  {
    id: 'block_2', name: 'Block - 2',
    pos: [19, 0, 18], size: [16, 8, 12],
    color: '#7c3412', roofColor: '#4a1a08',
    windows: true, floors: 4
  },
  // 15. Birds Park
  {
    id: 'birds_park', name: 'Birds Park',
    pos: [20, 0, 30], size: [14, 0.05, 10],
    color: '#15803d', roofColor: '#15803d',
    isGreen: true
  },
  // 16. Canteen (Bottom Right)
  {
    id: 'canteen_bot_right', name: 'Canteen (Bottom Right)',
    pos: [34.5, 0, 44], size: [8, 5, 10],
    color: '#7c3d00', roofColor: '#4a2400',
    windows: true, floors: 2
  },
  // 17. Back Gate
  {
    id: 'back_gate', name: 'Back Gate',
    pos: [-2, 0, 48], size: [10, 5, 4],
    color: '#5a4a3a', roofColor: '#3a2a1a',
    isGate: true,
  },
  // 18. R&D Block
  {
    id: 'rd_block', name: 'R&D Block',
    pos: [-30.5, 0, 43], size: [14, 6, 8],
    color: '#3b1c57', roofColor: '#1e0a2e',
    windows: true, floors: 3
  },
  // 19. Block - 4
  {
    id: 'block_4', name: 'Block - 4',
    pos: [-30.5, 0, 29.5], size: [14, 7, 8],
    color: '#7c3412', roofColor: '#4a1a08',
    windows: true, floors: 3
  },
  // 20. She Block / Boys Hostel
  {
    id: 'she_block', name: 'She Block / Boys Hostel',
    pos: [-31.5, 0, 18], size: [16, 7, 10],
    color: '#7c185d', roofColor: '#4a0a38',
    windows: true, floors: 3
  },
  // 21. Hockey Court
  {
    id: 'hockey_court', name: 'Hockey Court',
    pos: [-31, 0, 4.5], size: [14, 0.2, 8],
    color: '#065f46', roofColor: '#065f46',
    isHockeyCourt: true
  },
  // 22. Basket Ball Court (Left)
  {
    id: 'basketball_court_left', name: 'Basket Ball Court (Left)',
    pos: [-31, 0, -5], size: [14, 0.2, 10],
    color: '#1d4ed8', roofColor: '#1d4ed8',
    isCourt: true
  },
  // 23. Sitting Area
  {
    id: 'sitting_area', name: 'Sitting Area',
    pos: [-12, 0, 16.5], size: [12, 0.15, 10],
    color: '#475569', roofColor: '#374151',
    isSittingArea: true
  },
  // 24. Girls Hostel
  {
    id: 'girls_hostel', name: 'Girls Hostel',
    pos: [17, 0, 42.5], size: [14, 6, 10],
    color: '#7c3412', roofColor: '#4a1a08',
    windows: true, floors: 3
  }
]

/* ── Paths / Roads (Mapped around Central spine, left spine, right spine, and crossroads) ── */
const PATHS = [
  // Main vertical spine road (separates Central Block column and Right column)
  { pos: [4, 0.02, 0], size: [5, 0.04, 100] },
  // Left vertical spine road (between JC column and Parking/Hostels)
  { pos: [-22, 0.02, 0], size: [3, 0.04, 100] },
  // Right vertical spine road (east of Park Garden & Block 2)
  { pos: [29, 0.02, 0], size: [3, 0.04, 100] },
  // Horizontal crossroads connecting them
  { pos: [0, 0.02, -30], size: [80, 0.04, 3] }, // Upper crossroad
  { pos: [0, 0.02, 10],  size: [80, 0.04, 3] }, // Middle crossroad
  { pos: [0, 0.02, 36],  size: [80, 0.04, 3] }  // Lower crossroad
]

/* ── Grass lawns ── */
const GREEN_ZONES = [
  { pos: [20, 0.01, -38], size: [26, 0.02, 14] }, // Plants & trees area
  { pos: [20, 0.01, -2],  size: [16, 0.02, 16] }, // Park Garden
  { pos: [20, 0.01, 30],  size: [14, 0.02, 10] }, // Birds park
  { pos: [-22, 0.01, -44], size: [16, 0.02, 8] }   // Upper left corner garden
]

/* ── Street lamp layout ── */
const LAMP_POSITIONS = [
  [7, 0, -40], [7, 0, -20], [7, 0, 0], [7, 0, 20], [7, 0, 40],
  [-24, 0, -35], [-24, 0, -10], [-24, 0, 15], [-24, 0, 40],
  [31, 0, -35], [31, 0, -10], [31, 0, 15], [31, 0, 40]
]

/* ── Tree positions ── */
const TREE_POSITIONS = [
  [-18, 0, -45], [-12, 0, -45], [12, 0, -45], [18, 0, -45],
  [24, 0, -14], [24, 0, -8], [24, 0, 18], [24, 0, 24],
  [-32, 0, -8], [-32, 0, 0], [-32, 0, 8],
  [-4, 0, 24], [7, 0, 24], [-4, 0, 38], [7, 0, 38],
  [16, 0, 30], [20, 0, 30], [-16, 0, 30],
  [22, 0, -38], [24, 0, -36], [20, 0, -40] // Plants & trees cluster
]

/* ── Ground component with Click-to-Move handler ── */
function Ground({ onGroundClick }) {
  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      receiveShadow
      onPointerDown={onGroundClick}
    >
      <planeGeometry args={[120, 120]} />
      <meshStandardMaterial roughness={0.8} metalness={0.1} color="#94a3b8" />
    </mesh>
  )
}

/* ── Green lawn zone with Click-to-Move ── */
function GrassZone({ pos, size, onGroundClick }) {
  return (
    <mesh
      position={pos}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onPointerDown={onGroundClick}
    >
      <planeGeometry args={[size[0], size[1] || size[2]]} />
      <meshStandardMaterial roughness={0.9} color="#15803d" />
    </mesh>
  )
}

/* ── Concrete Road/Path with Click-to-Move ── */
function Path({ pos, size, onGroundClick }) {
  return (
    <mesh position={pos} receiveShadow onPointerDown={onGroundClick}>
      <boxGeometry args={size} />
      <meshStandardMaterial color="#475569" roughness={0.9} metalness={0.05} />
    </mesh>
  )
}

/* ── Low-poly Tree ── */
function Tree({ pos }) {
  const trunkH = 1.6 + Math.random() * 0.4
  const canopyR = 0.9 + Math.random() * 0.5
  return (
    <group position={pos}>
      {/* Trunk */}
      <mesh position={[0, trunkH / 2, 0]} castShadow>
        <cylinderGeometry args={[0.1, 0.16, trunkH, 7]} />
        <meshStandardMaterial color="#451a03" roughness={0.9} />
      </mesh>
      {/* Leaves canopy */}
      <mesh position={[0, trunkH + canopyR * 0.4, 0]} castShadow>
        <coneGeometry args={[canopyR, canopyR * 1.5, 7]} />
        <meshStandardMaterial color="#166534" roughness={0.85} />
      </mesh>
      <mesh position={[0, trunkH + canopyR * 0.9, 0]} castShadow>
        <coneGeometry args={[canopyR * 0.7, canopyR * 1.0, 6]} />
        <meshStandardMaterial color="#15803d" roughness={0.85} />
      </mesh>
    </group>
  )
}

/* ── Street Lamp ── */
function StreetLamp({ pos }) {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  return (
    <group position={pos}>
      {/* Post */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.08, 5, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Lamp Head arm */}
      <mesh position={[0.3, 4.8, 0]} rotation={[0, 0, -Math.PI / 6]}>
        <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.7} />
      </mesh>
      {/* Glow cap */}
      <mesh position={[0.65, 4.55, 0]}>
        <boxGeometry args={[0.25, 0.15, 0.2]} />
        <meshStandardMaterial
          color="#f8fafc"
          emissive="#fef08a"
          emissiveIntensity={nightFactor > 0.35 ? 3.0 : 0}
          roughness={0.2}
        />
      </mesh>
      {/* Light Source */}
      <pointLight
        position={[0.65, 4.3, 0]}
        intensity={nightFactor > 0.35 ? 4.5 * nightFactor : 0}
        distance={10}
        color="#fbbf24"
        castShadow={nightFactor > 0.5}
      />
    </group>
  )
}

/* ── Main Landmark Sign Board ── */
function CampusEntranceSign() {
  return (
    <group position={[0, 0, -42]}>
      <mesh position={[-2.5, 1.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[2.5, 1.5, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 3, 8]} />
        <meshStandardMaterial color="#334155" roughness={0.6} metalness={0.5} />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <boxGeometry args={[6, 1.0, 0.12]} />
        <meshStandardMaterial color="#1e293b" roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ── Dynamic building renderer ── */
function Building({ b, onGroundClick }) {
  const timeRemaining = useGameStore((s) => s.timeRemaining)
  const timerSeconds = useGameStore((s) => s.timerSeconds)
  const elapsed = Math.max(0, timerSeconds - timeRemaining)
  const nightFactor = Math.min(1.0, elapsed / 600)

  const [bw, bh, bd] = b.size
  const windowCols = Math.max(2, Math.floor(bw / 2.8))
  const windowRows = b.floors || Math.max(2, Math.floor(bh / 2.8))

  // 1. Basketball or Hockey Court
  if (b.isCourt || b.isHockeyCourt) {
    const linesColor = b.isHockeyCourt ? '#10b981' : '#3b82f6'
    return (
      <group position={b.pos}>
        {/* Surface */}
        <mesh position={[0, 0.1, 0]} receiveShadow onPointerDown={onGroundClick}>
          <boxGeometry args={[bw, 0.2, bd]} />
          <meshStandardMaterial color={b.color} roughness={0.5} />
        </mesh>
        {/* Outer border lines */}
        <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[bw - 0.4, bd - 0.4]} />
          <meshBasicMaterial color={linesColor} transparent opacity={0.4} />
        </mesh>
        {/* Court center line/ring */}
        <mesh position={[0, 0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.7, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      </group>
    )
  }

  // 2. Front or Back Gate Archway
  if (b.isGate) {
    return (
      <group position={b.pos}>
        {/* Left post */}
        <mesh position={[-4, bh / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, bh, bd]} />
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
        {/* Right post */}
        <mesh position={[4, bh / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[3, bh, bd]} />
          <meshStandardMaterial color={b.color} roughness={0.7} />
        </mesh>
        {/* Top arch beam */}
        <mesh position={[0, bh + 0.6, 0]} castShadow>
          <boxGeometry args={[14, 1.2, bd + 0.4]} />
          <meshStandardMaterial color="#451a03" roughness={0.6} />
        </mesh>
      </group>
    )
  }

  // 3. Central Block (Courtyard Structure)
  if (b.isCentral) {
    return (
      <group position={b.pos}>
        {/* Main base plate */}
        <mesh position={[0, 0.15, 0]} receiveShadow>
          <boxGeometry args={[bw + 0.6, 0.3, bd + 0.6]} />
          <meshStandardMaterial color="#334155" roughness={0.9} />
        </mesh>
        {/* Courtyard Floor */}
        <mesh position={[0, 0.21, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={onGroundClick}>
          <planeGeometry args={[bw - 5, bd - 5]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
        </mesh>
        {/* Courtyard center circle garden */}
        <mesh position={[0, 0.23, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[2.2, 32]} />
          <meshBasicMaterial color="#166534" />
        </mesh>
        <Tree pos={[0, 0.24, 0]} />

        {/* 4 surrounding building wings */}
        {/* North Wing */}
        <mesh position={[0, bh / 2, -bd / 2 + 1.2]} castShadow receiveShadow>
          <boxGeometry args={[bw, bh, 2.4]} />
          <meshStandardMaterial color={b.color} roughness={0.75} />
        </mesh>
        {/* South Wing */}
        <mesh position={[0, bh / 2, bd / 2 - 1.2]} castShadow receiveShadow>
          <boxGeometry args={[bw, bh, 2.4]} />
          <meshStandardMaterial color={b.color} roughness={0.75} />
        </mesh>
        {/* West Wing */}
        <mesh position={[-bw / 2 + 1.2, bh / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, bh, bd - 4.8]} />
          <meshStandardMaterial color={b.color} roughness={0.75} />
        </mesh>
        {/* East Wing */}
        <mesh position={[bw / 2 - 1.2, bh / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[2.4, bh, bd - 4.8]} />
          <meshStandardMaterial color={b.color} roughness={0.75} />
        </mesh>

        {/* Flat continuous roof beam */}
        <mesh position={[0, bh + 0.2, 0]}>
          <boxGeometry args={[bw + 0.2, 0.4, bd + 0.2]} />
          <meshStandardMaterial color={b.roofColor} roughness={0.8} />
        </mesh>
      </group>
    )
  }

  // 4. Park Garden (Interactive landscape circular design)
  if (b.isParkGarden) {
    return (
      <group position={b.pos}>
        {/* Lawn base */}
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onPointerDown={onGroundClick}>
          <circleGeometry args={[bw / 2, 32]} />
          <meshStandardMaterial color="#166534" roughness={0.9} />
        </mesh>
        {/* Radial paved walk paths */}
        {[0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4].map((rot, ri) => (
           <mesh key={ri} position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, rot]} receiveShadow onPointerDown={onGroundClick}>
             <planeGeometry args={[1.0, bw - 0.4]} />
             <meshStandardMaterial color="#cbd5e1" roughness={0.9} />
           </mesh>
        ))}
        {/* Water fountain pool */}
        <mesh position={[0, 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.5, 1.8, 24]} />
          <meshStandardMaterial color="#475569" roughness={0.6} />
        </mesh>
        <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.5, 24]} />
          <meshStandardMaterial color="#0284c7" roughness={0.15} metalness={0.9} />
        </mesh>
      </group>
    )
  }

  // 5. Sitting Area
  if (b.isSittingArea) {
    return (
      <group position={b.pos}>
        {/* Paved base */}
        <mesh position={[0, 0.06, 0]} receiveShadow onPointerDown={onGroundClick}>
          <boxGeometry args={[bw, 0.12, bd]} />
          <meshStandardMaterial color="#cbd5e1" roughness={0.95} />
        </mesh>
        {/* Benches */}
        {[
          { p: [-bw / 3.2, 0.22, -bd / 3.2], r: 0 },
          { p: [bw / 3.2, 0.22, -bd / 3.2], r: Math.PI / 2 },
          { p: [-bw / 3.2, 0.22, bd / 3.2], r: -Math.PI / 2 },
          { p: [bw / 3.2, 0.22, bd / 3.2], r: Math.PI }
        ].map((bench, bi) => (
          <group key={bi} position={bench.p} rotation={[0, bench.r, 0]}>
            <mesh castShadow>
              <boxGeometry args={[1.4, 0.2, 0.45]} />
              <meshStandardMaterial color="#78350f" roughness={0.9} />
            </mesh>
            <mesh position={[-0.5, -0.15, 0]}>
              <boxGeometry args={[0.12, 0.3, 0.4]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0.5, -0.15, 0]}>
              <boxGeometry args={[0.12, 0.3, 0.4]} />
              <meshStandardMaterial color="#334155" />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  // 6. Parking area with low-poly cars
  if (b.isParking) {
    return (
      <group position={b.pos}>
        {/* Asphalt base */}
        <mesh position={[0, 0.05, 0]} receiveShadow onPointerDown={onGroundClick}>
          <boxGeometry args={[bw, 0.1, bd]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Paving markings */}
        {Array.from({ length: 5 }).map((_, i) => {
          const pz = -bd / 2 + 5 + i * 4.2
          return (
            <mesh key={i} position={[0, 0.11, pz]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[bw - 1.5, 0.15]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.5} />
            </mesh>
          )
        })}
        {/* Cars */}
        {[
          { x: -bw / 4, z: -bd / 2 + 5, color: '#ef4444' },
          { x: bw / 4, z: -bd / 2 + 9.2, color: '#3b82f6' },
          { x: -bw / 4, z: -bd / 2 + 13.4, color: '#f59e0b' },
          { x: bw / 4, z: -bd / 2 + 17.6, color: '#10b981' }
        ].map((car, ci) => (
          <group key={ci} position={[car.x, 0.28, car.z]} rotation={[0, car.x > 0 ? Math.PI : 0, 0]}>
            <mesh castShadow>
              <boxGeometry args={[2.0, 0.55, 1.1]} />
              <meshStandardMaterial color={car.color} roughness={0.4} />
            </mesh>
            <mesh position={[-0.15, 0.45, 0]}>
              <boxGeometry args={[1.0, 0.38, 0.95]} />
              <meshStandardMaterial color="#0f172a" roughness={0.15} />
            </mesh>
          </group>
        ))}
      </group>
    )
  }

  // 7. General Building
  return (
    <group position={[b.pos[0], 0, b.pos[2]]}>
      {/* Plinth */}
      <mesh position={[0, 0.18, 0]} receiveShadow>
        <boxGeometry args={[bw + 0.5, 0.36, bd + 0.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {/* Building Body */}
      <mesh position={[0, bh / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[bw, bh, bd]} />
        <meshStandardMaterial color={b.color} roughness={0.7} metalness={0.1} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, bh + 0.15, 0]}>
        <boxGeometry args={[bw + 0.2, 0.3, bd + 0.2]} />
        <meshStandardMaterial color={b.roofColor} roughness={0.8} />
      </mesh>

      {/* Windows front and back */}
      {b.windows && Array.from({ length: windowRows }).map((_, r) =>
        Array.from({ length: windowCols }).map((_, c) => {
          const wx = -bw / 2 + 1.2 + c * ((bw - 2.4) / Math.max(windowCols - 1, 1))
          const wy = 1.0 + r * ((bh - 2.0) / Math.max(windowRows - 1, 1))
          return (
            <group key={`w-${r}-${c}`} position={[wx, wy, bd / 2 + 0.02]}>
              <mesh>
                <planeGeometry args={[0.7, 0.95]} />
                <meshStandardMaterial
                  color="#1e293b"
                  roughness={0.15}
                  metalness={0.9}
                  emissive="#fef08a"
                  emissiveIntensity={0.3}
                />
              </mesh>
            </group>
          )
        })
      )}
    </group>
  )
}

/* ── Skybox Night/Day Dome ── */
function SkyAtmosphere() {
  // Always day-time sky — no progressive darkening
  const skyColor = '#1e1b4b'
  const horizonColor = '#ea580c'

  return (
    <>
      <mesh>
        <sphereGeometry args={[95, 32, 32]} />
        <meshBasicMaterial color={skyColor} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, -2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[65, 95, 64]} />
        <meshBasicMaterial color={horizonColor} side={THREE.DoubleSide} transparent opacity={0.5} />
      </mesh>
    </>
  )
}

/* ── Stars System ── */
// Stars hidden in day mode
function Stars() {
  return null
}

/* ── Main map exporter ── */
export default function CampusMap() {
  // No day-night cycle — always full day lighting
  const setClickTarget = useGameStore((s) => s.setClickTarget)

  // Ground click catcher
  const handleGroundClick = (e) => {
    if (e.button === 0) {
      e.stopPropagation()
      setClickTarget([e.point.x, 0.5, e.point.z])
    }
  }

  // Static day-mode lighting — full brightness throughout game
  const ambientColor = '#ffedd5'
  const ambientIntensity = 0.60
  const mainLightColor = '#f97316'
  const mainLightIntensity = 1.3



  return (
    <group>
      <SkyAtmosphere />
      <Stars />

      <ambientLight intensity={ambientIntensity} color={ambientColor} />
      <directionalLight
        position={[35, 55, 25]}
        intensity={mainLightIntensity}
        color={mainLightColor}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-60}
        shadow-camera-right={60}
        shadow-camera-top={60}
        shadow-camera-bottom={-60}
        shadow-bias={-0.0006}
      />
      <directionalLight position={[-25, 35, -20]} intensity={0.28} color="#bae6fd" />

      {/* Main Ground */}
      <Ground onGroundClick={handleGroundClick} />

      {/* Grass zones */}
      {GREEN_ZONES.map((g, i) => (
        <GrassZone key={i} pos={g.pos} size={g.size} onGroundClick={handleGroundClick} />
      ))}

      {/* Concrete path networks */}
      {PATHS.map((p, i) => (
        <Path key={i} pos={p.pos} size={p.size} onGroundClick={handleGroundClick} />
      ))}

      {/* Buildings & interactive areas */}
      {CAMPUS_BUILDINGS.map((b) => (
        <Building key={b.id} b={b} onGroundClick={handleGroundClick} />
      ))}

      {/* Street Lamps */}
      {LAMP_POSITIONS.map((pos, i) => (
        <StreetLamp key={i} pos={pos} />
      ))}

      {/* Campus Trees */}
      {TREE_POSITIONS.map((pos, i) => (
        <Tree key={i} pos={pos} />
      ))}

      {/* Landmark entrance sign */}
      <CampusEntranceSign />

      {/* Outer boundary wall */}
      {[
        { pos: [0, 1.2, -51], size: [106, 2.4, 0.6] },
        { pos: [0, 1.2, 51],  size: [106, 2.4, 0.6] },
        { pos: [-53, 1.2, 0], size: [0.6, 2.4, 102] },
        { pos: [53, 1.2, 0],  size: [0.6, 2.4, 102] },
      ].map((w, i) => (
        <mesh key={`wall-${i}`} position={w.pos} castShadow>
          <boxGeometry args={w.size} />
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </mesh>
      ))}
    </group>
  )
}
